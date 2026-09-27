"use client";

import { useState } from "react";
import { SITE_NAME } from "@/lib/seo";

// The store's reply box — shared by the admin Reviews page and the inline
// "Reply" on a product page's reviews (for anyone with reviews:manage).
const MAX_REPLY_LENGTH = 2000;

export function ReviewReplyEditor({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (text: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    const ok = await onSave(text.trim());
    setIsSaving(false);
    if (ok && !initialText) setText("");
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={MAX_REPLY_LENGTH}
        placeholder={`Reply publicly as ${SITE_NAME}…`}
        aria-label="Your reply"
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isSaving || !text.trim()}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {isSaving ? "Saving..." : initialText ? "Save reply" : "Post reply"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-foreground">
            Cancel
          </button>
        )}
        <span className="ml-auto text-xs text-muted">Shown publicly on the product page.</span>
      </div>
    </div>
  );
}

