"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { StarRating } from "@/components/reviews/star-rating";

interface Review {
  id: number;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  venue?: { name: string } | null;
  vendor?: { name: string } | null;
  event?: { title: string } | null;
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const loadReviews = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = filter === "all" ? {} : { status: filter };
      const config = { params, ...(signal && { signal }) };
      const response = await api.get("/reviews", config);
      const reviewsData = extractArray<Review>(response);
      setReviews(reviewsData);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      console.error("Failed to load reviews:", err);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [filter]);

   useEffect(() => {
     const controller = new AbortController();
     loadReviews(controller.signal);
     return () => controller.abort();
   }, [loadReviews]);

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/reviews/${id}/approve`);
      toast.success("Review approved");
      loadReviews();
    } catch (err: any) {
      console.error("Failed to approve review:", err);
      toast.error("Failed to approve review");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.patch(`/reviews/${id}/reject`);
      toast.success("Review rejected");
      loadReviews();
    } catch (err: any) {
      console.error("Failed to reject review:", err);
      toast.error("Failed to reject review");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      await api.delete(`/reviews/${id}`);
      toast.success("Review deleted");
      loadReviews();
    } catch (err: any) {
      console.error("Failed to delete review:", err);
      toast.error("Failed to delete review");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-950/30 text-amber-400 border-amber-700";
      case "APPROVED":
        return "bg-emerald-950/30 text-emerald-400 border-emerald-700";
      case "REJECTED":
        return "bg-red-950/30 text-red-400 border-red-700";
      default:
        return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
    }
  };

  const getEntityName = (review: Review) => {
    if (review.venue) return `Venue: ${review.venue.name}`;
    if (review.vendor) return `Vendor: ${review.vendor.name}`;
    if (review.event) return `Event: ${review.event.title}`;
    return "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Reviews Moderation</h1>
        <p className="text-zinc-400">Review and approve customer reviews</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "PENDING" ? "default" : "outline"}
          onClick={() => setFilter("PENDING")}
          className={filter === "PENDING" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
        >
          Pending
        </Button>
        <Button
          variant={filter === "APPROVED" ? "default" : "outline"}
          onClick={() => setFilter("APPROVED")}
          className={filter === "APPROVED" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
        >
          Approved
        </Button>
        <Button
          variant={filter === "REJECTED" ? "default" : "outline"}
          onClick={() => setFilter("REJECTED")}
          className={filter === "REJECTED" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
        >
          Rejected
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
        >
          All
        </Button>
      </div>

      {/* Reviews List */}
      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-2">
                {filter === "PENDING" ? "No Pending Reviews" : "No Reviews"}
              </h3>
              <p className="text-zinc-400">
                {filter === "PENDING" 
                  ? "All reviews have been moderated" 
                  : "No reviews found for this filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">
                       {(review.user?.name || "U").charAt(0)}
                     </div>
                     <div>
                       <p className="font-semibold text-zinc-100">{review.user?.name || "Anonymous"}</p>
                       <p className="text-sm text-zinc-400">{review.user?.email || "No email"}</p>
                     </div>
                   </div>
                  <Badge className={getStatusColor(review.status)}>
                    {review.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} readonly size="sm" />
                    <span className="text-sm text-zinc-500">
                      {new Date(review.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  {review.title && (
                    <p className="font-semibold text-zinc-100 mb-2">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-zinc-300">{review.comment}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400">
                    {getEntityName(review)}
                  </p>
                  <div className="flex items-center gap-2">
                    {review.status === "PENDING" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(review.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(review.id)}
                          className="text-red-400 border-red-800 hover:bg-red-950/30"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(review.id)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
