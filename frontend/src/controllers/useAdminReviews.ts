"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as reviewService from "@/services/reviewService";
import { AdminReview, ReviewReplyStatus } from "@/models";

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

// The admin Reviews page: every review across the store, defaulting to the
// ones still waiting on a store reply.
export function useAdminReviews() {
  const [status, setStatusState] = useState<ReviewReplyStatus>("unreplied");
  const [rating, setRatingState] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unrepliedCount, setUnrepliedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped to refetch the current page after a change that can move a
  // review in or out of it (a reply under "Needs a reply", a delete).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    reviewService
      .getAllReviews({ status, rating, page })
      .then((data) => {
        if (ignore) return;
        setReviews(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setUnrepliedCount(data.unrepliedCount);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load reviews");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [status, rating, page, reloadKey]);

  // Changing a filter starts back at page 1.
  const setStatus = (next: ReviewReplyStatus) => {
    setIsLoading(true);
    setStatusState(next);
    setPage(1);
  };
  const setRating = (next: number | undefined) => {
    setIsLoading(true);
    setRatingState(next);
    setPage(1);
  };
  const goToPage = (next: number) => {
    setIsLoading(true);
    setPage(next);
  };

  // Returns whether it saved, so the view can close its editor only then.
  const reply = async (reviewId: string, text: string): Promise<boolean> => {
    try {
      const updated = await reviewService.replyToReview(reviewId, text);
      const wasUnreplied = !reviews.find((r) => r._id === reviewId)?.reply;
      setReviews((prev) => prev.map((r) => (r._id === reviewId ? updated : r)));
      if (wasUnreplied) {
        setUnrepliedCount((n) => Math.max(0, n - 1));
        toast.success("Reply posted");
      } else {
        toast.success("Reply updated");
      }
      // Under "Needs a reply" the answered review no longer belongs — it's
      // left visible (showing its new reply) until the next load, rather
      // than vanishing from under the admin's cursor.
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save reply"));
      return false;
    }
  };

  const removeReply = async (reviewId: string) => {
    try {
      const updated = await reviewService.deleteReviewReply(reviewId);
      setReviews((prev) => prev.map((r) => (r._id === reviewId ? updated : r)));
      setUnrepliedCount((n) => n + 1);
      toast.success("Reply removed");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove reply"));
    }
  };

  const removeReview = async (reviewId: string) => {
    try {
      await reviewService.deleteReviewById(reviewId);
      toast.success("Review deleted");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete review"));
    }
  };

  return {
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
  };
}
