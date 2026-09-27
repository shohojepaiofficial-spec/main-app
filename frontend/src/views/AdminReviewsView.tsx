"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MessageSquareReply, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminReviews } from "@/controllers/useAdminReviews";
import { Pagination } from "@/views/Pagination";
import { Stars } from "@/views/ProductReviews";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { SITE_NAME } from "@/lib/seo";
import { AdminReview, ReviewReplyStatus } from "@/models";

const STATUS_TABS: { value: ReviewReplyStatus; label: string }[] = [
  { value: "unreplied", label: "Needs a reply" },
  { value: "replied", label: "Replied" },
  { value: "all", label: "All" },
];

const MAX_REPLY_LENGTH = 2000;

function ReplyEditor({
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

function ReviewCard({
  review,
  onReply,
  onRemoveReply,
  onDeleteReview,
}: {
  review: AdminReview;
  onReply: (text: string) => Promise<boolean>;
  onRemoveReply: () => void;
  onDeleteReview: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const image = review.product?.images[0];

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={toUploadUrl(image)} alt="" className="h-10 w-10 shrink-0 rounded border border-border object-cover" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded border border-border bg-background" />
        )}
        <div className="min-w-0 flex-1">
          {review.product ? (
            <Link href={`/shop/${review.product._id}`} className="text-sm font-medium hover:underline" target="_blank">
              {review.product.name}
            </Link>
          ) : (
            <p className="text-sm font-medium text-muted">Product no longer available</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Stars value={review.rating} size={12} />
            <span>{review.userName}</span>
            <span>&middot; {format(new Date(review.createdAt), "PPP")}</span>
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck size={11} /> Verified purchase
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDeleteReview}
          aria-label={`Delete ${review.userName}'s review`}
          title="Delete review"
          className="shrink-0 text-muted hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm">{review.comment}</p>

      {review.reply && !isEditing ? (
        <div className="mt-3 rounded border-l-2 border-primary bg-background px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <MessageSquareReply size={12} /> Response from {SITE_NAME}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{review.reply.text}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span>
              {review.reply.repliedByName && `by ${review.reply.repliedByName} · `}
              {format(new Date(review.reply.repliedAt), "PPP")}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="ml-auto flex items-center gap-1 hover:text-foreground"
            >
              <Pencil size={11} /> Edit
            </button>
            <button type="button" onClick={onRemoveReply} className="flex items-center gap-1 hover:text-red-600">
              <Trash2 size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <ReplyEditor
          initialText={review.reply?.text ?? ""}
          onSave={async (text) => {
            const ok = await onReply(text);
            if (ok) setIsEditing(false);
            return ok;
          }}
          onCancel={isEditing ? () => setIsEditing(false) : undefined}
        />
      )}
    </article>
  );
}

export function AdminReviewsView() {
  const { isChecking, isAllowed } = useRequirePermission("reviews:manage");
  const {
    reviews,
    total,
    page,
    totalPages,
    unrepliedCount,
    isLoading,
    status,
    rating,
    setStatus,
    setRating,
    goToPage,
    reply,
    removeReply,
    removeReview,
  } = useAdminReviews();

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const onDeleteReview = async (review: AdminReview) => {
    const confirmed = await confirmDialog(`Delete ${review.userName}'s review? This can't be undone.`, {
      title: "Delete review",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) removeReview(review._id);
  };

  const onRemoveReply = async (review: AdminReview) => {
    const confirmed = await confirmDialog("Remove the store's reply to this review?", {
      title: "Remove reply",
      confirmLabel: "Remove",
      danger: true,
    });
    if (confirmed) removeReply(review._id);
  };

  return (
    <main className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted">
          Reply publicly as {SITE_NAME} — customers see it under their review on the product page.{" "}
          {unrepliedCount > 0 ? `${unrepliedCount} waiting for a reply.` : "All caught up."}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Filter by reply status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded px-3 py-1 text-sm ${
                status === tab.value ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.value === "unreplied" && unrepliedCount > 0 && ` (${unrepliedCount})`}
            </button>
          ))}
        </div>
        <select
          value={rating ?? ""}
          onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
          aria-label="Filter by rating"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        {!isLoading && <span className="ml-auto text-xs text-muted">{total} review{total === 1 ? "" : "s"}</span>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted">
          {status === "unreplied" ? "Every review has a reply." : "No reviews match these filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onReply={(text) => reply(review._id, text)}
              onRemoveReply={() => onRemoveReply(review)}
              onDeleteReview={() => onDeleteReview(review)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
    </main>
  );
}
