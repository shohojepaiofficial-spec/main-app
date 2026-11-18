"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { IMAGE_ACCEPT, MAX_IMAGE_FILES, splitValidImages } from "@/lib/imageUpload";
import { Modal } from "@/components/ui/Modal";
import { toUploadUrl } from "@/lib/api";
import * as storeLocationService from "@/services/storeLocationService";
import { StoreLocation } from "@/models";

// Same limits as the server's storeLocationController#parseFields.
const locationSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100, "Name is too long"),
  address: z.string().trim().min(5, "Address is too short").max(300, "Address is too long"),
  phone: z.string().trim().max(20, "Phone number is too long"),
  mapUrl: z.union([
    z.literal(""),
    z.string().trim().url("Must be a valid URL").startsWith("https://", "Map link must start with https://"),
  ]),
});

type LocationFormValues = z.infer<typeof locationSchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

interface StoreLocationFormProps {
  editingLocation: StoreLocation | null;
  onSaved: (location: StoreLocation) => void;
  onClose: () => void;
}

// Mounted fresh (via the `key` in StoreLocationFormModal below) each time
// the drawer opens or the target location changes — same as CategoryForm.
function StoreLocationForm({ editingLocation, onSaved, onClose }: StoreLocationFormProps) {
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: editingLocation?.name ?? "",
      address: editingLocation?.address ?? "",
      phone: editingLocation?.phone ?? "",
      mapUrl: editingLocation?.mapUrl ?? "",
    },
  });

  const keptImages = (editingLocation?.images ?? []).filter((url) => !removedImages.includes(url));
  const roomLeft = Math.max(0, MAX_IMAGE_FILES - keptImages.length - newImages.length);

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { valid, errors: fileErrors } = splitValidImages(Array.from(files));
    fileErrors.forEach((e) => toast.error(e));
    if (valid.length > roomLeft) toast.error(`You can only add ${roomLeft} more image${roomLeft === 1 ? "" : "s"}`);
    setNewImages((prev) => [...prev, ...valid.slice(0, roomLeft)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: LocationFormValues) => {
    const input = { ...values, removeImages: removedImages };
    try {
      const location = editingLocation
        ? await storeLocationService.updateStoreLocation(editingLocation.id, input, newImages)
        : await storeLocationService.createStoreLocation(input, newImages);
      toast.success(editingLocation ? "Store location updated" : "Store location added");
      onSaved(location);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save store location"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label htmlFor="location-name" className="text-sm font-medium">Name</label>
        <input
          id="location-name"
          {...register("name")}
          placeholder="e.g. Gulshan Branch"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="location-address" className="text-sm font-medium">Address</label>
        <textarea
          id="location-address"
          {...register("address")}
          placeholder="House, road, area, city"
          rows={2}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>}
      </div>

      <div>
        <label htmlFor="location-phone" className="text-sm font-medium">Phone (optional)</label>
        <input
          id="location-phone"
          {...register("phone")}
          placeholder="01XXXXXXXXX"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="location-map" className="text-sm font-medium">Google Maps link (optional)</label>
        <input
          id="location-map"
          {...register("mapUrl")}
          placeholder="https://maps.google.com/..."
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.mapUrl && <p className="text-red-600 text-sm mt-1">{errors.mapUrl.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Photos (optional, up to {MAX_IMAGE_FILES})</label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {keptImages.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toUploadUrl(url)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setRemovedImages((prev) => [...prev, url])}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {newImages.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setNewImages((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {roomLeft > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded border border-dashed border-border text-xs text-muted hover:text-foreground"
            >
              + Add
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => onFilesPicked(e.target.files)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50 mt-2"
      >
        {isSubmitting ? "Saving..." : editingLocation ? "Save changes" : "Add store location"}
      </button>
    </form>
  );
}

interface StoreLocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLocation: StoreLocation | null;
  onSaved: (location: StoreLocation) => void;
}

export function StoreLocationFormModal({ isOpen, onClose, editingLocation, onSaved }: StoreLocationFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLocation ? "Edit store location" : "Add store location"}
      widthClassName="max-w-lg"
    >
      {isOpen && (
        <StoreLocationForm
          key={editingLocation?.id ?? "new"}
          editingLocation={editingLocation}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
