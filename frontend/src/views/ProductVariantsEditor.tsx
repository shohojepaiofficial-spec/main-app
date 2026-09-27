"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import type { VariantEditor, VariantRow } from "@/controllers/useVariantEditor";

// The images a variant can be pointed at — the product's existing ones (by
// URL) and any picked in this same form but not uploaded yet (by File).
export interface VariantImageChoice {
  value: string | File;
  src: string;
}

// Option names the datalist offers — anything else can still be typed.
const COMMON_OPTION_NAMES = ["Size", "Color", "Weight", "Flavor", "Material", "Storage", "Volume", "Style", "Pack"];

const inputClass = "w-full border border-border rounded px-2 py-1.5 bg-background text-sm";

interface ProductVariantsEditorProps {
  editor: VariantEditor;
  category: string;
  imageChoices: VariantImageChoice[];
}

export function ProductVariantsEditor({ editor, category, imageChoices }: ProductVariantsEditorProps) {
  return (
    <section className="border border-border rounded-lg p-3 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Options &amp; variants</h3>
        <p className="text-xs text-muted mt-0.5">
          Does this product come in different sizes, colors, weights or flavors? Add them here and give each combination
          its own price and stock.
        </p>
      </div>

      {editor.suggestedOptions.length > 0 && (
        <div className="rounded border border-dashed border-border bg-surface px-3 py-2 text-sm flex flex-wrap items-center gap-2">
          <Sparkles size={14} className="text-primary shrink-0" />
          <span className="text-muted">Suggested for {category.trim()}:</span>
          <span className="font-medium">
            {editor.suggestedOptions.map((o) => `${o.name} (${o.values.slice(0, 4).join(", ")}${o.values.length > 4 ? "…" : ""})`).join(" · ")}
          </span>
          <button
            type="button"
            onClick={() => editor.applySuggestions(editor.suggestedOptions)}
            className="ml-auto text-primary font-medium hover:underline"
          >
            Use these
          </button>
        </div>
      )}

      {editor.options.map((option, index) => (
        <OptionCard key={index} editor={editor} index={index} />
      ))}

      <datalist id="variant-option-names">
        {COMMON_OPTION_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {editor.canAddOption && (
        <button
          type="button"
          onClick={editor.addOption}
          className="self-start inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
        >
          <Plus size={14} />
          {editor.hasVariants ? "Add another option" : "Add an option (like Size or Color)"}
        </button>
      )}

      {editor.hasVariants && <VariantTable editor={editor} imageChoices={imageChoices} />}
    </section>
  );
}

function OptionCard({ editor, index }: { editor: VariantEditor; index: number }) {
  const option = editor.options[index];
  const [draft, setDraft] = useState("");

  const commit = () => {
    editor.addValues(index, draft);
    setDraft("");
  };

  return (
    <div className="rounded border border-border p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={option.name}
          onChange={(e) => editor.renameOption(index, e.target.value)}
          list="variant-option-names"
          placeholder="Option name, e.g. Size"
          aria-label="Option name"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => editor.removeOption(index)}
          className="p-1.5 text-muted hover:text-red-600"
          aria-label={`Remove option ${option.name || index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {option.values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-surface border border-border pl-2.5 pr-1 py-0.5 text-sm"
          >
            {value}
            <button
              type="button"
              onClick={() => editor.removeValue(index, value)}
              className="text-muted hover:text-red-600 p-0.5"
              aria-label={`Remove ${value}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <input
        value={draft}
        onChange={(e) => {
          // Typing a comma commits what's before it, so "S, M, L" can be
          // typed straight through.
          if (e.target.value.includes(",")) {
            editor.addValues(index, e.target.value);
            setDraft("");
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter adds a value here — it must never submit the product form.
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={option.values.length ? "Add another value…" : "Type a value and press Enter (e.g. S, M, L)"}
        aria-label={`Add a value for ${option.name || "this option"}`}
        className={inputClass}
      />
    </div>
  );
}

function VariantTable({ editor, imageChoices }: { editor: VariantEditor; imageChoices: VariantImageChoice[] }) {
  const [allPrice, setAllPrice] = useState("");
  const [allStock, setAllStock] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 pt-1">
        <h4 className="text-sm font-medium">
          {editor.rows.length} variant{editor.rows.length === 1 ? "" : "s"}
        </h4>
        {editor.removedRowCount > 0 && (
          <button type="button" onClick={editor.restoreRemovedRows} className="text-xs text-primary hover:underline">
            Restore {editor.removedRowCount} removed
          </button>
        )}
      </div>

      {editor.rows.length > 1 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <BulkField
            label="Set every price"
            value={allPrice}
            onChange={setAllPrice}
            onApply={() => {
              editor.applyToAll({ price: allPrice });
              setAllPrice("");
            }}
          />
          <BulkField
            label="Set every stock"
            value={allStock}
            onChange={setAllStock}
            onApply={() => {
              editor.applyToAll({ stock: allStock });
              setAllStock("");
            }}
          />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {editor.rows.map((row) => (
          <VariantRowCard key={row.key} row={row} editor={editor} imageChoices={imageChoices} />
        ))}
      </ul>
      <p className="text-xs text-muted">
        Remove a combination you don&apos;t sell (e.g. no Grey in XXL). The storefront shows the lowest variant price as
        &quot;from ৳…&quot;.
      </p>
    </div>
  );
}

function BulkField({
  label,
  value,
  onChange,
  onApply,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (value !== "") onApply();
          }
        }}
        placeholder={label}
        aria-label={label}
        className={inputClass}
      />
      <button
        type="button"
        disabled={value === ""}
        onClick={onApply}
        className="border border-border rounded px-2 py-1.5 hover:bg-surface disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}

function VariantRowCard({
  row,
  editor,
  imageChoices,
}: {
  row: VariantRow;
  editor: VariantEditor;
  imageChoices: VariantImageChoice[];
}) {
  const field = (label: string, input: React.ReactNode) => (
    <label className="flex flex-col gap-0.5 text-xs text-muted">
      {label}
      {input}
    </label>
  );

  return (
    <li className="rounded border border-border p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{row.label}</span>
        <button
          type="button"
          onClick={() => editor.removeRow(row.key)}
          className="p-1 text-muted hover:text-red-600"
          aria-label={`Remove ${row.label}`}
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {field(
          "Price",
          <input
            type="number"
            step="0.01"
            min="0"
            value={row.price}
            onChange={(e) => editor.updateRow(row.key, { price: e.target.value })}
            className={inputClass}
          />
        )}
        {field(
          "Stock",
          <input
            type="number"
            min="0"
            step="1"
            value={row.stock}
            onChange={(e) => editor.updateRow(row.key, { stock: e.target.value })}
            className={inputClass}
          />
        )}
        {field(
          "SKU (optional)",
          <input
            value={row.sku}
            onChange={(e) => editor.updateRow(row.key, { sku: e.target.value })}
            className={inputClass}
          />
        )}
        {field(
          "Weight kg (optional)",
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={row.weightKg}
            onChange={(e) => editor.updateRow(row.key, { weightKg: e.target.value })}
            placeholder="Same as product"
            className={inputClass}
          />
        )}
      </div>

      {imageChoices.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted mr-1">Image:</span>
          <button
            type="button"
            onClick={() => editor.updateRow(row.key, { image: "" })}
            aria-pressed={row.image === ""}
            className={`h-9 px-2 rounded border text-xs ${row.image === "" ? "border-primary ring-1 ring-primary" : "border-border"}`}
          >
            Default
          </button>
          {imageChoices.map((choice) => (
            <button
              key={choice.src}
              type="button"
              onClick={() => editor.updateRow(row.key, { image: choice.value })}
              aria-pressed={row.image === choice.value}
              aria-label={`Use this image for ${row.label}`}
              className={`w-9 h-9 rounded overflow-hidden border ${
                row.image === choice.value ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={choice.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
