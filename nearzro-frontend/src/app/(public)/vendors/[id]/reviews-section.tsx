"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  eventType?: string;
}

interface ReviewsSectionProps {
  venueId: string;
  venueName: string;
  initialRating: number;
}

const MOCK_REVIEWS: Review[] = [
  {
    id: "1",
    author: "Arun Krishnan",
    rating: 5,
    comment: "Stunning venue with excellent facilities! The staff was very helpful and the ambiance was perfect for our wedding reception.",
    date: "3 days ago",
    eventType: "Wedding Reception",
  },
  {
    id: "2",
    author: "Sneha Reddy",
    rating: 5,
    comment: "Perfect venue for our corporate event. Great acoustics, comfortable seating, and the catering was exceptional!",
    date: "1 week ago",
    eventType: "Corporate Event",
  },
  {
    id: "3",
    author: "Priya Sharma",
    rating: 4,
    comment: "Beautiful venue with great amenities. The only minor issue was parking space, but overall a wonderful experience.",
    date: "2 weeks ago",
    eventType: "Birthday Party",
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReviewsSection({ venueId, venueName, initialRating }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : initialRating.toFixed(1);

  const handleSubmitReview = (e: React.FormEvent) => {
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

    const newReview: Review = {
      id: Date.now().toString(),
      author: authorName.trim() || 'Anonymous',
      rating: newRating,
      comment: comment.trim(),
      date: 'Just now',
    };

    setReviews([newReview, ...reviews]);
    setNewRating(0);
    setHoverRating(0);
    setComment("");
    setAuthorName("");
    
    toast.success('Review submitted!', {
      description: 'Thank you for sharing your experience',
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-silver-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-black">Reviews & Ratings</h2>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(parseFloat(averageRating))
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-silver-300'
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-bold text-black">{averageRating}</span>
          <span className="text-sm text-neutral-600">({reviews.length} reviews)</span>
        </div>
      </div>

      {/* Write Review Form */}
      <form onSubmit={handleSubmitReview} className="mb-8 p-4 bg-silver-100 rounded-xl border border-silver-200">
        <h3 className="font-semibold text-black mb-4">Write a Review</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-800 mb-2">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setNewRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || newRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-silver-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-800 mb-2">Your Name (Optional)</label>
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="John Doe"
            className="bg-white"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-800 mb-2">Your Review</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this venue..."
            rows={4}
            className="bg-white"
          />
        </div>

        <Button
          type="submit"
          className="bg-gradient-to-r from-neutral-900 to-black hover:from-neutral-900 hover:to-black"
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Review
        </Button>
      </form>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-black">Recent Reviews</h3>
        {reviews.map((review) => (
          <div key={review.id} className="p-4 bg-silver-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-silver-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-neutral-600">{review.date}</span>
              </div>
            </div>
            <p className="text-neutral-800 mb-3">{review.comment}</p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-silver-300 flex items-center justify-center text-neutral-800 font-bold text-sm">
                {review.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-black text-sm">{review.author}</div>
                {review.eventType && (
                  <div className="text-xs text-neutral-600">{review.eventType}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
