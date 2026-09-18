"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toUploadUrl } from "@/lib/api";
import * as productService from "@/services/productService";
import { Product } from "@/models";

const productSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().min(10, "Description is too short"),
  price: z.coerce.number().min(0, "Price can't be negative"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock can't be negative"),
  category: z.string().min(2, "Category is required"),
  deliveryFeeInsideCity: z.coerce.number().min(0, "Delivery fee can't be negative"),
  deliveryFeeOutsideCity: z.coerce.number().min(0, "Delivery fee can't be negative"),
  isFeatured: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const MAX_IMAGES = 5;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

interface ProductFormProps {
  editingProduct: Product | null;
  categories: string[];
  onSaved: (product: Product) => void;
  onClose: () => void;
}

// Mounted fresh (via the `key` in ProductFormModal below) every time the
// drawer opens or the target product changes, so all its state — the form
// values and the image lists — starts from the right place with no reset
// effect needed.
function ProductForm({ editingProduct, categories, onSaved, onClose }: ProductFormProps) {
  const [existingImages, setExistingImages] = useState<string[]>(editingProduct?.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: editingProduct
      ? {
          name: editingProduct.name,
          description: editingProduct.description,
          price: editingProduct.price,
          stock: editingProduct.stock,
          category: editingProduct.category,
          deliveryFeeInsideCity: editingProduct.deliveryFeeInsideCity,
          deliveryFeeOutsideCity: editingProduct.deliveryFeeOutsideCity,
          isFeatured: editingProduct.isFeatured,
        }
      : {
          name: "",
          description: "",
          price: 0,
          stock: 0,
          category: "",
          deliveryFeeInsideCity: 0,
          deliveryFeeOutsideCity: 0,
          isFeatured: false,
        },
  });

  const newImagePreviews = useMemo(
    () => newImages.map((file) => URL.createObjectURL(file)),
    [newImages]
  );
  useEffect(() => {
    return () => newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [newImagePreviews]);

  const totalImages = existingImages.length + newImages.length;

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return;
    // Read the FileList into a plain array right away: the caller resets
    // the <input>'s value immediately after calling this (see below), which
    // clears this same live FileList — reading it lazily inside the
    // setNewImages updater (React defers that callback until after this
    // event handler returns) used to see an already-emptied FileList and
    // silently drop every selected file.
    const selected = Array.from(files);
    setNewImages((prev) => [...prev, ...selected].slice(0, MAX_IMAGES - existingImages.length));
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const product = editingProduct
        ? await productService.updateProduct(editingProduct._id, {
            ...values,
            newImages,
            existingImages,
          })
        : await productService.createProduct({ ...values, newImages });
      toast.success(editingProduct ? "Product updated" : "Product created");
      onSaved(product);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save product"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Name</label>
        <input
          {...register("name")}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          {...register("description")}
          rows={4}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.description && (
          <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Price</label>
          <input
            {...register("price")}
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
          />
          {errors.price && <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Stock</label>
          <input
            {...register("stock")}
            type="number"
            min="0"
            className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
          />
          {errors.stock && <p className="text-red-600 text-sm mt-1">{errors.stock.message}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Delivery fee</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <input
              {...register("deliveryFeeInsideCity")}
              type="number"
              step="0.01"
              min="0"
              placeholder="Inside city"
              className="w-full border border-border rounded px-3 py-2 bg-background"
            />
            <p className="text-xs text-muted mt-1">Inside city</p>
            {errors.deliveryFeeInsideCity && (
              <p className="text-red-600 text-sm mt-1">{errors.deliveryFeeInsideCity.message}</p>
            )}
          </div>
          <div>
            <input
              {...register("deliveryFeeOutsideCity")}
              type="number"
              step="0.01"
              min="0"
              placeholder="Outside city"
              className="w-full border border-border rounded px-3 py-2 bg-background"
            />
            <p className="text-xs text-muted mt-1">Outside city</p>
            {errors.deliveryFeeOutsideCity && (
              <p className="text-red-600 text-sm mt-1">{errors.deliveryFeeOutsideCity.message}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-1">
          Flat fees you set yourself for shipping this item — not calculated from any courier&apos;s rates.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <input
          {...register("category")}
          list="product-categories"
          placeholder="e.g. Footwear"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        <datalist id="product-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errors.category && (
          <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register("isFeatured")} />
        Feature on homepage
      </label>

      <div>
        <label className="text-sm font-medium">Images</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {existingImages.map((src) => (
            <div
              key={src}
              className="relative w-16 h-16 rounded overflow-hidden border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toUploadUrl(src)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setExistingImages((prev) => prev.filter((s) => s !== src))}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {newImagePreviews.map((src, i) => (
            <div
              key={src}
              className="relative w-16 h-16 rounded overflow-hidden border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={totalImages >= MAX_IMAGES}
          onChange={(e) => {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }}
          className="mt-2 text-sm disabled:opacity-50"
        />
        <p className="text-xs text-muted mt-1">Up to {MAX_IMAGES} images total.</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50 mt-2"
      >
        {isSubmitting ? "Saving..." : editingProduct ? "Save changes" : "Add product"}
      </button>
    </form>
  );
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: string[];
  onSaved: (product: Product) => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  editingProduct,
  categories,
  onSaved,
}: ProductFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? "Edit product" : "Add product"}
      widthClassName="max-w-lg"
    >
      {isOpen && (
        <ProductForm
          key={editingProduct?._id ?? "new"}
          editingProduct={editingProduct}
          categories={categories}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
