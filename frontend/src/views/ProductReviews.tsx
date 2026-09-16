"use client";

import { useState } from "react";
import { Star, ShieldCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuthController } from "@/controllers/useAuthController";
import { useUIStore } from "@/controllers/useUIStore";
import { useProductReviews } from "@/controllers/useProductReviews";
import { Pagination } from "@/views/Pagination";
import { confirmDialog } from "@/lib/confirm";

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? "fill-primary text-primary" : "text-border"}
        />
      ))}
    </div>
  );
}

function ReviewForm({ onSubmit, isSubmitting }: { onSubmit: (rating: number, comment: string) => void; isSubmitting: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        onSubmit(rating, comment.trim());
        setComment("");
      }}
      className="rounded-md border border-border bg-surface p-4"
    >
      <p className="mb-2 text-sm font-medium">Leave a review</p>
      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`Rate ${n} out of 5`}
            className="p-0.5"
          >
            <Star size={22} className={n <= rating ? "fill-primary text-primary" : "text-border"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Share your thoughts about this product..."
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isSubmitting || !comment.trim()}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { isAuthenticated, hasPermission } = useAuthController();
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const canModerate = hasPermission("reviews:manage");
  const { reviews, average, total, page, totalPages, isLoading, isSubmitting, setPage, submit, remove } =
    useProductReviews(productId);

  const onDelete = async (reviewId: string) => {
    const confirmed = await confirmDialog("Delete this review? This can't be undone.", {
      title: "Delete review",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(reviewId);
  };

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-10 scroll-mt-24 border-t border-border pt-8">
      <div className="mb-4 flex items-center gap-3">
        <h2 id="reviews-heading" className="text-lg font-semibold">
          Reviews
        </h2>
        {average !== null && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Stars value={average} />
            <span>
              {average.toFixed(1)} ({total} review{total === 1 ? "" : "s"})
            </span>
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <div className="mb-6">
          <ReviewForm onSubmit={(rating, comment) => submit({ rating, comment })} isSubmitting={isSubmitting} />
        </div>
      ) : (
        <div className="mb-6 rounded-md border border-dashed border-border p-4 text-sm text-muted">
          <button onClick={() => openAuthModal("login")} className="text-foreground underline">
            Sign in
          </button>{" "}
          to leave a review.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet — be the first to share your thoughts.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-border pb-4 last:border-b-0">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-medium">{review.userName}</p>
                <Stars value={review.rating} size={13} />
                {review.isVerifiedPurchase && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <ShieldCheck size={11} /> Verified purchase
                  </span>
                )}
                {canModerate && (
                  <button
                    onClick={() => onDelete(review._id)}
                    aria-label="Delete review"
                    className="ml-auto text-muted hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mb-1">
                {format(new Date(review.createdAt), "PPP")}
              </p>
              <p className="text-sm">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}
