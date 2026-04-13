"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, MessageSquare, TrendingUp, Users, CheckCircle2,
  Clock, AlertCircle, Loader2, Search, Filter, Send, X
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface Review {
  id: number;
  venueName: string;
  venueCity: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  helpful: number;
  response?: string;
  respondedAt?: string;
}

interface ReviewAnalytics {
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  responseRate: number;
}

// ==================== Constants ====================
const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 border-green-300",
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
};

// ==================== Main Component ====================
export default function VenueReviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Load reviews from backend API
  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);

      const reviewsResponse = await api.get("/venues/reviews/me", {
        params: {
          status: statusFilter !== "all" ? statusFilter : undefined,
          rating: ratingFilter !== "all" ? ratingFilter : undefined,
        },
      });

      if (reviewsResponse.data) {
        setReviews(reviewsResponse.data.reviews || []);
        setAnalytics(reviewsResponse.data.analytics || null);
      }
    } catch (error: any) {
      console.error("Failed to load reviews:", error);
      if (error?.response?.status !== 404) {
        toast.error(error?.response?.data?.message || "Failed to load reviews");
      }
      setReviews([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ratingFilter]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENUE_OWNER") {
      router.push("/login");
      return;
    }
    loadReviews();
  }, [isAuthenticated, user, router, loadReviews]);

  // Submit reply to review
  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    if (replyText.trim().length < 10) {
      toast.error("Reply must be at least 10 characters");
      return;
    }

    setReplying(true);
    try {
      await api.post("/venues/reviews/me/response", {
        reviewId: selectedReview.id,
        response: replyText.trim(),
      });

      toast.success("Reply posted successfully!");
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedReview(null);
      loadReviews();
    } catch (error: any) {
      console.error("Failed to post reply:", error);
      toast.error(error?.response?.data?.message || "Failed to post reply");
    } finally {
      setReplying(false);
    }
  };

  const openReplyDialog = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.response || "");
    setReplyDialogOpen(true);
  };

  const renderStars = (rating: number, size: string = "h-4 w-4") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              size,
              star <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
            )}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.venueName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Reviews & Ratings</h1>
          <p className="text-neutral-600">Manage customer reviews and respond to feedback</p>
        </div>
        <Button variant="outline" onClick={loadReviews}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Analytics Cards */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-4"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Reviews</p>
                  <p className="text-3xl font-bold text-black mt-1">{analytics.totalReviews}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Average Rating</p>
                  <p className="text-3xl font-bold text-amber-500 mt-1">{analytics.averageRating}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <Star className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Response Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{analytics.responseRate}%</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Pending</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{analytics.pendingReviews}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Rating Distribution */}
      {analytics && analytics.totalReviews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = analytics.ratingDistribution[star] || 0;
                const percentage = analytics.totalReviews > 0 ? (count / analytics.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-black">{star}</span>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-neutral-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-black" />
              <span className="text-sm font-medium text-black">Filters:</span>
            </div>
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-black"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all" className="text-black">All Status</option>
              <option value="APPROVED" className="text-black">Approved</option>
              <option value="PENDING" className="text-black">Pending</option>
              <option value="REJECTED" className="text-black">Rejected</option>
            </select>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
            >
              <option value="all" className="text-black">All Ratings</option>
              <option value="5" className="text-black">5 Stars</option>
              <option value="4" className="text-black">4 Stars</option>
              <option value="3" className="text-black">3 Stars</option>
              <option value="2" className="text-black">2 Stars</option>
              <option value="1" className="text-black">1 Star</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Customer Reviews</CardTitle>
          <CardDescription className="text-neutral-600">
            {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No reviews found</h3>
              <p className="text-neutral-600">
                {searchTerm || statusFilter !== "all" || ratingFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Reviews will appear here once customers leave feedback"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl border border-neutral-200 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(review.rating)}
                        <Badge className={STATUS_COLORS[review.status]}>
                          {review.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-black">{review.title}</p>
                      <p className="text-sm text-neutral-600 mt-1">{review.comment}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {review.customerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(review.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {review.venueName}
                        </span>
                      </div>

                      {/* Review Response */}
                      {review.response && (
                        <div className="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                          <p className="text-xs font-medium text-black mb-1">Your Response:</p>
                          <p className="text-sm text-neutral-600">{review.response}</p>
                          {review.respondedAt && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Responded on {formatDate(review.respondedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReplyDialog(review)}
                      className="text-black"
                    >
                      {review.response ? "Edit Reply" : "Reply"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      {replyDialogOpen && selectedReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">
                  {selectedReview.response ? "Edit Reply" : "Reply to Review"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReplyDialogOpen(false)}
                  className="hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Original Review */}
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating, "h-3 w-3")}
                  <span className="text-xs text-neutral-500">{selectedReview.venueName}</span>
                </div>
                <p className="font-medium text-black">{selectedReview.title}</p>
                <p className="text-sm text-neutral-600 mt-1">{selectedReview.comment}</p>
              </div>

              {/* Reply Form */}
              <div className="space-y-2">
                <Label htmlFor="reply" className="text-black">Your Response</Label>
                <Textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response to this review..."
                  rows={5}
                  className="resize-none bg-white text-black border-neutral-300"
                />
                <p className="text-xs text-neutral-500">
                  {replyText.length} character{replyText.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setReplyDialogOpen(false)}
                disabled={replying}
                className="flex-1 text-black"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReply}
                disabled={replying || !replyText.trim()}
                className="flex-1 bg-black hover:bg-neutral-800 text-white"
              >
                {replying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Reply
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
