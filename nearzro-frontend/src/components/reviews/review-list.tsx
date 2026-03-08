"use client";

import { Star, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: number;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  helpful: number;
  user: {
    name: string;
  };
}

interface ReviewListProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
}

export function ReviewList({ reviews, averageRating, totalReviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-black mb-2">No Reviews Yet</h3>
        <p className="text-neutral-600">Be the first to review this</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {averageRating !== undefined && totalReviews !== undefined && (
        <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-silver-50 to-white rounded-lg border border-silver-200">
          <div className="text-center">
            <p className="text-4xl font-bold text-black">{averageRating.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-neutral-600">{totalReviews} reviews</p>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="p-6 rounded-lg border border-neutral-200 hover:border-black transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center">
                  <User className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="font-semibold text-black">{review.user.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-neutral-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-600">
                      {new Date(review.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
              {review.helpful > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  👍 {review.helpful} helpful
                </Badge>
              )}
            </div>

            {review.title && (
              <p className="font-semibold text-black mb-2">{review.title}</p>
            )}

            {review.comment && (
              <p className="text-neutral-700 leading-relaxed">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
