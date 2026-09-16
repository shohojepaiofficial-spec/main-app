"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { toUploadUrl } from "@/lib/api";
import * as bannerService from "@/services/bannerService";
import { ManagedBanner, PromoCode } from "@/models";

const ctaSchema = z.object({
  label: z.string().min(1, "Label is required"),
  href: z.string().min(1, "Link is required"),
});

const looseCtaSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const bannerSchema = z
  .object({
    title: z.string().min(2, "Title is too short"),
    subtitle: z.string().optional(),
    eyebrow: z.string().optional(),
    accentColor: z.string().min(1),
    isActive: z.boolean(),
    primaryCta: ctaSchema,
    promoCodeId: z.string().optional(),
    hasSecondaryCta: z.boolean(),
    // Unconstrained here on purpose — the fields default to "" and stay
    // that way whenever hasSecondaryCta is off, so requiring non-empty
    // values unconditionally (the original bug) blocked every submit.
    // Actually required only when hasSecondaryCta is checked, via the
    // superRefine below.
    secondaryCta: looseCtaSchema,
  })
  .superRefine((values, ctx) => {
    if (!values.hasSecondaryCta) return;
    if (!values.secondaryCta.label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryCta", "label"],
        message: "Label is required",
      });
    }
    if (!values.secondaryCta.href) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryCta", "href"],
        message: "Link is required",
      });
    }
  });

type BannerFormValues = z.infer<typeof bannerSchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

interface BannerFormProps {
  editingBanner: ManagedBanner | null;
  promoCodes: PromoCode[];
  onSaved: (banner: ManagedBanner) => void;
  onClose: () => void;
}

// Mounted fresh (via the `key` in BannerFormModal below) each time the
// drawer opens or the target banner changes — same rationale as
// ProductFormModal's ProductForm: no reset effect needed.
function BannerForm({ editingBanner, promoCodes, onSaved, onClose }: BannerFormProps) {
  const [image, setImage] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: editingBanner
      ? {
          title: editingBanner.title,
          subtitle: editingBanner.subtitle,
          eyebrow: editingBanner.eyebrow,
          accentColor: editingBanner.accentColor,
          isActive: editingBanner.isActive,
          primaryCta: editingBanner.primaryCta,
          promoCodeId: editingBanner.promoCodeId ?? "",
          hasSecondaryCta: !!editingBanner.secondaryCta,
          secondaryCta: editingBanner.secondaryCta ?? { label: "", href: "" },
        }
      : {
          title: "",
          subtitle: "",
          eyebrow: "",
          accentColor: "#38bdf8",
          isActive: true,
          primaryCta: { label: "", href: "" },
          promoCodeId: "",
          hasSecondaryCta: false,
          secondaryCta: { label: "", href: "" },
        },
  });

  const hasSecondaryCta = useWatch({ control, name: "hasSecondaryCta" });

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const onSubmit = async (values: BannerFormValues) => {
    if (!editingBanner && !image) {
      toast.error("An image is required");
      return;
    }

    const input = {
      title: values.title,
      subtitle: values.subtitle ?? "",
      eyebrow: values.eyebrow ?? "",
      accentColor: values.accentColor,
      isActive: values.isActive,
      primaryCta: values.primaryCta,
      secondaryCta: values.hasSecondaryCta ? values.secondaryCta : undefined,
      promoCodeId: values.promoCodeId || undefined,
    };

    try {
      const banner = editingBanner
        ? await bannerService.updateBanner(editingBanner.id, input, image ?? undefined)
        : await bannerService.createBanner(input, image as File);
      toast.success(editingBanner ? "Banner updated" : "Banner created");
      onSaved(banner);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save banner"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Eyebrow</label>
        <input
          {...register("eyebrow")}
          placeholder="e.g. Limited time"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          {...register("title")}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Subtitle</label>
        <textarea
          {...register("subtitle")}
          rows={2}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Accent color</label>
        <input
          {...register("accentColor")}
          type="color"
          className="mt-1 h-10 w-16 border border-border rounded bg-background"
        />
      </div>

      <fieldset className="border border-border rounded p-3">
        <legend className="text-sm font-medium px-1">Primary button</legend>
        <div className="flex flex-col gap-2">
          <input
            {...register("primaryCta.label")}
            placeholder="Label, e.g. Shop the Sale"
            className="w-full border border-border rounded px-3 py-2 bg-background"
          />
          <input
            {...register("primaryCta.href")}
            placeholder="Link, e.g. /shop"
            className="w-full border border-border rounded px-3 py-2 bg-background"
          />
        </div>
        {(errors.primaryCta?.label || errors.primaryCta?.href) && (
          <p className="text-red-600 text-sm mt-1">Label and link are both required</p>
        )}
      </fieldset>

      <fieldset className="border border-border rounded p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register("hasSecondaryCta")} />
          Add a second button
        </label>
        {hasSecondaryCta && (
          <div className="flex flex-col gap-2 mt-2">
            <input
              {...register("secondaryCta.label")}
              placeholder="Label, e.g. View Categories"
              className="w-full border border-border rounded px-3 py-2 bg-background"
            />
            <input
              {...register("secondaryCta.href")}
              placeholder="Link, e.g. /categories"
              className="w-full border border-border rounded px-3 py-2 bg-background"
            />
          </div>
        )}
        {hasSecondaryCta && (errors.secondaryCta?.label || errors.secondaryCta?.href) && (
          <p className="text-red-600 text-sm mt-1">Label and link are both required</p>
        )}
      </fieldset>

      <div>
        <label className="text-sm font-medium">Linked promo code (optional)</label>
        <select
          {...register("promoCodeId")}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        >
          <option value="">None</option>
          {promoCodes.map((promo) => (
            <option key={promo.id} value={promo.id}>
              {promo.code} ({promo.discountType === "percentage" ? `${promo.value}%` : promo.value}
              {promo.scope === "product" ? ` — ${promo.productName ?? "one product"}` : " — all products"})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1">
          Shows this code&apos;s discount right on the slide, and makes sure the button&apos;s link
          applies it — even if you didn&apos;t add <code>?promo=</code> to it yourself.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register("isActive")} />
        Published (visible on the homepage slider)
      </label>

      <div>
        <label className="text-sm font-medium">Image</label>
        <div className="mt-2">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="" className="h-28 w-full rounded object-cover border border-border" />
          ) : editingBanner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toUploadUrl(editingBanner.image)}
              alt=""
              className="h-28 w-full rounded object-cover border border-border"
            />
          ) : (
            <div className="h-28 w-full rounded border border-dashed border-border flex items-center justify-center text-xs text-muted">
              No image selected
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          className="mt-2 text-sm"
        />
        <p className="text-xs text-muted mt-1">Recommended: wide landscape image (1600×900 or larger).</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50 mt-2"
      >
        {isSubmitting ? "Saving..." : editingBanner ? "Save changes" : "Add banner"}
      </button>
    </form>
  );
}

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBanner: ManagedBanner | null;
  promoCodes: PromoCode[];
  onSaved: (banner: ManagedBanner) => void;
}

export function BannerFormModal({
  isOpen,
  onClose,
  editingBanner,
  promoCodes,
  onSaved,
}: BannerFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBanner ? "Edit banner" : "Add banner"}
      widthClassName="max-w-lg"
    >
      {isOpen && (
        <BannerForm
          key={editingBanner?.id ?? "new"}
          editingBanner={editingBanner}
          promoCodes={promoCodes}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
