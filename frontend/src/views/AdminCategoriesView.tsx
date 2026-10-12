"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Plus, ArrowUp, ArrowDown, EyeOff, ImageOff } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminCategories } from "@/controllers/useAdminCategories";
import { CategoryFormModal } from "@/views/CategoryFormModal";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { ManagedCategory } from "@/models";

export function AdminCategoriesView() {
  const { isChecking, isAllowed } = useRequirePermission("products:manage");
  const { categories, isLoading, pendingId, upsert, remove, move } = useAdminCategories();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ManagedCategory | null>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openAddForm = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const openEditForm = (category: ManagedCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const onDelete = async (category: ManagedCategory) => {
    const confirmed = await confirmDialog(`Delete the "${category.name}" category? This can't be undone.`, {
      title: "Delete category",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(category.id);
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Manage categories</h1>
          <p className="text-sm text-muted">
            The categories products can be put in. A category shows on the storefront only once it
            has a product. Order top-to-bottom is the order shoppers see.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex shrink-0 items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover"
        >
          <Plus size={16} /> Add category
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading categories...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted">No categories yet — add one, then pick it when adding a product.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="flex items-center gap-4 rounded-md border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(category.id, "up")}
                  disabled={index === 0 || pendingId === category.id}
                  aria-label={`Move ${category.name} up`}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => move(category.id, "down")}
                  disabled={index === categories.length - 1 || pendingId === category.id}
                  aria-label={`Move ${category.name} down`}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              {category.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toUploadUrl(category.image)}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded object-cover border border-border"
                />
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted">
                  <ImageOff size={16} aria-hidden />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium truncate">{category.name}</p>
                  {category.nameBn && <p className="text-sm text-muted truncate">{category.nameBn}</p>}
                  {category.productCount === 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] uppercase text-muted">
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {category.productCount === 0
                    ? "No products yet — hidden until one is added"
                    : `${category.productCount} product${category.productCount === 1 ? "" : "s"}`}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openEditForm(category)}
                  aria-label={`Edit ${category.name}`}
                  className="text-muted hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onDelete(category)}
                  disabled={pendingId === category.id || category.productCount > 0}
                  aria-label={`Delete ${category.name}`}
                  title={category.productCount > 0 ? "Move or delete its products first" : undefined}
                  className="text-red-600 hover:text-red-700 disabled:opacity-30"
                >
                  {pendingId === category.id ? (
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

      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingCategory={editingCategory}
        onSaved={upsert}
      />
    </main>
  );
}
