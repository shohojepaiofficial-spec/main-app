import type { Metadata } from "next";
import Link from "next/link";
import { getProductCategories } from "@/services/productService";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore products by category.",
};

export default async function CategoriesPage() {
  const categories = await getProductCategories();

  return (
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <h1 className="mb-6 text-2xl font-semibold">Categories</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No categories yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.map(({ category, count }) => (
            <Link
              key={category}
              href={`/shop?category=${encodeURIComponent(category)}`}
              className="rounded-md border border-border bg-surface p-4 hover:bg-background"
            >
              <p className="font-medium">{category}</p>
              <p className="text-sm text-muted">
                {count} product{count === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
