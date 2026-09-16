import { api } from "@/lib/api";
import { ReviewList, Review } from "@/models";

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
