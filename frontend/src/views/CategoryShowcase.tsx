import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCategory } from "@/models";
import { CategoryTile } from "@/views/CategoryTile";

export function CategoryShowcase({ categories }: { categories: ProductCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold">Shop by Category</h2>
        <Link
          href="/categories"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.slice(0, 6).map(({ category, count }) => (
          <CategoryTile key={category} category={category} count={count} />
        ))}
      </div>
    </section>
  );
}
