"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Calendar, Users, MapPin, PartyPopper } from "lucide-react";

export default function PlanEventPage() {

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            AI Event Planner
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Tell us about your dream event, and our AI will recommend the perfect venues and vendors.
          </p>
        </div>

        {/* AI Input Section */}
        <Card className="border-purple-200 shadow-lg bg-gradient-to-br from-white to-purple-50 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
              Start Planning
            </CardTitle>
            <CardDescription>
              Fill in the details below to get personalized recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <div className="relative">
                    <PartyPopper className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="eventType" placeholder="e.g., Wedding, Corporate, Birthday" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="city" placeholder="e.g., New York" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="date" type="date" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Guest Count</Label>
                 <div className="relative">
                    <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="guests" type="number" placeholder="100" className="pl-9" />
                 </div>
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="description">Describe your vision (Optional)</Label>
                <Textarea 
                    placeholder="I want a rustic outdoor wedding with lots of flowers and fairy lights..."
                />
            </div>

            <Button size="lg" className="w-full text-lg h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
               <Sparkles className="h-5 w-5 mr-2" />
               Generate Plan
            </Button>
          </CardContent>
        </Card>

        {/* Mock Recommendations (Hidden initially, but shown for visual completeness as if generated) */}
        <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-10 duration-1000">
             <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
             </div>
             
             <div className="grid gap-6 md:grid-cols-3">
                 {/* Placeholder Cards */}
                 {[1, 2, 3].map((i) => (
                     <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
                 ))}
             </div>
        </div>
      </div>
    </div>
  );
}
