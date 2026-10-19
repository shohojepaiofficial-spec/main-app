"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noMatchText: string;
  disabled?: boolean;
  error?: string;
}

// Match ignoring case, spaces and punctuation, so "chatto" finds
// "Chattogram" and "coxs" finds "Cox's Bazar".
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9ঀ-৿]/g, "");

// A select with a search box — for long lists like Pathao's zones. Generic:
// no domain knowledge, the caller owns the value.
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noMatchText,
  disabled = false,
  error,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const matches = useMemo(() => {
    const q = fold(query);
    if (!q) return options;
    const starts = options.filter((o) => fold(o.label).startsWith(q));
    const contains = options.filter((o) => !fold(o.label).startsWith(q) && fold(o.label).includes(q));
    return [...starts, ...contains];
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const open = () => {
    if (disabled) return;
    setQuery("");
    setHighlighted(0);
    setIsOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const choose = (option: SearchableOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlighted]) choose(matches[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <label className="text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 text-left disabled:opacity-50"
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2">
            <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">{noMatchText}</li>}
            {matches.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setHighlighted(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === highlighted ? "bg-background" : ""} ${option.value === value ? "font-medium text-primary" : ""}`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
