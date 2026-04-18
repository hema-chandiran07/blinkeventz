"use client";

import React, { useState, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface Review {
  id: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    image?: string;
  };
}

interface ReviewsSectionProps {
  vendorId: string;
  vendorName: string;
  initialRating: number;
}

export function ReviewsSection({ vendorId, vendorName, initialRating }: ReviewsSectionProps): React.ReactElement {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/reviews/vendor/${vendorId}?approved=true`);
        const data = response.data || [];
        setReviews(data);
      } catch (error) {
        console.warn('Could not fetch reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [vendorId]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : initialRating.toFixed(1);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newRating === 0) {
      toast.error('Please select a rating', {
        description: 'Select at least 1 star to submit your review',
      });
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please write a comment', {
        description: 'Share your experience with others',
      });
      return;
    }

    setSubmitting(true);

    const newReviewData = {
      vendorId: parseInt(vendorId, 10),
      rating: newRating,
      comment: comment.trim(),
    };

    try {
      await api.post('/reviews', newReviewData);
      
      const optimisticReview: Review = {
        id: Date.now(),
        userId: Number(user?.id) || 0,
        rating: newRating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        user: {
          id: Number(user?.id) || 0,
          name: authorName.trim() || user?.name || 'Anonymous',
        },
      };

      setReviews(prevReviews => [optimisticReview, ...prevReviews]);
      setNewRating(0);
      setHoverRating(0);
      setComment("");
      setAuthorName("");
      
      toast.success('Review submitted!', {
        description: 'Thank you for sharing your experience',
      });
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already reviewed')) {
        toast.error('You have already reviewed this vendor');
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">Reviews & Ratings</h2>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(parseFloat(averageRating))
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-zinc-600'
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-bold text-zinc-100">{averageRating}</span>
          <span className="text-sm text-zinc-500">({reviews.length} reviews)</span>
        </div>
      </div>

      {/* Write Review Form - Any authenticated user can write */}
      {isAuthenticated && (
        <form onSubmit={handleSubmitReview} className="mb-8 p-4 bg-zinc-900/30 rounded-xl border border-white/5">
          <h3 className="font-semibold text-zinc-100 mb-4">Write a Review</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                  disabled={submitting}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || newRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Your Name </label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="John Doe"
              className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              disabled={submitting}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Your Review</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this vendor..."
              rows={4}
              className="bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              disabled={submitting}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Review
          </Button>
        </form>
      )}

      {!isAuthenticated && (
        <div className="mb-8 p-4 bg-zinc-900/30 rounded-xl border border-white/5 text-center">
          <p className="text-zinc-400">Please login to write a review.</p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-0">
        <h3 className="font-semibold text-zinc-100 mb-4">Recent Reviews</h3>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-zinc-500 text-center p-4">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="py-4 border-b border-white/5 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-zinc-500">{formatDate(review.createdAt)}</span>
                </div>
              </div>
              {review.title && <h4 className="font-semibold text-zinc-100 mb-1">{review.title}</h4>}
              <p className="text-zinc-300 mb-3">{review.comment}</p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-sm">
                  {review.user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">{review.user?.name || 'Anonymous'}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}