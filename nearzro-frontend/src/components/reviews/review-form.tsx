"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";
import { X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ReviewFormProps {
  entityType: "venue" | "vendor" | "event";
  entityId: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function ReviewForm({ entityType, entityId, onSuccess, onClose }: ReviewFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    comment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!formData.title.trim() || !formData.comment.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        rating: formData.rating,
        title: formData.title,
        comment: formData.comment,
      };

      if (entityType === "venue") payload.venueId = entityId;
      if (entityType === "vendor") payload.vendorId = entityId;
      if (entityType === "event") payload.eventId = entityId;

      await api.post("/reviews", payload);
      toast.success("Review submitted! It will appear after approval.");
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error: any) {
      console.error("Submit review error:", error);
      toast.error(error?.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-black">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Write a Review</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black font-medium">Rating *</Label>
            <StarRating
              rating={formData.rating}
              onRatingChange={(rating) => setFormData({ ...formData, rating })}
              size="lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-black font-medium">
              Review Title *
            </Label>
            <Input
              id="title"
              placeholder="Summarize your experience"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="border-neutral-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-black font-medium">
              Your Review *
            </Label>
            <Textarea
              id="comment"
              placeholder="Share details of your experience..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="border-neutral-300"
              rows={4}
            />
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full bg-black hover:bg-neutral-800"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
