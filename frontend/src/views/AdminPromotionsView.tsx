"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Plus, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminPromoCodes } from "@/controllers/useAdminPromoCodes";
import { PromoCodeFormModal } from "@/views/PromoCodeFormModal";
import { formatCurrency } from "@/lib/currency";
import { SITE_URL } from "@/lib/seo";
import { confirmDialog } from "@/lib/confirm";
import { PromoCode } from "@/models";

function shareLinkFor(promo: PromoCode) {
  const path = promo.scope === "product" && promo.productId ? `/shop/${promo.productId}` : "/shop";
  return `${SITE_URL}${path}?promo=${encodeURIComponent(promo.code)}`;
}

// Module-level snapshot rather than calling Date.now() during render (the
// React Compiler flags that as impure) — evaluated once when this client
// module loads, which is plenty fresh for an admin status label.
const NOW = Date.now();

export function AdminPromotionsView() {
  const { isChecking, isAllowed } = useRequirePermission("promotions:manage");
  const { promoCodes, products, isLoading, deletingId, upsert, remove } = useAdminPromoCodes();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openAddForm = () => {
    setEditingPromo(null);
    setIsFormOpen(true);
  };

  const openEditForm = (promo: PromoCode) => {
    setEditingPromo(promo);
    setIsFormOpen(true);
  };

  const onDelete = async (promo: PromoCode) => {
    const confirmed = await confirmDialog(`Delete promo code "${promo.code}"? This can't be undone.`, {
      title: "Delete promo code",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(promo.id);
  };

  const copyShareLink = async (promo: PromoCode) => {
    try {
      await navigator.clipboard.writeText(shareLinkFor(promo));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Promo codes</h1>
          <p className="text-sm text-muted max-w-xl">
            Create a code, then either let customers type it in at checkout, or copy its share
            link and send it (or put it behind a banner button) — visiting that link applies the
            discount automatically.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover shrink-0"
        >
          <Plus size={16} /> Create code
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading promo codes...</p>
      ) : promoCodes.length === 0 ? (
        <p className="text-sm text-muted">No promo codes yet — create your first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-border bg-background text-xs uppercase text-muted">
                <th className="py-2 pl-4 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Discount</th>
                <th className="py-2 pr-4 font-medium">Applies to</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pl-4 pr-4 align-top text-sm font-medium">{promo.code}</td>
                  <td className="py-3 pr-4 align-top text-sm">
                    {promo.discountType === "percentage"
                      ? `${promo.value}%`
                      : formatCurrency(promo.value)}
                  </td>
                  <td className="py-3 pr-4 align-top text-sm text-muted">
                    {promo.scope === "all" ? "All products" : promo.productName ?? "One product"}
                  </td>
                  <td className="py-3 pr-4 align-top text-sm">
                    {!promo.isActive ? (
                      <span className="text-muted">Inactive</span>
                    ) : promo.expiresAt && new Date(promo.expiresAt).getTime() < NOW ? (
                      <span className="text-red-600">Expired</span>
                    ) : (
                      <span className="text-green-700">Active</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyShareLink(promo)}
                        aria-label={`Copy share link for ${promo.code}`}
                        className="text-muted hover:text-foreground"
                        title="Copy share link"
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button
                        onClick={() => openEditForm(promo)}
                        aria-label={`Edit ${promo.code}`}
                        className="text-muted hover:text-foreground"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(promo)}
                        disabled={deletingId === promo.id}
                        aria-label={`Delete ${promo.code}`}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === promo.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PromoCodeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingPromo={editingPromo}
        products={products}
        onSaved={upsert}
      />
    </main>
  );
}
