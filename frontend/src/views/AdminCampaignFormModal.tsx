"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import * as productService from "@/services/productService";
import * as promoService from "@/services/promoService";
import * as campaignService from "@/services/campaignService";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatPromoDiscount } from "@/lib/promo";
import { SITE_URL } from "@/lib/seo";
import { confirmDialog } from "@/lib/confirm";
import { CampaignAudiencePreview, CampaignChannel, CampaignSourceType, AppliedPromo, Product } from "@/models";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const SOURCE_OPTIONS: { value: CampaignSourceType; label: string }[] = [
  { value: "product", label: "A product" },
  { value: "promotion", label: "A promo code" },
  { value: "custom", label: "Custom / event" },
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

const CHANNEL_OPTIONS: { value: CampaignChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

interface AdminCampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AdminCampaignFormModal({ isOpen, onClose, onCreated }: AdminCampaignFormModalProps) {
  const [sourceType, setSourceType] = useState<CampaignSourceType>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activePromos, setActivePromos] = useState<AppliedPromo[]>([]);
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
  const [title, setTitle] = useState("");
  const [channels, setChannels] = useState<CampaignChannel[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [audience, setAudience] = useState<CampaignAudiencePreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    Promise.all([promoService.getActivePromoCodes(), campaignService.getAudiencePreview()])
      .then(([promos, preview]) => {
        if (ignore) return;
        setActivePromos(promos);
        setAudience(preview);
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

  const onSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (!product) return;
    setTitle(product.name);
    const link = `${SITE_URL}/shop/${product._id}`;
    setEmailSubject(`${product.name} is now ${formatCurrency(product.price)}`);
    setEmailBody(
      `<p>Hi,</p><p>${product.name} is available now for ${formatCurrency(product.price)}.</p><p><a href="${link}">Shop now</a></p>`
    );
    setSmsMessage(`${product.name} — now ${formatCurrency(product.price)}! Shop now: ${link}`);
  };

  const onSelectPromo = (code: string) => {
    setSelectedPromoCode(code);
    const promo = activePromos.find((p) => p.code === code);
    if (!promo) return;
    const link =
      promo.scope === "product" && promo.productId
        ? `${SITE_URL}/shop/${promo.productId}?promo=${promo.code}`
        : `${SITE_URL}/shop?promo=${promo.code}`;
    setTitle(`${promo.code} — ${formatPromoDiscount(promo)}`);
    setEmailSubject(`${formatPromoDiscount(promo)} with code ${promo.code}`);
    setEmailBody(
      `<p>Hi,</p><p>Use code <strong>${promo.code}</strong> for ${formatPromoDiscount(promo)}! Limited time only.</p><p><a href="${link}">Shop now</a></p>`
    );
    setSmsMessage(`Use code ${promo.code} for ${formatPromoDiscount(promo)}! Shop now: ${link}`);
  };

  const toggleChannel = (channel: CampaignChannel) => {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  };

  const resetAndClose = () => {
    setSourceType("product");
    setSelectedProduct(null);
    setSelectedPromoCode("");
    setTitle("");
    setChannels([]);
    setEmailSubject("");
    setEmailBody("");
    setSmsMessage("");
    onClose();
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
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
    if (channels.length === 0) {
      toast.error("Pick at least one channel");
      return;
    }
    if (channels.includes("email") && (!emailSubject.trim() || !emailBody.trim())) {
      toast.error("Email subject and body are required");
      return;
    }
    if (channels.includes("sms") && !smsMessage.trim()) {
      toast.error("SMS message is required");
      return;
    }

    const recipientCount =
      (channels.includes("email") ? (audience?.emailCount ?? 0) : 0) +
      (channels.includes("sms") ? (audience?.smsCount ?? 0) : 0);
    const confirmed = await confirmDialog(
      `Send this to roughly ${recipientCount} opted-in recipient${recipientCount === 1 ? "" : "s"} now? This can't be undone.`,
      { title: "Send campaign", confirmLabel: "Send now" }
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const created = await campaignService.createCampaign({
        title: title.trim(),
        sourceType,
        productId: sourceType === "product" ? selectedProduct?._id : undefined,
        promoCode: sourceType === "promotion" ? selectedPromo?.code : undefined,
        channels,
        emailSubject: channels.includes("email") ? emailSubject.trim() : undefined,
        emailBody: channels.includes("email") ? emailBody.trim() : undefined,
        smsMessage: channels.includes("sms") ? smsMessage.trim() : undefined,
      });
      toast.success(
        `Sent — ${created.stats.sentCount} delivered, ${created.stats.failedCount} failed out of ${created.stats.recipientCount}`
      );
      onCreated();
      resetAndClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to send campaign"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="New campaign" widthClassName="max-w-lg">
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
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Internal title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="For your own reference — not shown to recipients"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Send via</label>
          <div className="mt-1 flex flex-col gap-1">
            {CHANNEL_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channels.includes(opt.value)}
                  onChange={() => toggleChannel(opt.value)}
                />
                {opt.label}
                {audience && (
                  <span className="text-xs text-muted">
                    ({opt.value === "email" ? audience.emailCount : audience.smsCount} opted in
                    {opt.value === "sms" && !audience.smsConfigured ? " — SMS not connected yet" : ""})
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {channels.includes("email") && (
          <>
            <div>
              <label className="text-sm font-medium">Email subject</label>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email body (HTML)</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
          </>
        )}

        {channels.includes("sms") && (
          <div>
            <label className="text-sm font-medium">SMS message</label>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={3}
              maxLength={480}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">{smsMessage.length} characters</p>
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send campaign"}
        </button>
      </div>
    </Modal>
  );
}
