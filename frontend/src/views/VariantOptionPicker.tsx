"use client";

import type { VariantPicker } from "@/controllers/useVariantPicker";
import { useTranslations } from "@/controllers/useTranslations";

// The product page's "Size: S M L XL" / "Weight: 250g 500g 1kg" buttons.
// A value that's sold out (or not sold at all) with the shopper's other
// picks is struck through but still clickable — they may want to see that
// it's out, or change their other pick next.
export function VariantOptionPicker({ picker, showMissing }: { picker: VariantPicker; showMissing: boolean }) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-3">
      {picker.options.map((option) => {
        const selected = picker.picked[option.name];
        const isMissing = showMissing && !selected;
        return (
          <fieldset key={option.name}>
            <legend className="mb-1.5 text-sm">
              <span className="text-muted">{option.name}:</span>{" "}
              <span className="font-medium">{selected ?? t("product.chooseOption", "Choose one")}</span>
            </legend>
            <div className={`flex flex-wrap gap-2 ${isMissing ? "rounded-md ring-1 ring-red-500 ring-offset-2 ring-offset-surface" : ""}`}>
              {option.values.map((value) => {
                const isSelected = selected === value;
                const available = picker.isValueAvailable(option.name, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => picker.pick(option.name, value)}
                    aria-pressed={isSelected}
                    aria-label={
                      available
                        ? `${option.name} ${value}`
                        : t("product.optionSoldOut", "{option} {value} — sold out", { option: option.name, value })
                    }
                    className={`min-w-11 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border text-foreground hover:border-foreground/40"
                    } ${available ? "" : "text-muted line-through decoration-1"}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {isMissing && (
              <p className="mt-1 text-xs text-red-600">
                {t("product.pleaseChooseOption", "Please choose a {option}", { option: option.name.toLowerCase() })}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
