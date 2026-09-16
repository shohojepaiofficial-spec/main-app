"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Plus, Star } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminProducts } from "@/controllers/useAdminProducts";
import { ProductFormModal } from "@/views/ProductFormModal";
import { Pagination } from "@/views/Pagination";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { confirmDialog } from "@/lib/confirm";
import { Product } from "@/models";

export function AdminProductsView() {
  const { isChecking, isAllowed } = useRequirePermission("products:manage");
  const { products, isLoading, deletingId, remove, upsert, categories, page, totalPages, setPage } =
    useAdminProducts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openAddForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const onDelete = async (product: Product) => {
    const confirmed = await confirmDialog(`Delete "${product.name}"? This can't be undone.`, {
      title: "Delete product",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(product._id);
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Manage products</h1>
          <p className="text-sm text-muted">Add, edit, and remove products from the catalog.</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover"
        >
          <Plus size={16} /> Add product
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted">No products yet — add your first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border bg-background text-xs uppercase text-muted">
                <th className="py-2 pl-4 pr-4 font-medium">Product</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Delivery (in/out)</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-border last:border-b-0">
                  <td className="py-3 pl-4 pr-4 align-top">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={toUploadUrl(product.images[0])}
                          alt=""
                          className="w-10 h-10 rounded object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-background border border-border shrink-0" />
                      )}
                      <div>
                        <p className="flex items-center gap-1 text-sm font-medium">
                          {product.name}
                          {product.isFeatured && (
                            <Star size={12} className="fill-primary text-primary" aria-label="Featured" />
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {product.images.length} image{product.images.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top text-sm text-muted">{product.category}</td>
                  <td className="py-3 pr-4 align-top text-sm">{formatCurrency(product.price)}</td>
                  <td className="py-3 pr-4 align-top text-sm">
                    {product.deliveryFeeInsideCity > 0 ? formatCurrency(product.deliveryFeeInsideCity) : "Free"} /{" "}
                    {product.deliveryFeeOutsideCity > 0 ? formatCurrency(product.deliveryFeeOutsideCity) : "Free"}
                  </td>
                  <td className="py-3 pr-4 align-top text-sm">{product.stock}</td>
                  <td className="py-3 pr-4 align-top">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditForm(product)}
                        aria-label={`Edit ${product.name}`}
                        className="text-muted hover:text-foreground"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        disabled={deletingId === product._id}
                        aria-label={`Delete ${product.name}`}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === product._id ? (
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

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingProduct={editingProduct}
        categories={categories}
        onSaved={upsert}
      />
    </main>
  );
}
