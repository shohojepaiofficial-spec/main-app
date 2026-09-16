import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Not just decorative: a linked crumb is a real, crawlable internal link
// (unlike a plain text label), which is what makes something like a
// product's category actually count for SEO instead of being inert text.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
      {items.map((item, index) => (
        <span key={item.href ?? item.label} className="flex items-center gap-1">
          {index > 0 && <ChevronRight size={12} className="text-border" aria-hidden />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
