import type { Metadata } from "next";
import { getProductCategories } from "@/services/productService";
import { CategoryTile } from "@/views/CategoryTile";

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore products by category.",
};

export default async function CategoriesPage() {
  const categories = await getProductCategories();

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <h1 className="mb-6 text-2xl font-semibold">Categories</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No categories yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map(({ category, count }) => (
            <CategoryTile key={category} category={category} count={count} />
          ))}
        </div>
      )}
    </main>
  );
}
