import Link from "next/link";
import { ProductCategory } from "@/models";

export function CategoryShowcase({ categories }: { categories: ProductCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold">Shop by Category</h2>
        <Link href="/categories" className="text-sm text-muted hover:text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.slice(0, 6).map(({ category, count }) => (
          <Link
            key={category}
            href={`/shop?category=${encodeURIComponent(category)}`}
            className="flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface p-5 text-center transition-shadow hover:border-primary hover:shadow-md"
          >
            <p className="font-medium">{category}</p>
            <p className="text-xs text-muted">
              {count} product{count === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
