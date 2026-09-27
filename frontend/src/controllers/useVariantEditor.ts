"use client";

import { useEffect, useMemo, useState } from "react";
import * as productService from "@/services/productService";
import type { VariantInput } from "@/services/productService";
import { allCombinations, variantLabel } from "@/lib/variants";
import type { Product, ProductOption, VariantSelection } from "@/models";
import { useDebouncedValue } from "./useDebouncedValue";

export const MAX_OPTIONS = 3;

// What the admin can edit per variant row. Numbers stay strings while
// being typed (so a half-typed "1." or an empty box isn't coerced to 0);
// `image` is an existing image URL, a not-yet-uploaded File, or "" for "use
// the product's main images".
export interface VariantDraft {
  _id?: string;
  price: string;
  stock: string;
  sku: string;
  image: string | File;
  weightKg: string;
}

export interface VariantRow extends VariantDraft {
  key: string;
  label: string;
  selections: VariantSelection[];
}

// Rows are keyed by option *position* + value rather than option name, so
// renaming "Colour" to "Color" doesn't throw away every price already typed.
function rowKey(selections: VariantSelection[]): string {
  return selections.map((s, i) => `${i}:${s.value.toLowerCase()}`).join("|");
}

// Re-orders a saved variant's selections into the product's option order
// before keying it — the server stores them that way already, but this
// doesn't need to rely on it.
function keyForSaved(options: ProductOption[], selections: VariantSelection[]): string {
  return rowKey(
    options.map((o) => selections.find((s) => s.name.toLowerCase() === o.name.toLowerCase()) ?? { name: o.name, value: "" })
  );
}

function initialState(product: Product | null) {
  const options = (product?.options ?? []).map((o) => ({ name: o.name, values: [...o.values] }));
  const drafts: Record<string, VariantDraft> = {};
  for (const v of product?.variants ?? []) {
    drafts[keyForSaved(options, v.selections)] = {
      _id: v._id,
      price: String(v.price),
      stock: String(v.stock),
      sku: v.sku ?? "",
      image: v.image ?? "",
      weightKg: v.weightKg !== undefined ? String(v.weightKg) : "",
    };
  }
  // A saved product that deliberately skipped some combinations (say, no
  // Grey in XXL) keeps skipping them.
  const excluded = allCombinations(options)
    .map(rowKey)
    .filter((key) => !drafts[key]);
  return { options, drafts, excluded };
}

interface UseVariantEditorArgs {
  product: Product | null;
  // The form's current category and base price — the category drives
  // suggestions, the price pre-fills new variant rows.
  category: string;
  basePrice: string;
}

