"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IMAGE_ACCEPT, imageUploadError } from "@/lib/imageUpload";
import { toUploadUrl } from "@/lib/api";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminPopup } from "@/controllers/useAdminPopup";
import { SitePopupSettings } from "@/models";
import { PopupInput } from "@/services/popupService";

// Same rule the server enforces (bannerController#isSafeBannerHref).
const LINK_RULE = "Use a page on this site (starting with /) or an https:// address";
const isSafeHref = (href: string) => {
  const value = href.trim();
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const popupSchema = z
  .object({
    isActive: z.boolean(),
    title: z.string().max(120, "At most 120 characters"),
    message: z.string().max(1000, "At most 1000 characters"),
    buttonLabel: z.string().max(80, "At most 80 characters"),
    buttonHref: z.string(),
  })
  .superRefine((values, ctx) => {
    const hasLabel = !!values.buttonLabel.trim();
    const hasHref = !!values.buttonHref.trim();
    if (hasLabel && !hasHref) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["buttonHref"], message: "Link is required" });
    if (hasHref && !hasLabel) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["buttonLabel"], message: "Label is required" });
    if (hasHref && !isSafeHref(values.buttonHref)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["buttonHref"], message: LINK_RULE });
  });

type PopupFormValues = z.infer<typeof popupSchema>;

interface PopupFormProps {
  settings: SitePopupSettings;
  onSave: (input: PopupInput, image?: File) => Promise<boolean>;
}

function PopupForm({ settings, onSave }: PopupFormProps) {
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PopupFormValues>({
    resolver: zodResolver(popupSchema),
    defaultValues: {
      isActive: settings.isActive,
      title: settings.title,
      message: settings.message,
      buttonLabel: settings.button?.label ?? "",
      buttonHref: settings.button?.href ?? "",
    },
  });

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);
  const shownImage = imagePreview ?? (settings.image && !removeImage ? toUploadUrl(settings.image) : null);

  const onSubmit = async (values: PopupFormValues) => {
    const saved = await onSave({ ...values, removeImage }, image ?? undefined);
    if (saved) {
      setImage(null);
      setRemoveImage(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register("isActive")} />
        Show the popup to visitors
      </label>

      <div>
        <label className="text-sm font-medium" htmlFor="popup-title">Title</label>
        <input id="popup-title" {...register("title")} placeholder="e.g. Eid sale is live!" className="w-full border border-border rounded px-3 py-2 bg-background mt-1" />
        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="popup-message">Message</label>
        <textarea id="popup-message" {...register("message")} rows={4} className="w-full border border-border rounded px-3 py-2 bg-background mt-1" />
        {errors.message && <p className="text-red-600 text-sm mt-1">{errors.message.message}</p>}
      </div>

      <div>
        <span className="text-sm font-medium">Image (optional)</span>
        <div className="mt-2">
          {shownImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownImage} alt="" className="h-40 w-full rounded object-cover border border-border" />
          ) : (
            <div className="h-40 w-full rounded border border-dashed border-border flex items-center justify-center text-xs text-muted">
              No image
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
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
            className="text-sm"
          />
          {settings.image && !image && !removeImage && (
            <button type="button" onClick={() => setRemoveImage(true)} className="text-sm text-red-600 hover:underline">
              Remove image
            </button>
          )}
        </div>
        <p className="text-xs text-muted mt-1">Shown across the top of the popup, up to 448px wide. A landscape photo (e.g. 1200×800) works best.</p>
      </div>

      <fieldset className="border border-border rounded p-3">
        <legend className="text-sm font-medium px-1">Button (optional)</legend>
        <div className="flex flex-col gap-2">
          <input {...register("buttonLabel")} placeholder="Label, e.g. Shop now" className="w-full border border-border rounded px-3 py-2 bg-background" />
          {errors.buttonLabel && <p className="text-red-600 text-sm">{errors.buttonLabel.message}</p>}
          <input {...register("buttonHref")} placeholder="Link, e.g. /shop" className="w-full border border-border rounded px-3 py-2 bg-background" />
          {errors.buttonHref && <p className="text-red-600 text-sm">{errors.buttonHref.message}</p>}
        </div>
      </fieldset>

      <p className="text-xs text-muted">
        Visitors who close the popup won&apos;t see it again until you change its content. Changes show on the site within about a minute.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save popup"}
      </button>
    </form>
  );
}

export function AdminPopupView() {
  const { isChecking, isAllowed } = useRequirePermission("banners:manage");
  const { settings, isLoading, save } = useAdminPopup();

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Site popup</h1>
          <p className="text-sm text-muted">
            A message that pops up for shoppers on the store pages.
          </p>
        </div>
        {settings && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              settings.isActive ? "bg-primary/10 text-primary" : "bg-border text-muted"
            }`}
          >
            {settings.isActive ? "Live" : "Off"}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading popup...</p>
      ) : settings ? (
        <div className="max-w-2xl rounded-md border border-border bg-surface p-4">
          <PopupForm key={settings.version} settings={settings} onSave={save} />
        </div>
      ) : (
        <p className="text-sm text-muted">Couldn&apos;t load the popup settings.</p>
      )}
    </main>
  );
}
