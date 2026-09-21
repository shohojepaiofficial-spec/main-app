"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminTranslations } from "@/controllers/useAdminTranslations";
import { Translation } from "@/models";

function TranslationRow({
  translation,
  isSaving,
  onSave,
}: {
  translation: Translation;
  isSaving: boolean;
  onSave: (bn: string) => void;
}) {
  const [bn, setBn] = useState(translation.bn);
  const isDirty = bn !== translation.bn;

  return (
    <tr className="border-b border-border align-top last:border-b-0">
      <td className="py-3 pl-4 pr-4">
        <code className="text-xs text-muted">{translation.key}</code>
      </td>
      <td className="py-3 pr-4 text-sm">{translation.en}</td>
      <td className="py-3 pr-4">
        <textarea
          value={bn}
          onChange={(e) => setBn(e.target.value)}
          rows={2}
          placeholder="Not translated yet — shows the English text above until filled in"
          className="w-full min-w-[220px] rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
      </td>
      <td className="py-3 pr-4">
        <button
          onClick={() => onSave(bn)}
          disabled={!isDirty || isSaving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="animate-spin" size={14} /> : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function AdminTranslationsView() {
  const { isChecking, isAllowed } = useRequirePermission("translations:manage");
  const { translations, isLoading, savingKey, updateBn } = useAdminTranslations();
  const [search, setSearch] = useState("");

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const filtered = translations.filter(
    (t) =>
      !search ||
      t.key.toLowerCase().includes(search.toLowerCase()) ||
      t.en.toLowerCase().includes(search.toLowerCase()) ||
      t.bn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-6">
      <h1 className="mb-1 text-xl font-semibold">Translations</h1>
      <p className="mb-6 text-sm text-muted">
        Bangla text for the storefront. A blank field shows the English text until filled in — the
        admin panel itself stays English-only.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by key or text..."
        className="mb-4 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted">Loading translations...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">No translations match "{search}".</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border bg-background text-xs uppercase text-muted">
                <th className="py-2 pl-4 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">English</th>
                <th className="py-2 pr-4 font-medium">Bangla</th>
                <th className="py-2 pr-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((translation) => (
                <TranslationRow
                  key={translation.key}
                  translation={translation}
                  isSaving={savingKey === translation.key}
                  onSave={(bn) => updateBn(translation.key, bn)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
