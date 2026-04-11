"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, ThumbsUp, ThumbsDown, MessageSquare, Filter,
  CheckCircle2, AlertCircle, Clock, TrendingUp, RefreshCw, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  customerName: string;
  serviceName: string;
  createdAt: string;
  isApproved: boolean;
  hasVendorResponse: boolean;
  helpful: number;
  notHelpful: number;
}

export default function VendorReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const loadReviews = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      // Load reviews from real API
      const reviewsRes = await api.get('/vendors/reviews/me').catch(() => ({ data: { reviews: [] } }));
      const reviewsData = reviewsRes.data?.reviews || reviewsRes.data || [];

      // Transform API data to frontend format
      const transformedReviews: Review[] = Array.isArray(reviewsData)
        ? reviewsData.map((review: any) => ({
            id: review.id,
            rating: review.rating,
            title: review.title || `Review for ${review.vendorService?.name || 'Service'}`,
            comment: review.comment,
            customerName: review.customer?.name || 'Customer',
            serviceName: review.vendorService?.name || 'Service',
            createdAt: review.createdAt,
            isApproved: review.status === 'APPROVED',
            hasVendorResponse: !!review.vendorResponse || !!review.response || !!review.vendorReply,
            helpful: review.helpfulCount || 0,
            notHelpful: review.notHelpfulCount || 0,
          }))
        : [];

      setReviews(transformedReviews);

      if (showRefresh) {
        toast.success("Reviews refreshed");
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleRefresh = () => {
    loadReviews(true);
  };

  const handleReplyClick = (review: Review) => {
    setSelectedReview(review);
    setReplyDialogOpen(true);
  };

  const handleReplySubmit = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      setReplyLoading(true);
      // Note: Backend endpoint for vendor review responses may need to be implemented
      // For now, this is a placeholder for future implementation
      await api.post('/vendors/reviews/me/response', {
        reviewId: selectedReview.id,
        response: replyText,
      });

      toast.success("Reply posted successfully");
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedReview(null);
      loadReviews();
    } catch (error: any) {
      toast.error("Failed to post reply", {
        description: error?.response?.data?.message || "Please try again"
      });
    } finally {
      setReplyLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesRating = filterRating === "all" || review.rating === parseInt(filterRating);
    const matchesStatus = filterStatus === "all" || (filterStatus === "approved" && review.isApproved) || (filterStatus === "pending" && !review.isApproved);
    return matchesRating && matchesStatus;
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter(r => r.isApproved).length;
  // Calculate response rate from real data
  const responseRate = reviews.length > 0
    ? Math.round((reviews.filter(r => r.hasVendorResponse).length / reviews.length) * 100)
    : 0;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Customer Reviews</h1>
          <p className="text-neutral-600 mt-1">Manage and respond to customer feedback</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid gap-6 md:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-bold text-black">{averageRating}</p>
                  <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                </div>
                <p className="text-xs text-neutral-500 mt-2">Based on {totalReviews} reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Reviews</p>
                <p className="text-3xl font-bold text-black mt-1">{totalReviews}</p>
                <p className="text-xs text-neutral-500 mt-2">All time</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Approved</p>
                <p className="text-3xl font-bold text-black mt-1">{approvedReviews}</p>
                <p className="text-xs text-neutral-500 mt-2">Visible on profile</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Response Rate</p>
                <p className="text-3xl font-bold text-black mt-1">{responseRate}%</p>
                <p className="text-xs text-neutral-500 mt-2">To customer reviews</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-black">Filters:</span>
              </div>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-black text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-black text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reviews List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-black">Customer Reviews ({filteredReviews.length})</CardTitle>
            <CardDescription className="text-neutral-600">Read and respond to customer feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No reviews yet</h3>
                <p className="text-neutral-600">Reviews will appear here once customers start rating your services</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-black font-bold">
                          {review.customerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-black">{review.customerName}</h4>
                          <p className="text-sm text-neutral-600">{review.serviceName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-5 w-5",
                              i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-neutral-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-semibold text-black mb-2">{review.title}</h5>
                      <p className="text-neutral-700">{review.comment}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {review.helpful}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="h-4 w-4" />
                          {review.notHelpful}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={review.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {review.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReplyClick(review)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Respond to {selectedReview?.customerName}'s review
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <p className="text-sm font-medium text-neutral-600 mb-2">Review</p>
              <p className="text-sm text-black">{selectedReview?.comment}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Your Reply</label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a professional response..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)} disabled={replyLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleReplySubmit}
              disabled={replyLoading || !replyText.trim()}
              className="bg-black hover:bg-neutral-800 text-white"
            >
              {replyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
