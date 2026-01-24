import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Star, Calendar } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-purple-900 py-24 sm:py-32">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 mix-blend-multiply" />
          {/* Placeholder for hero image */}
          <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2098&q=80')] bg-cover bg-center" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            Plan Your Dream Event <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">
              With Confidence
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-purple-100">
            Discover top-rated venues, trusted vendors, and AI-powered planning tools all in one place.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/plan-event">
              <Button size="lg" className="text-lg px-8">
                Start Planning
              </Button>
            </Link>
            <Link href="/venues">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Browse Venues
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { name: "Venues", icon: MapPin, color: "bg-pink-100 text-pink-600" },
            { name: "Catering", icon: Star, color: "bg-purple-100 text-purple-600" },
            { name: "Photography", icon: Calendar, color: "bg-blue-100 text-blue-600" },
            { name: "Decor", icon: Star, color: "bg-yellow-100 text-yellow-600" },
          ].map((category) => (
            <Card key={category.name} className="hover:shadow-lg transition-shadow cursor-pointer border-none shadow-sm">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${category.color}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Venues */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Venues</h2>
          <Link href="/venues" className="flex items-center text-purple-600 hover:text-purple-700 font-medium">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden hover:shadow-lg transition-all">
              <div className="h-48 bg-gray-200 w-full object-cover" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">Grand Ballroom {i}</h3>
                  <div className="flex items-center text-yellow-500 text-sm">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ml-1">4.8</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-4 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" /> New York, NY
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-600">₹2,500 <span className="text-sm font-normal text-gray-500">/ day</span></span>
                  <Button size="sm" variant="outline">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-16 text-center shadow-xl sm:px-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Plan Your Perfect Event?
          </h2>
          <p className="mx-auto max-w-2xl text-purple-100 mb-8 text-lg">
            Join thousands of happy customers who planned their weddings, corporate events, and parties with BlinkEventz.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 bg-white text-purple-600 hover:bg-gray-100">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
