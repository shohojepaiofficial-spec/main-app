"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import * as productService from "@/services/productService";
import * as promoService from "@/services/promoService";
import * as adService from "@/services/adService";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatPromoDiscount } from "@/lib/promo";
import { SITE_URL } from "@/lib/seo";
import { AdPlatform, AdSourceType, AppliedPromo, Product } from "@/models";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const SOURCE_OPTIONS: { value: AdSourceType; label: string }[] = [
  { value: "product", label: "A product" },
  { value: "promotion", label: "A promo code" },
  { value: "custom", label: "Custom / event" },
];

const PLATFORM_OPTIONS: { value: AdPlatform; label: string; note?: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram", note: "Requires an image" },
  { value: "x", label: "X (Twitter)" },
];

function ProductPicker({
  selected,
  onSelect,
}: {
  selected: Product | null;
  onSelect: (product: Product | null) => void;
}) {
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

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded border border-border bg-background p-2">
        <div className="flex items-center gap-2 text-sm">
          {selected.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toUploadUrl(selected.images[0])}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="truncate">{selected.name}</span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

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
          placeholder="Search products..."
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
                  onSelect(product);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-background"
              >
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatCurrency(product.price)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface AdminAdFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AdminAdFormModal({ isOpen, onClose, onCreated }: AdminAdFormModalProps) {
  const [sourceType, setSourceType] = useState<AdSourceType>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activePromos, setActivePromos] = useState<AppliedPromo[]>([]);
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<AdPlatform[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    promoService
      .getActivePromoCodes()
      .then((data) => {
        if (!ignore) setActivePromos(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const selectedPromo = useMemo(
    () => activePromos.find((p) => p.code === selectedPromoCode) ?? null,
    [activePromos, selectedPromoCode]
  );

  // Auto-generate a starting title/caption/link from whatever's picked —
  // the admin can freely edit any of it afterwards.
  const onSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (!product) return;
    setTitle(product.name);
    setCaption(
      `${product.name} — now ${formatCurrency(product.price)}! Shop now while stocks last.`
    );
    setLink(`${SITE_URL}/shop/${product._id}`);
  };

  const onSelectPromo = (code: string) => {
    setSelectedPromoCode(code);
    const promo = activePromos.find((p) => p.code === code);
    if (!promo) return;
    setTitle(`${promo.code} — ${formatPromoDiscount(promo)}`);
    setCaption(
      `Use code ${promo.code} for ${formatPromoDiscount(promo)}! Limited time only — shop now.`
    );
    setLink(
      promo.scope === "product" && promo.productId
        ? `${SITE_URL}/shop/${promo.productId}?promo=${promo.code}`
        : `${SITE_URL}/shop?promo=${promo.code}`
    );
  };

  const togglePlatform = (platform: AdPlatform) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const resetAndClose = () => {
    setSourceType("product");
    setSelectedProduct(null);
    setSelectedPromoCode("");
    setTitle("");
    setCaption("");
    setLink("");
    setImageFile(null);
    setPlatforms([]);
    onClose();
  };

  const hasImage = !!imageFile || (sourceType === "product" && !!selectedProduct?.images[0]);

  const onSubmit = async () => {
    if (!title.trim() || !caption.trim()) {
      toast.error("Title and caption are required");
      return;
    }
    if (sourceType === "product" && !selectedProduct) {
      toast.error("Pick a product");
      return;
    }
    if (sourceType === "promotion" && !selectedPromo) {
      toast.error("Pick a promo code");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    if (platforms.includes("instagram") && !hasImage) {
      toast.error("Instagram posts require an image — upload one or pick a product that has one");
      return;
    }

    setIsSubmitting(true);
    try {
      await adService.createAd({
        title: title.trim(),
        sourceType,
        productId: sourceType === "product" ? selectedProduct?._id : undefined,
        promoCode: sourceType === "promotion" ? selectedPromo?.code : undefined,
        caption: caption.trim(),
        link: link.trim() || undefined,
        platforms,
        image: imageFile,
      });
      toast.success("Ad created");
      onCreated();
      resetAndClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to create ad"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="New ad" widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium">Based on</label>
          <div className="mt-1 flex gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSourceType(opt.value);
                  setSelectedProduct(null);
                  setSelectedPromoCode("");
                }}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium ${
                  sourceType === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {sourceType === "product" && (
          <div>
            <label className="text-sm font-medium">Product</label>
            <div className="mt-1">
              <ProductPicker selected={selectedProduct} onSelect={onSelectProduct} />
            </div>
          </div>
        )}

        {sourceType === "promotion" && (
          <div>
            <label className="text-sm font-medium">Promo code</label>
            {activePromos.length === 0 ? (
              <p className="mt-1 text-xs text-muted">No active promo codes right now.</p>
            ) : (
              <select
                value={selectedPromoCode}
                onChange={(e) => onSelectPromo(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a promo code</option>
                {activePromos.map((promo) => (
                  <option key={promo.code} value={promo.code}>
                    {promo.code} — {formatPromoDiscount(promo)}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-muted">
              An image is pulled automatically from the promoted product, if it has one — upload
              one below to use something else.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Internal title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="For your own reference — not shown in the post"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Image</label>
          {sourceType === "product" && selectedProduct?.images[0] && !imageFile && (
            <p className="mt-1 text-xs text-muted">
              Using this product&apos;s photo — upload one below to use something else instead.
            </p>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Post to</label>
          <div className="mt-1 flex flex-col gap-1">
            {PLATFORM_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={platforms.includes(opt.value)}
                  onChange={() => togglePlatform(opt.value)}
                />
                {opt.label}
                {opt.note && <span className="text-xs text-muted">({opt.note})</span>}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save ad"}
        </button>
      </div>
    </Modal>
  );
}
