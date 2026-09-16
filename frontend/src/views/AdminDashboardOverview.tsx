"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Boxes, AlertTriangle, Wallet, ArrowRight } from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import * as orderService from "@/services/orderService";
import * as productService from "@/services/productService";
import { formatCurrency } from "@/lib/currency";
import { OrderStats, ProductStats } from "@/models";

function StatTile({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  Icon: typeof ClipboardList;
  tone?: "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs uppercase text-muted">
        <Icon size={14} className={tone === "warning" ? "text-yellow-600" : undefined} /> {label}
      </div>
      <p className={`mt-1 text-2xl font-semibold ${tone === "warning" ? "text-yellow-700" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// Admin/coadmin landing screen — quick-glance operational numbers instead of
// the customer-facing "my orders" dashboard (DashboardOverview). Each
// section only fetches/renders if the signed-in account actually holds the
// relevant permission, same "only show what they're granted" rule as
// DashboardSidebar — an orders-only coadmin never sees a broken/empty
// products section, and vice versa.
export function AdminDashboardOverview() {
  const { user, hasPermission } = useAuthController();
  const canSeeOrders = hasPermission("orders:manage");
  const canSeeProducts = hasPermission("products:manage");

  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      canSeeOrders ? orderService.getOrderStats() : Promise.resolve(null),
      canSeeProducts ? productService.getProductStats() : Promise.resolve(null),
    ])
      .then(([orders, products]) => {
        if (ignore) return;
        setOrderStats(orders);
        setProductStats(products);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-4xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Welcome back{user ? `, ${user.name}` : ""}</h1>
      <p className="mb-6 text-sm text-muted">Here&apos;s how the store is doing right now.</p>

      {isLoading ? (
        <p className="text-sm text-muted">Loading overview...</p>
      ) : (
        <>
          {canSeeOrders && orderStats && (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Orders</h2>
                <Link
                  href="/admin/orders"
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
                >
                  Manage orders <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatTile
                  label="Pending orders"
                  value={String(orderStats.pendingCount)}
                  Icon={ClipboardList}
                  tone={orderStats.pendingCount > 0 ? "warning" : undefined}
                />
                <StatTile label="Total orders" value={String(orderStats.totalOrders)} Icon={ClipboardList} />
                <StatTile label="Revenue" value={formatCurrency(orderStats.totalRevenue)} Icon={Wallet} />
              </div>
            </div>
          )}

          {canSeeProducts && productStats && (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Products</h2>
                <Link
                  href="/admin/products"
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
                >
                  Manage products <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatTile label="Total products" value={String(productStats.totalProducts)} Icon={Boxes} />
                <StatTile
                  label="Low stock (≤5)"
                  value={String(productStats.lowStockCount)}
                  Icon={AlertTriangle}
                  tone={productStats.lowStockCount > 0 ? "warning" : undefined}
                />
              </div>

              {productStats.lowStockProducts.length > 0 && (
                <div className="mt-3 rounded-md border border-border bg-surface p-4">
                  <p className="mb-2 text-xs font-medium uppercase text-muted">Running low</p>
                  <div className="flex flex-col gap-2">
                    {productStats.lowStockProducts.map((p) => (
                      <div key={p._id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 font-medium text-yellow-700">{p.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!canSeeOrders && !canSeeProducts && (
            <p className="text-sm text-muted">
              Nothing to show yet — ask an admin to grant you a permission from Manage Users.
            </p>
          )}
        </>
      )}
    </main>
  );
}
