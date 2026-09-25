"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { Plus, Trash2, Send, RotateCw, CheckCircle2, XCircle, Loader2, Link2Off } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminAds } from "@/controllers/useAdminAds";
import { AdminAdFormModal } from "@/views/AdminAdFormModal";
import * as productService from "@/services/productService";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { Ad, AdPlatform, AdPlatformStatus, Product } from "@/models";

const SOURCE_LABEL: Record<Ad["sourceType"], string> = {
  product: "Product",
  promotion: "Promotion",
  custom: "Custom",
};

const PLATFORM_LABEL: Record<AdPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
};

function StatusPill({ status }: { status: AdPlatformStatus }) {
  const config: Record<AdPlatformStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800", Icon: Loader2 },
    posted: { label: "Posted", className: "bg-green-100 text-green-800", Icon: CheckCircle2 },
    failed: { label: "Failed", className: "bg-red-100 text-red-800", Icon: XCircle },
    not_connected: { label: "Not connected", className: "bg-background text-muted ring-1 ring-border", Icon: Link2Off },
  };
  const { label, className, Icon } = config[status];
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${className}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

function AdRow({
  ad,
  isPublishing,
  isDeleting,
  onPublish,
  onDelete,
}: {
  ad: Ad;
  isPublishing: boolean;
  isDeleting: boolean;
  onPublish: (platforms?: AdPlatform[]) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-background">
          {ad.image && <Image src={toUploadUrl(ad.image)} alt={ad.title} fill className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            {ad.title}
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">
              {SOURCE_LABEL[ad.sourceType]}
            </span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{ad.caption}</p>
          <p className="mt-1 text-[11px] text-muted">{format(new Date(ad.createdAt), "PPP p")}</p>
        </div>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Delete ${ad.title}`}
          className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        {ad.platforms.map((platform) => {
          const result = ad.results.find((r) => r.platform === platform);
          const status = result?.status ?? "pending";
          return (
            <div key={platform} className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{PLATFORM_LABEL[platform]}</span>
              <StatusPill status={status} />
              <button
                onClick={() => onPublish([platform])}
                disabled={isPublishing}
                title={status === "posted" ? "Post again" : "Post now"}
                className="text-muted hover:text-primary disabled:opacity-50"
              >
                {status === "posted" ? <RotateCw size={13} /> : <Send size={13} />}
              </button>
            </div>
          );
        })}
        <button
          onClick={() => onPublish()}
          disabled={isPublishing}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-50"
        >
          {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Post to all
        </button>
      </div>
    </div>
  );
}

export function AdminAdsView() {
  const { isChecking, isAllowed } = useRequirePermission("ads:manage");
  const { ads, isLoading, publishingId, deletingId, publish, remove, reload } = useAdminAds();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialProduct, setInitialProduct] = useState<Product | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");

  // Manage Products' "Create ad" shortcut links here as
  // `/admin/ads?productId=<id>` — resolve it to a real product, open the
  // form pre-filled and ready to post, then drop the query param so a
  // refresh (or clicking "New ad" afterwards) doesn't keep reopening it.
  useEffect(() => {
    if (!productId) return;
    let ignore = false;
    productService
      .getProductById(productId)
      .then((product) => {
        if (ignore) return;
        if (product) {
          setInitialProduct(product);
          setIsFormOpen(true);
        }
      })
      .finally(() => {
        if (!ignore) router.replace("/admin/ads");
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openBlankForm = () => {
    setInitialProduct(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setInitialProduct(null);
  };

  const onDelete = async (ad: Ad) => {
    const confirmed = await confirmDialog(`Delete "${ad.title}"? This can't be undone.`, {
      title: "Delete ad",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(ad._id);
  };

  return (
    <main className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Social media ads</h1>
          <p className="text-sm text-muted">
            Generate an ad from a product, promo, or a custom event, and post it straight to
            Facebook, Instagram, or X.
          </p>
        </div>
        <button
          onClick={openBlankForm}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus size={16} /> New ad
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading ads...</p>
      ) : ads.length === 0 ? (
        <p className="text-sm text-muted">No ads yet — create your first one.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {ads.map((ad) => (
            <AdRow
              key={ad._id}
              ad={ad}
              isPublishing={publishingId === ad._id}
              isDeleting={deletingId === ad._id}
              onPublish={(platforms) => publish(ad._id, platforms)}
              onDelete={() => onDelete(ad)}
            />
          ))}
        </div>
      )}

      <AdminAdFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        onCreated={reload}
        initialProduct={initialProduct}
      />
    </main>
  );
}