export function useVariantEditor({ product, category, basePrice }: UseVariantEditorArgs) {
  const [initial] = useState(() => initialState(product));
  const [options, setOptions] = useState<ProductOption[]>(initial.options);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>(initial.drafts);
  const [excluded, setExcluded] = useState<string[]>(initial.excluded);

  const rows: VariantRow[] = useMemo(
    () =>
      allCombinations(options)
        .map((selections) => ({ selections, key: rowKey(selections) }))
        .filter(({ key }) => !excluded.includes(key))
        .map(({ selections, key }) => ({
          key,
          selections,
          label: variantLabel(selections),
          ...(drafts[key] ?? { price: basePrice, stock: "0", sku: "", image: "", weightKg: "" }),
        })),
    [options, drafts, excluded, basePrice]
  );

  const hasVariants = options.length > 0;

  // --- Suggestions for the picked category -------------------------------
  // Keyed by the category they were fetched for, so a stale response for a
  // category the admin has since changed away from is simply never shown —
  // no reset-in-effect needed.
  const debouncedCategory = useDebouncedValue(category.trim(), 500);
  const [suggestion, setSuggestion] = useState<{ category: string; options: ProductOption[] } | null>(null);
  useEffect(() => {
    if (!debouncedCategory) return;
    let ignore = false;
    productService
      .getOptionSuggestions(debouncedCategory)
      .then((suggested) => {
        if (!ignore) setSuggestion({ category: debouncedCategory, options: suggested });
      })
      // Suggestions are a convenience — failing to load them just means
      // none are offered, never an error the admin has to deal with.
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [debouncedCategory]);

  const suggestedOptions =
    !hasVariants && suggestion && suggestion.category === debouncedCategory && suggestion.options.length > 0
      ? suggestion.options
      : [];

  // --- Option editing ----------------------------------------------------
  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { name: "", values: [] }]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    // Position-based keys shift once an option is removed — the old drafts
    // and exclusions no longer describe the same rows.
    setDrafts({});
    setExcluded([]);
  };

  const renameOption = (index: number, name: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, name } : o)));
  };

  // Accepts "S, M, L" in one go as well as a single value.
  const addValues = (index: number, raw: string) => {
    const incoming = raw
      .split(",")
      .map((v) => v.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (incoming.length === 0) return;
    setOptions((prev) =>
      prev.map((o, i) => {
        if (i !== index) return o;
        const values = [...o.values];
        for (const value of incoming) {
          if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) values.push(value);
        }
        return { ...o, values };
      })
    );
  };

  const removeValue = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, values: o.values.filter((v) => v !== value) } : o)));
  };

  const applySuggestions = (suggested: ProductOption[]) => {
    setOptions(suggested.slice(0, MAX_OPTIONS).map((o) => ({ name: o.name, values: [...o.values] })));
    setDrafts({});
    setExcluded([]);
  };

  // --- Variant rows ------------------------------------------------------
  const updateRow = (key: string, patch: Partial<VariantDraft>) => {
    setDrafts((prev) => {
      const row = rows.find((r) => r.key === key);
      if (!row) return prev;
      const { _id, price, stock, sku, image, weightKg } = { ...row, ...prev[key] };
      return { ...prev, [key]: { _id, price, stock, sku, image, weightKg, ...patch } };
    });
  };

  // For a combination the shop doesn't actually sell (no Grey in XXL).
  const removeRow = (key: string) => setExcluded((prev) => [...prev, key]);
  const restoreRemovedRows = () => setExcluded([]);
  const removedRowCount = allCombinations(options).length - rows.length;

  // "Set every price to 1200" — the common case of most variants sharing
  // one price or starting stock.
  const applyToAll = (patch: Pick<Partial<VariantDraft>, "price" | "stock">) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const { _id, price, stock, sku, image, weightKg } = { ...row, ...prev[row.key] };
        next[row.key] = { _id, price, stock, sku, image, weightKg, ...patch };
      }
      return next;
    });
  };

  // An image removed from the product elsewhere in the form shouldn't stay
  // silently attached to a variant.
  const clearImage = (image: string | File) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const [key, draft] of Object.entries(prev)) {
        if (draft.image === image) next[key] = { ...draft, image: "" };
      }
      return next;
    });
  };

  // --- Submit ------------------------------------------------------------
  // Mirrors the server's own checks (utils/productVariants.ts) so the admin
  // gets a clear message before uploading anything; the server still
  // re-validates everything.
  const validate = (): string | null => {
    if (!hasVariants) return null;
    const names = new Set<string>();
    for (const option of options) {
      const name = option.name.trim();
      if (!name) return "Give every option a name (like Size or Color)";
      if (names.has(name.toLowerCase())) return `Option "${name}" is listed twice`;
      names.add(name.toLowerCase());
      if (option.values.length === 0) return `Add at least one value for "${name}"`;
    }
    if (rows.length === 0) return "Keep at least one variant, or remove the options";
    for (const row of rows) {
      const price = Number(row.price);
      const stock = Number(row.stock);
      if (row.price.trim() === "" || !Number.isFinite(price) || price < 0) return `Enter a valid price for ${row.label}`;
      if (row.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) {
        return `Stock for ${row.label} must be a whole number`;
      }
      if (row.weightKg.trim() !== "" && !(Number(row.weightKg) >= 0.1)) {
        return `Weight for ${row.label} must be at least 0.1kg`;
      }
    }
    return null;
  };

  const toPayload = (existingImages: string[], newImages: File[]): { options: ProductOption[]; variants: VariantInput[] } => {
    if (!hasVariants) return { options: [], variants: [] };
    return {
      options: options.map((o) => ({ name: o.name.trim(), values: o.values })),
      variants: rows.map((row) => {
        const variant: VariantInput = {
          _id: row._id,
          selections: row.selections.map((s) => ({ name: s.name.trim(), value: s.value })),
          price: Number(row.price),
          stock: Number(row.stock),
        };
        if (row.sku.trim()) variant.sku = row.sku.trim();
        if (row.weightKg.trim()) variant.weightKg = Number(row.weightKg);
        if (row.image instanceof File) {
          const index = newImages.indexOf(row.image);
          if (index >= 0) variant.image = `new:${index}`;
        } else if (row.image && existingImages.includes(row.image)) {
          variant.image = row.image;
        }
        return variant;
      }),
    };
  };

  return {
    options,
    rows,
    hasVariants,
    canAddOption: options.length < MAX_OPTIONS,
    suggestedOptions,
    removedRowCount,
    addOption,
    removeOption,
    renameOption,
    addValues,
    removeValue,
    applySuggestions,
    updateRow,
    removeRow,
    restoreRemovedRows,
    applyToAll,
    clearImage,
    validate,
    toPayload,
  };
}

export type VariantEditor = ReturnType<typeof useVariantEditor>;
