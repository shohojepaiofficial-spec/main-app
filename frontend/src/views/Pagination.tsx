"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Server/URL-driven lists (Shop): render page links, e.g. (p) => `/shop?page=${p}`. */
  hrefFor?: (page: number) => string;
  /** Client-only lists (admin tables, reviews): render buttons instead of links. */
  onChange?: (page: number) => void;
}

// Windows down to a handful of page numbers around the current one so this
// stays usable even with a large catalog, instead of listing every page.
function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export function Pagination({ page, totalPages, hrefFor, onChange }: PaginationProps) {
  const { t } = useTranslations();
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  const renderPage = (p: number) => {
    const isActive = p === page;
    const className = `flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium ${
      isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
    }`;
    if (hrefFor) {
      return (
        <Link key={p} href={hrefFor(p)} aria-current={isActive ? "page" : undefined} className={className}>
          {p}
        </Link>
      );
    }
    return (
      <button
        key={p}
        onClick={() => onChange?.(p)}
        aria-current={isActive ? "page" : undefined}
        className={className}
      >
        {p}
      </button>
    );
  };

  const renderArrow = (targetPage: number, disabled: boolean, label: string, Icon: typeof ChevronLeft) => {
    const className = `flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-background ${
      disabled ? "pointer-events-none opacity-30" : ""
    }`;
    if (hrefFor) {
      return disabled ? (
        <span aria-hidden className={className}>
          <Icon size={16} />
        </span>
      ) : (
        <Link href={hrefFor(targetPage)} aria-label={label} className={className}>
          <Icon size={16} />
        </Link>
      );
    }
    return (
      <button
        onClick={() => onChange?.(targetPage)}
        disabled={disabled}
        aria-label={label}
        className={className}
      >
        <Icon size={16} />
      </button>
    );
  };

  return (
    <nav aria-label={t("common.pagination", "Pagination")} className="flex items-center justify-center gap-1 pt-4">
      {renderArrow(page - 1, page <= 1, t("common.previousPage", "Previous page"), ChevronLeft)}
      {pages[0] > 1 && <span className="px-1 text-muted">&hellip;</span>}
      {pages.map(renderPage)}
      {pages[pages.length - 1] < totalPages && <span className="px-1 text-muted">&hellip;</span>}
      {renderArrow(page + 1, page >= totalPages, t("common.nextPage", "Next page"), ChevronRight)}
    </nav>
  );
}
