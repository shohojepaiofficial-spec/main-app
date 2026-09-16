"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as reviewService from "@/services/reviewService";
import { Review } from "@/models";

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    reviewService
      .getProductReviews(productId, page)
      .then((data) => {
        if (ignore) return;
        setReviews(data.items);
        setAverage(data.average);
        setTotal(data.total);
        setTotalPages(data.totalPages);
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
  }, [productId, page]);

  const submit = async (input: { rating: number; comment: string }) => {
    setIsSubmitting(true);
    try {
      await reviewService.submitReview(productId, input);
      toast.success("Review submitted");
      // Jump back to page 1 so the just-submitted review is visible (newest-first).
      if (page === 1) {
        const data = await reviewService.getProductReviews(productId, 1);
        setReviews(data.items);
        setAverage(data.average);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        setPage(1);
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (reviewId: string) => {
    const prevReviews = reviews;
    setReviews((current) => current.filter((r) => r._id !== reviewId));
    try {
      await reviewService.deleteReview(productId, reviewId);
      // Refetch rather than just decrementing `total` locally — the average
      // rating changes too (and should disappear entirely once the last
      // review is gone), and this page may no longer have enough items to
      // fill it now that one's removed.
      const data = await reviewService.getProductReviews(productId, page);
      setReviews(data.items);
      setAverage(data.average);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setReviews(prevReviews);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to delete review");
    }
  };

  return { reviews, average, total, page, totalPages, isLoading, isSubmitting, setPage, submit, remove };
}
