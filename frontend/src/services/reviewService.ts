import { api } from "@/lib/api";
import { AdminReview, AdminReviewList, ReviewList, Review, ReviewReplyStatus } from "@/models";

export const getProductReviews = async (productId: string, page = 1): Promise<ReviewList> => {
  const { data } = await api.get<ReviewList>(`/products/${productId}/reviews`, {
    params: { page },
  });
  return data;
};

export const submitReview = async (
  productId: string,
  input: { rating: number; comment: string }
): Promise<Review> => {
  const { data } = await api.post<Review>(`/products/${productId}/reviews`, input);
  return data;
};

// Admin ("reviews:manage") only.
export const deleteReview = async (productId: string, reviewId: string): Promise<void> => {
  await api.delete(`/products/${productId}/reviews/${reviewId}`);
};

// --- Admin Reviews page ("reviews:manage") — across every product ---------

export interface GetAllReviewsParams {
  status: ReviewReplyStatus;
  rating?: number;
  page: number;
}

export const getAllReviews = async ({ status, rating, page }: GetAllReviewsParams): Promise<AdminReviewList> => {
  const { data } = await api.get<AdminReviewList>("/reviews", {
    params: { status: status === "all" ? undefined : status, rating, page },
  });
  return data;
};

// Creates or replaces the store's reply.
export const replyToReview = async (reviewId: string, text: string): Promise<AdminReview> => {
  const { data } = await api.put<AdminReview>(`/reviews/${reviewId}/reply`, { text });
  return data;
};

export const deleteReviewReply = async (reviewId: string): Promise<AdminReview> => {
  const { data } = await api.delete<AdminReview>(`/reviews/${reviewId}/reply`);
  return data;
};

export const deleteReviewById = async (reviewId: string): Promise<void> => {
  await api.delete(`/reviews/${reviewId}`);
};
