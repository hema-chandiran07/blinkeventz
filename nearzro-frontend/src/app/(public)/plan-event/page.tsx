"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MapPin, Users, PartyPopper, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

export default function PlanEventPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<{
    eventType: string;
    city: string;
    area: string;
    guestCount: string;
    budget: string;
  }>({
    eventType: "",
    city: "",
    area: "",
    guestCount: "",
    budget: "",
  });
  const [aiPlan, setAiPlan] = useState<any>(null);

  const handleGeneratePlan = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to use AI Planner");
      router.push("/login");
      return;
    }

    if (!plan.eventType || !plan.city || !plan.area || !plan.guestCount || !plan.budget) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/ai-planner/generate", {
        eventType: plan.eventType,
        city: plan.city,
        area: plan.area,
        guestCount: parseInt(plan.guestCount),
        budget: parseInt(plan.budget),
      });

      setAiPlan(response.data);
      toast.success("AI plan generated successfully!");
    } catch (error: any) {
      console.error("AI Plan error:", error);
      toast.error(error?.response?.data?.message || "Failed to generate plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPlan = () => {
    if (aiPlan?.id) {
      router.push(`/venues?ai-plan=${aiPlan.id}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-black mb-4 flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-neutral-800" />
            AI Event Planner
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Tell us about your dream event, and our AI will recommend the perfect venues and vendors.
          </p>
        </div>

        {/* AI Input Section */}
        <Card className="border-silver-200 shadow-lg bg-gradient-to-br from-white to-silver-50 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Sparkles className="h-6 w-6 text-neutral-800 mr-2" />
              Start Planning
            </CardTitle>
            <CardDescription>
              Fill in the details below to get personalized recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <div className="relative">
                  <PartyPopper className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
                  <Input
                    id="eventType"
                    placeholder="e.g., Wedding, Corporate, Birthday"
                    className="pl-9"
                    value={plan.eventType}
                    onChange={(e) => setPlan({ ...plan, eventType: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
                  <Input
                    id="city"
                    placeholder="e.g., Chennai"
                    className="pl-9"
                    value={plan.city}
                    onChange={(e) => setPlan({ ...plan, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area *</Label>
                <Input
                  id="area"
                  placeholder="e.g., T Nagar, Velachery"
                  value={plan.area}
                  onChange={(e) => setPlan({ ...plan, area: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Guest Count *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
                  <Input
                    id="guests"
                    type="number"
                    placeholder="100"
                    className="pl-9"
                    value={plan.guestCount}
                    onChange={(e) => setPlan({ ...plan, guestCount: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹) *</Label>
              <Input
                id="budget"
                type="number"
                placeholder="500000"
                value={plan.budget}
                onChange={(e) => setPlan({ ...plan, budget: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Describe your vision (Optional)</Label>
              <Textarea
                placeholder="I want a rustic outdoor wedding with lots of flowers and fairy lights..."
                rows={4}
              />
            </div>

            <Button
              size="lg"
              variant="premium"
              className="w-full text-lg h-12"
              onClick={handleGeneratePlan}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate AI Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* AI Plan Results */}
        {aiPlan && (
          <Card className="border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl text-green-800">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                Your AI-Powered Event Plan
              </CardTitle>
              <CardDescription className="text-green-700">
                Based on your requirements for {plan.eventType} in {plan.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-sm text-neutral-600">Recommended Budget Allocation</p>
                  <p className="text-2xl font-bold text-neutral-900">₹{parseInt(plan.budget).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-sm text-neutral-600">Guest Count</p>
                  <p className="text-2xl font-bold text-neutral-900">{plan.guestCount} people</p>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-sm text-neutral-600">Location</p>
                  <p className="text-lg font-bold text-neutral-900">{plan.area}, {plan.city}</p>
                </div>
              </div>

              {aiPlan.planJson?.allocations && aiPlan.planJson.allocations.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Budget Breakdown</h3>
                  <div className="space-y-2">
                    {aiPlan.planJson.allocations.map((allocation: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                        <span className="font-medium">{allocation.category}</span>
                        <span className="text-lg font-bold">₹{allocation.amount?.toLocaleString() || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">AI Plan Generated</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Your plan has been saved. Browse venues and vendors that match your budget.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  variant="premium"
                  className="flex-1 h-12"
                  onClick={handleAcceptPlan}
                >
                  Browse Recommended Venues
                </Button>
                <Button
                  variant="silver"
                  className="flex-1 h-12"
                  onClick={handleGeneratePlan}
                  disabled={isLoading}
                >
                  Regenerate Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
