import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCategory } from "@/models";
import { CategoryTile } from "@/views/CategoryTile";
import { T } from "@/components/ui/T";

export function CategoryShowcase({ categories }: { categories: ProductCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold">
          <T k="category.shopByCategory">Shop by Category</T>
        </h2>
        <Link
          href="/categories"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <T k="common.viewAll">View all</T> <ArrowRight size={14} />
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
