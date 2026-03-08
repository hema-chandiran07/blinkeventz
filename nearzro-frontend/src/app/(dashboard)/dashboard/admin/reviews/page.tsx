"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { StarRating } from "@/components/reviews/star-rating";
import { ReviewList } from "@/components/reviews/review-list";

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

  useEffect(() => {
    loadReviews();
  }, [filter]);

  const loadReviews = async () => {
    try {
      const params = filter === "all" ? {} : { status: filter };
      const response = await api.get("/reviews/admin/all", { params });
      setReviews(response.data || []);
    } catch (error: any) {
      console.error("Failed to load reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/reviews/${id}/approve`);
      toast.success("Review approved");
      loadReviews();
    } catch (error: any) {
      toast.error("Failed to approve review");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.patch(`/reviews/${id}/reject`);
      toast.success("Review rejected");
      loadReviews();
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error("Failed to delete review");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
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
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Reviews Moderation</h1>
        <p className="text-neutral-600">Review and approve customer reviews</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "PENDING" ? "default" : "outline"}
          onClick={() => setFilter("PENDING")}
          className={filter === "PENDING" ? "bg-black" : "border-black"}
        >
          Pending
        </Button>
        <Button
          variant={filter === "APPROVED" ? "default" : "outline"}
          onClick={() => setFilter("APPROVED")}
          className={filter === "APPROVED" ? "bg-black" : "border-black"}
        >
          Approved
        </Button>
        <Button
          variant={filter === "REJECTED" ? "default" : "outline"}
          onClick={() => setFilter("REJECTED")}
          className={filter === "REJECTED" ? "bg-black" : "border-black"}
        >
          Rejected
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-black" : "border-black"}
        >
          All
        </Button>
      </div>

      {/* Reviews List */}
      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-bold text-black mb-2">
                {filter === "PENDING" ? "No Pending Reviews" : "No Reviews"}
              </h3>
              <p className="text-neutral-600">
                {filter === "PENDING" 
                  ? "All reviews have been moderated" 
                  : "No reviews found for this filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="border-2 border-neutral-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center">
                      {review.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-black">{review.user.name}</p>
                      <p className="text-sm text-neutral-600">{review.user.email}</p>
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
                    <span className="text-sm text-neutral-600">
                      {new Date(review.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  {review.title && (
                    <p className="font-semibold text-black mb-2">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-neutral-700">{review.comment}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-neutral-600">
                    {getEntityName(review)}
                  </p>
                  <div className="flex items-center gap-2">
                    {review.status === "PENDING" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(review.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(review.id)}
                          className="text-red-600 hover:bg-red-50"
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
                      className="text-neutral-600"
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
