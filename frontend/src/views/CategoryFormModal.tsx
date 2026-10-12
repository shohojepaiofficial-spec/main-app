"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IMAGE_ACCEPT, imageUploadError } from "@/lib/imageUpload";
import { Modal } from "@/components/ui/Modal";
import { toUploadUrl } from "@/lib/api";
import * as categoryService from "@/services/categoryService";
import { ManagedCategory } from "@/models";

// Same limits as the server's categoryController#parseNames.
const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60, "Name is too long"),
  nameBn: z.string().trim().max(60, "Bangla name is too long"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

interface CategoryFormProps {
  editingCategory: ManagedCategory | null;
  onSaved: (category: ManagedCategory) => void;
  onClose: () => void;
}

// Mounted fresh (via the `key` in CategoryFormModal below) each time the
// drawer opens or the target category changes — same as BannerFormModal.
function CategoryForm({ editingCategory, onSaved, onClose }: CategoryFormProps) {
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: editingCategory?.name ?? "", nameBn: editingCategory?.nameBn ?? "" },
  });

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const currentImage = !removeImage && editingCategory?.image ? toUploadUrl(editingCategory.image) : null;
  const shownImage = imagePreview ?? currentImage;

  const onSubmit = async (values: CategoryFormValues) => {
    const input = { name: values.name, nameBn: values.nameBn, removeImage: removeImage && !image };
    try {
      const category = editingCategory
        ? await categoryService.updateCategory(editingCategory.id, input, image ?? undefined)
        : await categoryService.createCategory(input, image ?? undefined);
      toast.success(editingCategory ? "Category updated" : "Category added");
      onSaved(category);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save category"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label htmlFor="category-name" className="text-sm font-medium">Name</label>
        <input
          id="category-name"
          {...register("name")}
          placeholder="e.g. Footwear"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
        {editingCategory && editingCategory.productCount > 0 && (
          <p className="text-xs text-muted mt-1">
            Renaming also renames it on the {editingCategory.productCount} product
            {editingCategory.productCount === 1 ? "" : "s"} in this category.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="category-name-bn" className="text-sm font-medium">Bangla name (optional)</label>
        <input
          id="category-name-bn"
          {...register("nameBn")}
          placeholder="e.g. জুতা"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.nameBn && <p className="text-red-600 text-sm mt-1">{errors.nameBn.message}</p>}
        <p className="text-xs text-muted mt-1">Shown on the category tile when the shopper picks Bangla.</p>
      </div>

      <div>
        <label htmlFor="category-image" className="text-sm font-medium">Photo (optional)</label>
        <div className="mt-2">
          {shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownImage} alt="" className="h-28 w-full rounded object-cover border border-border" />
          ) : (
            <div className="h-28 w-full rounded border border-dashed border-border flex items-center justify-center text-xs text-muted">
              No photo — the tile shows an icon instead
            </div>
          )}
        </div>
        <input
          id="category-image"
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            const error = file && imageUploadError(file);
            if (error) {
              toast.error(error);
              e.target.value = "";
              return;
            }
            setImage(file);
            if (file) setRemoveImage(false);
          }}
          className="mt-2 text-sm"
        />
        {currentImage && !image && (
          <button type="button" onClick={() => setRemoveImage(true)} className="mt-2 block text-sm text-red-600 hover:text-red-700">
            Remove photo
          </button>
        )}
        <p className="text-xs text-muted mt-1">Recommended: a landscape photo, about 4:3 (e.g. 800×600 or larger).</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50 mt-2"
      >
        {isSubmitting ? "Saving..." : editingCategory ? "Save changes" : "Add category"}
      </button>
    </form>
  );
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: ManagedCategory | null;
  onSaved: (category: ManagedCategory) => void;
}

export function CategoryFormModal({ isOpen, onClose, editingCategory, onSaved }: CategoryFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? "Edit category" : "Add category"}
      widthClassName="max-w-lg"
    >
      {isOpen && (
        <CategoryForm
          key={editingCategory?.id ?? "new"}
          editingCategory={editingCategory}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
