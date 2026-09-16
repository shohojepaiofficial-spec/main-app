"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Package,
  Settings as SettingsIcon,
  ArrowRight,
  MapPin,
  Pencil,
  Star,
  Heart,
  Tag,
  RotateCw,
} from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import { useMyOrders } from "@/controllers/useMyOrders";
import { useCartStore } from "@/controllers/useCartStore";
import { useWishlistStore } from "@/controllers/useWishlistStore";
import * as orderService from "@/services/orderService";
import * as wishlistService from "@/services/wishlistService";
import * as promoService from "@/services/promoService";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatPromoDiscount } from "@/lib/promo";
import { STORE_CITY } from "@/lib/seo";
import { isInsideStoreCity } from "@/lib/delivery";
import { AppliedPromo, Order, OrderStatus, Product, ProductSummary } from "@/models";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// A live sitewide promo, if there is one — same idea as the homepage's
// PromoAnnouncementBar, but this is prime placement for a returning,
// signed-in customer specifically.
function PromoReminder() {
  const [promo, setPromo] = useState<AppliedPromo | null>(null);

  useEffect(() => {
    let ignore = false;
    promoService
      .getActivePromoCodes()
      .then((promos) => {
        if (!ignore) setPromo(promos.find((p) => p.scope === "all") ?? null);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  if (!promo) return null;

  return (
    <Link
      href={`/shop?promo=${encodeURIComponent(promo.code)}`}
      className="mb-6 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary hover:underline"
    >
      <Tag size={16} className="shrink-0" />
      {formatPromoDiscount(promo)} storewide with code <strong>{promo.code}</strong> — Shop now
    </Link>
  );
}

// Delivered orders' products this account hasn't reviewed yet — nudges
// toward the review system that otherwise has no natural prompt anywhere.
function ReviewPrompts() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    orderService
      .getReviewableProducts()
      .then((data) => {
        if (!ignore) setProducts(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading || products.length === 0) return null;

  return (
    <div className="mb-8 rounded-md border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">Leave a review</h2>
      <div className="flex flex-col gap-2">
        {products.map((product) => (
          <div key={product._id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-background">
                {product.images[0] && (
                  <Image
                    src={toUploadUrl(product.images[0])}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <p className="truncate text-sm">{product.name}</p>
            </div>
            <Link
              href={`/shop/${product._id}#reviews`}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Star size={12} /> Write a review
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// Wishlist, shown as small cards. Removing here also updates the shared
// useWishlistStore so the heart icon on that product's card/page elsewhere
// reflects it immediately, not just this list.
function SavedItems() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let ignore = false;
    wishlistService
      .getWishlist()
      .then((data) => {
        if (!ignore) setProducts(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const onRemove = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p._id !== productId));
    try {
      await toggleWishlist(productId);
    } catch {
      toast.error("Failed to remove item");
    }
  };

  // Adds every saved item to the cart, then removes it from the wishlist —
  // a genuine "move," not a copy, so a repeat visit doesn't re-offer items
  // already sitting in the cart. Skips whatever fails to add (shouldn't
  // normally happen — these are all real products the wishlist just fetched)
  // rather than leaving the cart/wishlist in a half-moved, inconsistent state.
  const onMoveAllToCart = async () => {
    setIsMoving(true);
    try {
      for (const product of products) {
        addItem({
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.images[0] ? toUploadUrl(product.images[0]) : undefined,
          deliveryFeeInsideCity: product.deliveryFeeInsideCity,
          deliveryFeeOutsideCity: product.deliveryFeeOutsideCity,
        });
        await toggleWishlist(product._id);
      }
      setProducts([]);
      toast.success("Moved everything to your cart");
    } catch {
      toast.error("Some items couldn't be moved — the rest were added");
    } finally {
      setIsMoving(false);
    }
  };

  if (isLoading || products.length === 0) return null;

  return (
    <div className="mb-8 rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Saved items</h2>
        <button
          onClick={onMoveAllToCart}
          disabled={isMoving}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {isMoving ? "Moving..." : "Move all to cart"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((product) => (
          <div key={product._id} className="group relative">
            <Link href={`/shop/${product._id}`} className="block">
              <div className="relative aspect-square overflow-hidden rounded bg-background">
                {product.images[0] && (
                  <Image
                    src={toUploadUrl(product.images[0])}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <p className="mt-1 truncate text-xs">{product.name}</p>
              <p className="text-xs font-medium">{formatCurrency(product.price)}</p>
            </Link>
            <button
              onClick={() => onRemove(product._id)}
              aria-label={`Remove ${product.name} from saved items`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-red-600"
            >
              <Heart size={12} className="fill-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuthController();
  const { orders, isLoading } = useMyOrders();
  const addItem = useCartStore((s) => s.addItem);
  const recentOrders = orders.slice(0, 5);

  const onReorder = (order: Order) => {
    let addedCount = 0;
    for (const item of order.items) {
      if (!item.product) continue;
      addItem(
        {
          productId: item.product._id,
          name: item.product.name,
          price: item.price,
          image: item.product.images[0] ? toUploadUrl(item.product.images[0]) : undefined,
          deliveryFeeInsideCity: item.product.deliveryFeeInsideCity,
          deliveryFeeOutsideCity: item.product.deliveryFeeOutsideCity,
        },
        item.quantity
      );
      addedCount++;
    }
    if (addedCount === 0) {
      toast.error("None of these products are available anymore");
      return;
    }
    router.push("/checkout");
  };

  return (
    <main className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-1">Welcome back{user ? `, ${user.name}` : ""}</h1>
      <p className="text-sm text-muted mb-6">Here&apos;s a quick look at your account.</p>

      <PromoReminder />

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Total orders</p>
          <p className="mt-1 text-2xl font-semibold">{isLoading ? "..." : orders.length}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Account</p>
          <p className="mt-1 truncate text-sm font-medium">{user?.email}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted">Role</p>
          <p className="mt-1 text-sm font-medium capitalize">
            {user?.role === "coadmin" ? "Co-admin" : user?.role}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-md border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Delivery location</h2>
          <Link
            href="/settings"
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <Pencil size={12} /> {user?.deliveryLocation ? "Edit" : "Add"}
          </Link>
        </div>
        {user?.deliveryLocation ? (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <p>{user.deliveryLocation.addressLine}</p>
              <p className="text-muted">
                {user.deliveryLocation.upazila}, {user.deliveryLocation.zila} &middot;{" "}
                {isInsideStoreCity(user.deliveryLocation.zila) ? `Inside ${STORE_CITY}` : `Outside ${STORE_CITY}`}{" "}
                delivery
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No delivery location saved yet —{" "}
            <Link href="/settings" className="text-primary underline">
              add one
            </Link>{" "}
            so we know which delivery fee applies to you.
          </p>
        )}
      </div>

      <ReviewPrompts />
      <SavedItems />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent orders</h2>
        <Link href="/orders" className="flex items-center gap-1 text-xs text-muted hover:text-foreground">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading your orders...</p>
      ) : recentOrders.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <Package className="mx-auto mb-2 text-muted" size={24} />
          <p className="mb-3 text-sm text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="text-sm font-medium text-primary underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {recentOrders.map((order) => (
            <div
              key={order._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">Order #{order._id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-muted">
                  {format(new Date(order.createdAt), "PPP")} &middot; {order.items.length} item
                  {order.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLASS[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
                <span className="text-sm font-medium">{formatCurrency(order.totalAmount)}</span>
                <button
                  onClick={() => onReorder(order)}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-background"
                >
                  <RotateCw size={12} /> Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/orders"
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          <Package size={16} /> View orders
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          <SettingsIcon size={16} /> Account settings
        </Link>
      </div>
    </main>
  );
}
