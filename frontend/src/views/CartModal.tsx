"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useUIStore } from "@/controllers/useUIStore";
import { useCartStore } from "@/controllers/useCartStore";
import * as promoService from "@/services/promoService";
import { formatCurrency } from "@/lib/currency";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function PromoCodeBox() {
  const promo = useCartStore((s) => s.promo);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const clearPromo = useCartStore((s) => s.clearPromo);
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const onApply = async () => {
    if (!code.trim()) return;
    setIsApplying(true);
    try {
      const result = await promoService.validatePromoCode(code.trim());
      applyPromo(result);
      toast.success(`Code "${result.code}" applied`);
      setCode("");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Invalid promo code"));
    } finally {
      setIsApplying(false);
    }
  };

  if (promo) {
    return (
      <div className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
        <span>
          Code <strong>{promo.code}</strong> applied
        </span>
        <button onClick={clearPromo} className="text-xs text-muted underline hover:text-red-600">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onApply();
          }
        }}
        placeholder="Promo code"
        className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm"
      />
      <button
        onClick={onApply}
        disabled={isApplying || !code.trim()}
        className="rounded border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-50"
      >
        {isApplying ? "..." : "Apply"}
      </button>
    </div>
  );
}

export function CartModal() {
  const isOpen = useUIStore((s) => s.isCartModalOpen);
  const closeCartModal = useUIStore((s) => s.closeCartModal);
  const { items, setQuantity, removeItem, totalPrice, discountAmount, grandTotal } = useCartStore();
  const discount = discountAmount();

  return (
    <Modal isOpen={isOpen} onClose={closeCartModal} title="Your cart" widthClassName="max-w-md">
      {items.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">Your cart is empty.</p>
      ) : (
        <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="w-16 h-16 relative rounded bg-background overflow-hidden shrink-0">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted">{formatCurrency(item.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="p-1 border border-border rounded hover:bg-background"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="p-1 border border-border rounded hover:bg-background"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.productId)}
                aria-label="Remove item"
                className="text-muted hover:text-red-600"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 border-t border-border pt-4 flex flex-col gap-3">
          <PromoCodeBox />

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(totalPrice())}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(grandTotal())}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            onClick={closeCartModal}
            className="w-full block text-center bg-primary text-primary-foreground rounded px-3 py-2 hover:bg-primary-hover"
          >
            Proceed to checkout
          </Link>
        </div>
      )}
    </Modal>
  );
}
