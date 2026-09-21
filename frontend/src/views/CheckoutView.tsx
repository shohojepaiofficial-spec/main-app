"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Share2, Copy, CheckCircle2, Package, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/controllers/useCartStore";
import { useAuthController } from "@/controllers/useAuthController";
import { useAuthStore } from "@/controllers/useAuthStore";
import * as orderService from "@/services/orderService";
import * as sharedCartService from "@/services/sharedCartService";
import * as authService from "@/services/authService";
import { formatCurrency } from "@/lib/currency";
import { calculateDeliveryTotal, isInsideStoreCity } from "@/lib/delivery";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { BANGLADESH_ZILAS } from "@/lib/bangladeshGeo";
import { ZilaUpazilaFields } from "@/views/ZilaUpazilaFields";
import { PaymentMethodPicker } from "@/views/PaymentMethodPicker";
import { ShareLinkModal } from "@/views/ShareLinkModal";
import { Order } from "@/models";
import { useTranslations } from "@/controllers/useTranslations";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// "Ask someone else to pay" — snapshots the current cart into a shareable
// link. Doesn't touch or clear the buyer's own cart; whoever opens the link
// completes their own checkout with these items (see app/(public)/pay/[id]).
function AskSomeoneElseToPay() {
  const items = useCartStore((s) => s.items);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { t } = useTranslations();

  const onCreate = async () => {
    if (items.length === 0) {
      toast.error(t("cart.empty", "Your cart is empty."));
      return;
    }
    setIsCreating(true);
    try {
      const id = await sharedCartService.createSharedCart(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );
      setShareUrl(`${SITE_URL}/pay/${id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, t("checkout.failedToCreateLink", "Failed to create link")));
    } finally {
      setIsCreating(false);
    }
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("checkout.linkCopied", "Link copied"));
    } catch {
      toast.error(t("checkout.copyManually", "Couldn't copy — copy it manually"));
    }
  };

  return (
    <div className="mb-6 rounded-md border border-dashed border-border p-4">
      <div className="flex items-start gap-3">
        <Share2 size={18} className="mt-0.5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {t("checkout.askSomeoneElseTitle", "Want someone else to pay for this?")}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t(
              "checkout.askSomeoneElseSubtitle",
              "Share a link to this cart — whoever opens it can check out and pay for it themselves."
            )}
          </p>

          {shareUrl ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
              />
              <button
                onClick={onCopy}
                className="flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
              >
                <Copy size={12} /> {t("common.copy", "Copy")}
              </button>
              <button
                onClick={() => setIsShareOpen(true)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
              >
                <Share2 size={12} /> {t("common.share", "Share")}
              </button>
              <ShareLinkModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                url={shareUrl}
                text={t("checkout.pleasePayFor", "Please pay for my order on {siteName}:", {
                  siteName: SITE_NAME,
                })}
              />
            </div>
          ) : (
            <button
              onClick={onCreate}
              disabled={isCreating}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-50"
            >
              {isCreating
                ? t("checkout.creatingLink", "Creating link...")
                : t("checkout.createShareableLink", "Create shareable link")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderPlaced({ order }: { order: Order }) {
  const { t } = useTranslations();
  return (
    <main className="mx-auto max-w-lg p-6 pb-16 text-center">
      <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
      <h1 className="mb-1 text-xl font-semibold">{t("checkout.orderPlaced", "Order placed!")}</h1>
      <p className="mb-6 text-sm text-muted">
        {t("checkout.orderSummaryLine", "Order #{id} — {amount}{suffix}", {
          id: order._id.slice(-6).toUpperCase(),
          amount: formatCurrency(order.totalAmount),
          suffix:
            order.paymentMethod === "cod"
              ? t("checkout.paidOnDelivery", ", paid on delivery.")
              : ".",
        })}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/orders"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Package size={16} /> {t("checkout.viewYourOrders", "View your orders")}
        </Link>
        <Link
          href="/shop"
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          <ShoppingBag size={16} /> {t("checkout.continueShopping", "Continue shopping")}
        </Link>
      </div>
    </main>
  );
}

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  phone: z.string().min(6, "Enter a valid phone number"),
  zila: z.string().min(1, "Pick a Zila"),
  upazila: z.string().min(1, "Pick an Upazila"),
  addressLine: z.string().min(5, "Address is too short"),
  paymentMethod: z.enum(["cod", "bkash"]),
});
type CheckoutValues = z.infer<typeof checkoutSchema>;

// A saved location only counts as usable once all three fields are present —
// a half-filled one (shouldn't happen via Settings' own validation, but
// cheap to guard) would otherwise offer a "saved address" option with
// nothing real behind it.
function hasSavedDeliveryLocation(user: ReturnType<typeof useAuthController>["user"]) {
  return !!(
    user?.deliveryLocation?.zila &&
    user?.deliveryLocation?.upazila &&
    user?.deliveryLocation?.addressLine
  );
}

export function CheckoutView({ storeCity }: { storeCity: string }) {
  const { user } = useAuthController();
  const { t } = useTranslations();
  const { items, promo, totalPrice, discountAmount, clear } = useCartStore();
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  // "saved" shows the account's stored phone/address (read-only) and skips
  // re-saving it; "new" opens blank, editable fields with an option to save
  // them as the new default for next time. See ARCHITECTURE.md's "Checkout
  // & Orders" section.
  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    hasSavedDeliveryLocation(user) ? "saved" : "new"
  );
  const [saveForNextTime, setSaveForNextTime] = useState(true);
  // Opt-in only, never on by default — see ARCHITECTURE.md's "Marketing
  // campaigns" section. Only offered when not already opted in.
  const [smsOptIn, setSmsOptIn] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.name ?? "",
      phone: hasSavedDeliveryLocation(user) ? user?.phone ?? "" : "",
      zila: user?.deliveryLocation?.zila ?? "",
      upazila: user?.deliveryLocation?.upazila ?? "",
      addressLine: user?.deliveryLocation?.addressLine ?? "",
      paymentMethod: "cod",
    },
  });

  // The page stays mounted while an unauthenticated visitor logs in through
  // the modal (see app/(protected)/layout.tsx), so `defaultValues` above
  // (captured once, before `user` existed) never gets a chance to fill in —
  // re-fill from the account the moment it appears.
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (!prevUserRef.current && user) {
      const hasSaved = hasSavedDeliveryLocation(user);
      reset({
        fullName: user.name ?? "",
        phone: hasSaved ? user.phone ?? "" : "",
        zila: hasSaved ? user.deliveryLocation!.zila : "",
        upazila: hasSaved ? user.deliveryLocation!.upazila : "",
        addressLine: hasSaved ? user.deliveryLocation!.addressLine : "",
      });
      setAddressMode(hasSaved ? "saved" : "new");
    }
    prevUserRef.current = user;
  }, [user, reset]);

  const zila = useWatch({ control, name: "zila" });
  const upazila = useWatch({ control, name: "upazila" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  // Switching between the two radio options — re-mounts the relevant field
  // values rather than just toggling `disabled`, so "new" always starts from
  // a clean slate instead of the previously-saved values.
  const useSavedAddress = () => {
    if (!user) return;
    reset({
      fullName: user.name ?? "",
      phone: user.phone ?? "",
      zila: user.deliveryLocation?.zila ?? "",
      upazila: user.deliveryLocation?.upazila ?? "",
      addressLine: user.deliveryLocation?.addressLine ?? "",
      paymentMethod,
    });
    setAddressMode("saved");
  };

  const useNewAddress = () => {
    reset({
      fullName: user?.name ?? "",
      phone: "",
      zila: "",
      upazila: "",
      addressLine: "",
      paymentMethod,
    });
    setSaveForNextTime(true);
    setAddressMode("new");
  };

  useEffect(() => {
    if (!zila || !upazila) return;
    const valid = BANGLADESH_ZILAS.find((z) => z.zila === zila)?.upazilas.includes(upazila);
    if (!valid) setValue("upazila", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zila]);

  const itemsTotal = totalPrice();
  const discount = discountAmount();
  const deliveryFee = calculateDeliveryTotal(items, zila, storeCity);
  const grandTotal = Math.max(0, itemsTotal + deliveryFee - discount);

  const onSubmit = async (values: CheckoutValues) => {
    const { paymentMethod: method, ...shippingAddress } = values;
    try {
      const order = await orderService.createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress,
        promoCode: promo?.code,
        paymentMethod: method,
      });

      if (order.bkashRedirectUrl) {
        // Payment isn't confirmed yet — don't clear the cart or show
        // "Order placed" until bKash actually redirects back with a result
        // (see app/(protected)/checkout/bkash-result). A failed/cancelled
        // payment cancels this order and restores its stock server-side, so
        // leaving the cart untouched here means there's still something to
        // check out with either way.
        window.location.href = order.bkashRedirectUrl;
        return;
      }

      clear();
      setPlacedOrder(order);

      // Fire-and-forget, same convention as the app's other non-critical
      // side effects (analytics, emails) — the order already succeeded, so a
      // failure here shouldn't surface as a checkout error. Only runs when
      // the customer typed a genuinely new address and opted to keep it;
      // "saved" mode reuses what's already on the account, nothing to write.
      if (user && addressMode === "new" && saveForNextTime) {
        authService
          .updateProfile({ name: user.name, phone: values.phone })
          .then(() =>
            authService.updateDeliveryLocation({
              zila: values.zila,
              upazila: values.upazila,
              addressLine: values.addressLine,
            })
          )
          .then((updatedUser) => useAuthStore.getState().updateUser(updatedUser))
          .catch((err) => console.error("Failed to save delivery details for next time:", err));
      }

      if (user && smsOptIn && !user.marketingOptIn?.sms) {
        authService
          .updateMarketingOptIn({ sms: true })
          .then((updatedUser) => useAuthStore.getState().updateUser(updatedUser))
          .catch((err) => console.error("Failed to save SMS opt-in:", err));
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, t("checkout.failedToPlaceOrder", "Failed to place order")));
    }
  };

  if (placedOrder) return <OrderPlaced order={placedOrder} />;

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-lg p-6 pb-16 text-center">
        <ShoppingBag size={32} className="mx-auto mb-3 text-muted" />
        <h1 className="mb-1 text-xl font-semibold">{t("checkout.emptyCartTitle", "Your cart is empty")}</h1>
        <p className="mb-4 text-sm text-muted">
          {t("checkout.emptyCartSubtitle", "Add something to your cart before checking out.")}
        </p>
        <Link href="/shop" className="text-sm font-medium text-primary underline">
          {t("checkout.browseTheShop", "Browse the shop")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 pb-16">
      <h1 className="mb-1 text-xl font-semibold">{t("checkout.title", "Checkout")}</h1>
      <p className="mb-6 text-sm text-muted">
        {t("checkout.subtitle", "Choose how you'd like to pay below.")}
      </p>

      <AskSomeoneElseToPay />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 lg:col-span-2"
          id="checkout-form"
        >
          <h2 className="text-sm font-semibold">{t("checkout.deliveryDetails", "Delivery details")}</h2>

          {hasSavedDeliveryLocation(user) && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-sm">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  className="mt-0.5"
                  checked={addressMode === "saved"}
                  onChange={useSavedAddress}
                />
                <span>
                  <span className="font-medium">
                    {t("checkout.useSavedDetails", "Use my saved delivery details")}
                  </span>
                  <span className="block text-xs text-muted">
                    {user!.deliveryLocation!.addressLine}, {user!.deliveryLocation!.upazila},{" "}
                    {user!.deliveryLocation!.zila} &middot; {user!.phone}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={addressMode === "new"}
                  onChange={useNewAddress}
                />
                <span className="font-medium">{t("checkout.deliverToNewAddress", "Deliver to a new address")}</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t("checkout.fullName", "Full name")}</label>
              <input
                {...register("fullName")}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t("checkout.phone", "Phone")}</label>
              <input
                {...register("phone")}
                type="tel"
                disabled={addressMode === "saved"}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 disabled:opacity-50"
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
            disabled={addressMode === "saved"}
          />

          <div>
            <label className="text-sm font-medium">{t("checkout.houseRoadArea", "House / Road / Area")}</label>
            <textarea
              {...register("addressLine")}
              rows={2}
              disabled={addressMode === "saved"}
              placeholder={t("checkout.houseRoadAreaPlaceholder", "House no., road, area...")}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 disabled:opacity-50"
            />
            {errors.addressLine && (
              <p className="mt-1 text-sm text-red-600">{errors.addressLine.message}</p>
            )}
          </div>

          {zila && (
            <p className="text-xs text-muted">
              {t("checkout.deliveryRatesApply", "{zone} delivery rates apply.", {
                zone: isInsideStoreCity(zila, storeCity)
                  ? t("checkout.insideCity", "Inside {city}", { city: storeCity })
                  : t("checkout.outsideCity", "Outside {city}", { city: storeCity }),
              })}
            </p>
          )}

          {addressMode === "new" && user && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={saveForNextTime}
                onChange={(e) => setSaveForNextTime(e.target.checked)}
              />
              {t("checkout.saveForNextTime", "Save this phone number and address for next time")}
            </label>
          )}

          {user && !user.marketingOptIn?.sms && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
              />
              {t("checkout.smsOptIn", "Send me SMS about offers and promotions")}
            </label>
          )}

          <h2 className="mt-2 text-sm font-semibold">{t("checkout.paymentMethod", "Payment method")}</h2>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={(method) => setValue("paymentMethod", method)}
          />
        </form>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">{t("checkout.orderSummary", "Order summary")}</h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-background">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted">
                      {t("checkout.qty", "Qty {n}", { n: item.quantity })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>{t("cart.items", "Items")}</span>
                <span>{formatCurrency(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{t("checkout.delivery", "Delivery")}</span>
                <span>{zila ? formatCurrency(deliveryFee) : t("checkout.selectAZila", "Select a Zila")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>
                    {promo
                      ? t("checkout.discountWithCode", "Discount ({code})", { code: promo.code })
                      : t("cart.discount", "Discount")}
                  </span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span>{t("cart.total", "Total")}</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting
              ? t("checkout.placingOrder", "Placing order...")
              : t("checkout.placeOrder", "Place order ({method})", {
                  method:
                    paymentMethod === "cod"
                      ? t("checkout.cashOnDelivery", "Cash on Delivery")
                      : "bKash",
                })}
          </button>
        </div>
      </div>
    </main>
  );
}
