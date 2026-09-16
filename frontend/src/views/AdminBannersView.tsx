"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Plus, ArrowUp, ArrowDown, EyeOff, Tag } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminBanners } from "@/controllers/useAdminBanners";
import { BannerFormModal } from "@/views/BannerFormModal";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { ManagedBanner } from "@/models";

export function AdminBannersView() {
  const { isChecking, isAllowed } = useRequirePermission("banners:manage");
  const { banners, promoCodes, isLoading, pendingId, upsert, remove, move } = useAdminBanners();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<ManagedBanner | null>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openAddForm = () => {
    setEditingBanner(null);
    setIsFormOpen(true);
  };

  const openEditForm = (banner: ManagedBanner) => {
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const onDelete = async (banner: ManagedBanner) => {
    const confirmed = await confirmDialog(`Delete the "${banner.title}" banner? This can't be undone.`, {
      title: "Delete banner",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(banner.id);
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Manage banners</h1>
          <p className="text-sm text-muted">
            Control the slides on the homepage hero. Order top-to-bottom is the slide order.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover"
        >
          <Plus size={16} /> Add banner
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading banners...</p>
      ) : banners.length === 0 ? (
        <p className="text-sm text-muted">No banners yet — add your first slide.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {banners.map((banner, index) => (
            <li
              key={banner.id}
              className="flex items-center gap-4 rounded-md border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(banner.id, "up")}
                  disabled={index === 0 || pendingId === banner.id}
                  aria-label="Move up"
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => move(banner.id, "down")}
                  disabled={index === banners.length - 1 || pendingId === banner.id}
                  aria-label="Move down"
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toUploadUrl(banner.image)}
                alt=""
                className="h-14 w-24 shrink-0 rounded object-cover border border-border"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{banner.title}</p>
                  {!banner.isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] uppercase text-muted">
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                  {banner.promoCodeId &&
                    (() => {
                      const linked = promoCodes.find((p) => p.id === banner.promoCodeId);
                      return linked ? (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Tag size={10} /> {linked.code}
                        </span>
                      ) : null;
                    })()}
                </div>
                <p className="text-xs text-muted truncate">{banner.primaryCta.label} &rarr; {banner.primaryCta.href}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openEditForm(banner)}
                  aria-label={`Edit ${banner.title}`}
                  className="text-muted hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onDelete(banner)}
                  disabled={pendingId === banner.id}
                  aria-label={`Delete ${banner.title}`}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {pendingId === banner.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BannerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingBanner={editingBanner}
        promoCodes={promoCodes}
        onSaved={upsert}
      />
    </main>
  );
}
