"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Minus, Trash2, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ZilaUpazilaFields } from "@/views/ZilaUpazilaFields";
import { PaymentMethodPicker, PAYMENT_METHODS } from "@/views/PaymentMethodPicker";
import * as productService from "@/services/productService";
import * as orderService from "@/services/orderService";
import { formatCurrency } from "@/lib/currency";
import { BANGLADESH_ZILAS } from "@/lib/bangladeshGeo";
import { Product } from "@/models";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// Every method shown as selectable, unlike checkout's picker — an admin
// entering a phone order is just recording how the customer actually paid
// (possibly outside the site, e.g. a bKash transfer to the shop's own
// number), not triggering a live charge, so there's nothing to lock.
const ADMIN_PAYMENT_METHODS = PAYMENT_METHODS.map((m) => ({ ...m, available: true }));

interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
}

function ProductPicker({ onAdd }: { onAdd: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    let ignore = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      productService
        .getProducts({ search: query, limit: 6 })
        .then((data) => {
          if (!ignore) setResults(data.items);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setIsSearching(false);
        });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
        <Search size={14} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setResults([]);
          }}
          placeholder="Search products to add..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      {query.trim() && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
          {isSearching ? (
            <p className="p-3 text-xs text-muted">Searching...</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-muted">No products found</p>
          ) : (
            results.map((product) => (
              <button
                key={product._id}
                type="button"
                onClick={() => {
                  onAdd(product);
                  setQuery("");
                  setResults([]);
                }}
                disabled={product.stock === 0}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {formatCurrency(product.price)} &middot;{" "}
                  {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const manualOrderSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  phone: z.string().min(6, "Enter a valid phone number"),
  zila: z.string().min(1, "Pick a Zila"),
  upazila: z.string().min(1, "Pick an Upazila"),
  addressLine: z.string().min(5, "Address is too short"),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "card"]),
  promoCode: z.string().optional(),
});
type ManualOrderValues = z.infer<typeof manualOrderSchema>;

interface AdminOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// A phone/walk-in order the shop owner enters on a customer's behalf —
// same price/stock authority as the real checkout (see server's
// adminCreateOrder), just without requiring the customer to have an account.
export function AdminOrderFormModal({ isOpen, onClose, onCreated }: AdminOrderFormModalProps) {
  const [items, setItems] = useState<OrderLineItem[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualOrderValues>({
    resolver: zodResolver(manualOrderSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      zila: "",
      upazila: "",
      addressLine: "",
      paymentMethod: "cod",
      promoCode: "",
    },
  });

  const zila = useWatch({ control, name: "zila" });
  const upazila = useWatch({ control, name: "upazila" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  useEffect(() => {
    if (!zila || !upazila) return;
    const valid = BANGLADESH_ZILAS.find((z) => z.zila === zila)?.upazilas.includes(upazila);
    if (!valid) setValue("upazila", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zila]);

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("No more stock available");
          return prev;
        }
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: product._id, name: product.name, price: product.price, stock: product.stock, quantity: 1 },
      ];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(i.stock, Math.max(1, i.quantity + delta)) }
          : i
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const closeAndReset = () => {
    reset();
    setItems([]);
    onClose();
  };

  const onSubmit = async (values: ManualOrderValues) => {
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    try {
      await orderService.adminCreateOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: {
          fullName: values.fullName,
          phone: values.phone,
          zila: values.zila,
          upazila: values.upazila,
          addressLine: values.addressLine,
        },
        paymentMethod: values.paymentMethod,
        promoCode: values.promoCode?.trim() || undefined,
      });
      toast.success("Order created");
      onCreated();
      closeAndReset();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to create order"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeAndReset} title="New order" widthClassName="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Products</label>
          <div className="mt-1">
            <ProductPicker onAdd={addItem} />
          </div>
          {items.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-2 rounded border border-border p-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, -1)}
                      className="rounded border border-border p-1 hover:bg-background"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, 1)}
                      className="rounded border border-border p-1 hover:bg-background"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="w-20 shrink-0 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.name}`}
                    className="shrink-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-medium">
                <span>Items total</span>
                <span>{formatCurrency(itemsTotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Customer name</label>
            <input
              {...register("fullName")}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              {...register("phone")}
              type="tel"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>
        </div>

        <ZilaUpazilaFields
          zilaRegister={register("zila")}
          upazilaRegister={register("upazila")}
          selectedZila={zila}
          zilaError={errors.zila?.message}
          upazilaError={errors.upazila?.message}
        />

        <div>
          <label className="text-sm font-medium">House / Road / Area</label>
          <textarea
            {...register("addressLine")}
            rows={2}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
          {errors.addressLine && (
            <p className="mt-1 text-sm text-red-600">{errors.addressLine.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Promo code (optional)</label>
          <input
            {...register("promoCode")}
            placeholder="e.g. SAVE10"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 uppercase"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Payment method</label>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={(method) => setValue("paymentMethod", method)}
            methods={ADMIN_PAYMENT_METHODS}
          />
          <p className="mt-1 text-xs text-muted">
            Anything other than Cash on Delivery just records how the customer actually paid —
            nothing is charged automatically.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create order"}
        </button>
      </form>
    </Modal>
  );
}
