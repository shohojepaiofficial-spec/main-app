"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import * as promoService from "@/services/promoService";
import { PromoCode, Product } from "@/models";

const promoSchema = z
  .object({
    code: z.string().min(2, "Code is too short"),
    discountType: z.enum(["percentage", "flat"]),
    value: z.coerce.number().min(0, "Value can't be negative"),
    scope: z.enum(["all", "product"]),
    productId: z.string().optional(),
    isActive: z.boolean(),
    expiresAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.discountType === "percentage" && values.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "A percentage discount can't exceed 100",
      });
    }
    if (values.scope === "product" && !values.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productId"],
        message: "Pick a product",
      });
    }
  });

type PromoFormValues = z.infer<typeof promoSchema>;

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

interface PromoFormProps {
  editingPromo: PromoCode | null;
  products: Product[];
  onSaved: (promo: PromoCode) => void;
  onClose: () => void;
}

// Mounted fresh (via the `key` in PromoCodeFormModal below) each time the
// drawer opens or the target changes — same pattern as ProductForm/BannerForm.
function PromoForm({ editingPromo, products, onSaved, onClose }: PromoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: editingPromo
      ? {
          code: editingPromo.code,
          discountType: editingPromo.discountType,
          value: editingPromo.value,
          scope: editingPromo.scope,
          productId: editingPromo.productId,
          isActive: editingPromo.isActive,
          expiresAt: editingPromo.expiresAt ? editingPromo.expiresAt.slice(0, 10) : "",
        }
      : {
          code: "",
          discountType: "percentage",
          value: 10,
          scope: "all",
          productId: undefined,
          isActive: true,
          expiresAt: "",
        },
  });

  const scope = useWatch({ control, name: "scope" });

  const onSubmit = async (values: PromoFormValues) => {
    const input = {
      code: values.code,
      discountType: values.discountType,
      value: values.value,
      scope: values.scope,
      productId: values.scope === "product" ? values.productId : undefined,
      isActive: values.isActive,
      expiresAt: values.expiresAt || null,
    };

    try {
      const promo = editingPromo
        ? await promoService.updatePromoCode(editingPromo.id, input)
        : await promoService.createPromoCode(input);
      toast.success(editingPromo ? "Promo code updated" : "Promo code created");
      onSaved(promo);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save promo code"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">Code</label>
        <input
          {...register("code")}
          placeholder="e.g. SUMMER20"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1 uppercase"
        />
        {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Discount type</label>
          <select
            {...register("discountType")}
            className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat amount</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Value</label>
          <input
            {...register("value")}
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
          />
          {errors.value && <p className="text-red-600 text-sm mt-1">{errors.value.message}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Applies to</label>
        <select
          {...register("scope")}
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        >
          <option value="all">All products</option>
          <option value="product">One specific product</option>
        </select>
      </div>

      {scope === "product" && (
        <div>
          <label className="text-sm font-medium">Product</label>
          <select
            {...register("productId")}
            className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
          >
            <option value="">Select a product...</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
          {errors.productId && (
            <p className="text-red-600 text-sm mt-1">{errors.productId.message}</p>
          )}
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Expires (optional)</label>
        <input
          {...register("expiresAt")}
          type="date"
          className="w-full border border-border rounded px-3 py-2 bg-background mt-1"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register("isActive")} />
        Active
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground rounded px-3 py-2 font-normal hover:bg-primary-hover disabled:opacity-50 mt-2"
      >
        {isSubmitting ? "Saving..." : editingPromo ? "Save changes" : "Create promo code"}
      </button>
    </form>
  );
}

interface PromoCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPromo: PromoCode | null;
  products: Product[];
  onSaved: (promo: PromoCode) => void;
}

export function PromoCodeFormModal({
  isOpen,
  onClose,
  editingPromo,
  products,
  onSaved,
}: PromoCodeFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPromo ? "Edit promo code" : "Create promo code"}
      widthClassName="max-w-md"
    >
      {isOpen && (
        <PromoForm
          key={editingPromo?.id ?? "new"}
          editingPromo={editingPromo}
          products={products}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
