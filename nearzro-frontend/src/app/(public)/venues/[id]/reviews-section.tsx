"use client";

import React, { useState, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";
import DOMPurify from 'dompurify';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  eventType?: string;
  title?: string;
}

interface ReviewsSectionProps {
  venueId: string;
  venueName: string;
  initialRating: number;
}

export function ReviewsSection({ venueId, venueName, initialRating }: ReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");

  // Fetch real reviews from backend on mount
  useEffect(() => {
    loadReviews();
  }, [venueId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reviews/venue/${venueId}`, {
        params: { approved: true },
      });
      const data = response.data || [];
      const mappedReviews = data.map((r: any) => ({
        id: String(r.id),
        author: r.user?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comment || '',
        title: r.title || '',
        date: formatDate(r.createdAt),
      }));
      setReviews(mappedReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : initialRating.toFixed(1);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in to submit a review', {
        description: 'You must be logged in to write a review',
      });
      return;
    }

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
    try {
      await api.post('/reviews', {
        venueId: parseInt(venueId, 10),
        rating: newRating,
        title: title.trim() || `${venueName} Review`,
        comment: comment.trim(),
      });

      toast.success('Review submitted!', {
        description: 'Thank you for sharing your experience. It will appear after approval.',
      });

      setNewRating(0);
      setHoverRating(0);
      setComment("");
      setTitle("");

      // Reload reviews to include the new one
      await loadReviews();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to submit review';
      toast.error('Submission failed', { description: Array.isArray(message) ? message.join(', ') : message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium tracking-tight text-white">Reviews & Ratings</h2>
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
          <span className="text-lg font-medium text-white">{averageRating}</span>
          <span className="text-sm text-zinc-500">({reviews.length} reviews)</span>
        </div>
      </div>

      {/* Write Review Form */}
      <form onSubmit={handleSubmitReview} className="mb-8 p-4 bg-white/[0.05] rounded-xl border border-white/[0.05]">
        <h3 className="font-medium text-white mb-4">Write a Review</h3>

        {!isAuthenticated && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-400">You must be logged in to submit a review.</p>
          </div>
        )}

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
          <label className="block text-sm font-medium text-zinc-300 mb-2">Review Title (Optional)</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            className="bg-black/40 border-white/[0.1] text-white placeholder:text-zinc-500"
            disabled={submitting}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Your Review</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this venue..."
            rows={4}
            className="bg-black/40 border-white/[0.1] text-white placeholder:text-zinc-500"
            disabled={submitting}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="bg-zinc-100 text-zinc-950 hover:bg-white font-semibold rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Review
            </>
          )}
        </Button>
      </form>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-medium text-white">Recent Reviews</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No reviews yet</h4>
            <p className="text-zinc-500">Be the first to review this venue</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
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
                  <span className="text-sm text-zinc-500">{review.date}</span>
                </div>
              </div>
               {review.title && (
                 <p className="font-medium text-white text-sm mb-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.title) }}></p>
               )}
               <p className="text-zinc-300 mb-3" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.comment) }}></p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                  {review.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white text-sm">{review.author}</div>
                  {review.eventType && (
                    <div className="text-xs text-zinc-500">{review.eventType}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
