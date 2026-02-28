"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Star, Calendar, Sparkles, CheckCircle, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Generate particle data with fixed seed-like values to avoid hydration mismatch
const PARTICLE_SEEDS = [
  { x: 15, y: 20, duration: 4, delay: 0.5, floatY: -80 },
  { x: 35, y: 45, duration: 5, delay: 1.0, floatY: -90 },
  { x: 55, y: 30, duration: 4.5, delay: 0.8, floatY: -70 },
  { x: 75, y: 60, duration: 3.5, delay: 1.2, floatY: -85 },
  { x: 25, y: 70, duration: 4.2, delay: 0.3, floatY: -75 },
  { x: 85, y: 15, duration: 3.8, delay: 1.5, floatY: -95 },
  { x: 45, y: 80, duration: 4.8, delay: 0.6, floatY: -65 },
  { x: 65, y: 50, duration: 3.2, delay: 1.8, floatY: -88 },
];

export default function LandingPage() {
  const particles = useMemo(() => PARTICLE_SEEDS, []);

  return (
    <div className="flex flex-col space-y-16 pb-16">
      {/* Hero Section - Premium Black & Silver */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Background with premium black/silver gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-silver-950 to-black" />

        {/* Animated silver background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(192,192,192,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(192,192,192,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(169,169,169,0.15),transparent_40%)]" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        {/* Hero Image with overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="h-full w-full bg-[url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2098&q=80')] bg-cover bg-center"
            style={{ opacity: 0.4 }}
          />
          {/* Gradient overlay with silver tint */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-silver-950/70 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-silver-900/50" />
        </div>

        {/* Floating silver particles */}
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
          {particles.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-gradient-to-r from-silver-300 to-silver-500 rounded-full shadow-lg shadow-silver-400/50"
              initial={{
                x: `${particle.x}%`,
                y: `${particle.y}%`,
                opacity: 0
              }}
              animate={{
                y: [null, particle.floatY],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay
              }}
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
            />
          ))}
        </div>

        {/* Silver shimmer effect */}
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-silver-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-silver-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <motion.div
          className="container relative z-20 mx-auto px-4 text-center sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Enhanced badge with silver */}
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-silver-800/50 to-silver-700/50 backdrop-blur-md border border-silver-600/30 mb-6 shadow-lg shadow-black/20">
              <Sparkles className="h-4 w-4 text-silver-300" />
              <span className="text-sm font-medium text-silver-200">Premium Event Planning Platform</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            Plan Your Dream Event <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-silver-200 via-white to-silver-300 drop-shadow-md">
              With Confidence
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-silver-300 drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Discover top-rated venues, trusted vendors, and AI-powered planning tools all in one place.
          </motion.p>

          <motion.div
            className="mt-10 flex justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <Link href="/plan-event">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="premium" className="text-lg px-8">
                  Start Planning
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/venues">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="outline" className="text-lg px-8 bg-silver-900/50 backdrop-blur-sm border-silver-600 text-white hover:bg-silver-800 hover:border-silver-500">
                  Browse Venues
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section - Premium Black & Silver */}
      <motion.section
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            Everything You Need
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-silver-500 via-silver-400 to-silver-500 mx-auto mb-12 rounded-full shadow-md shadow-silver-500/30" />
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-6 md:grid-cols-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {[
            { name: "Venues", icon: MapPin, color: "from-silver-700 via-silver-600 to-silver-700" },
            { name: "Catering", icon: Star, color: "from-silver-700 via-silver-600 to-silver-700" },
            { name: "Photography", icon: Calendar, color: "from-silver-700 via-silver-600 to-silver-700" },
            { name: "Decor", icon: Sparkles, color: "from-silver-700 via-silver-600 to-silver-700" },
          ].map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 cursor-pointer border-silver-800 hover:border-silver-600 hover:-translate-y-2 bg-gradient-to-br from-silver-900/50 via-silver-900 to-silver-950">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <motion.div
                    className={`h-16 w-16 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${category.color} shadow-xl shadow-black/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-silver-500/20 transition-all duration-300`}
                    whileHover={{ rotate: 5 }}
                  >
                    <category.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-silver-300 transition-colors">{category.name}</h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Why Choose Us Section */}
      <motion.section
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="text-3xl font-bold text-white">Why Choose BlinkEventz</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-silver-500 via-silver-400 to-silver-500 mt-2 rounded-full shadow-md shadow-silver-500/30" />
          </div>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {[
            { icon: Zap, title: "Lightning Fast", desc: "Plan your event in minutes with our intuitive platform" },
            { icon: Shield, title: "Secure & Trusted", desc: "Your data and payments are protected with enterprise-grade security" },
            { icon: CheckCircle, title: "Verified Partners", desc: "All venues and vendors are thoroughly vetted for quality" },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Card className="group overflow-hidden hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 border-silver-800 hover:border-silver-600 hover:-translate-y-2 bg-gradient-to-br from-silver-900/50 via-silver-900 to-silver-950">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-silver-600 to-silver-800 flex items-center justify-center mb-4 shadow-lg shadow-black/30 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-silver-300 transition-colors">{feature.title}</h3>
                  <p className="text-silver-400">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Featured Venues - Premium Black & Silver */}
      <motion.section
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="text-3xl font-bold text-white">Featured Venues</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-silver-500 via-silver-400 to-silver-500 mt-2 rounded-full shadow-md shadow-silver-500/30" />
          </div>
          <Link href="/venues" className="group flex items-center text-silver-300 hover:text-white font-medium transition-colors">
            View all
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {[
            { name: "Grand Ballroom ITC", location: "Guindy, Chennai", price: "₹2,50,000", rating: 4.9, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80" },
            { name: "Leela Palace Rooftop", location: "Adyar, Chennai", price: "₹3,50,000", rating: 4.8, image: "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800&q=80" },
            { name: "Taj Coromandel Hall", location: "Nungambakkam, Chennai", price: "₹2,00,000", rating: 4.7, image: "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=800&q=80" },
          ].map((venue, index) => (
            <motion.div
              key={venue.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <Card className="group overflow-hidden hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 border-silver-800 hover:border-silver-600 hover:-translate-y-2 bg-gradient-to-br from-silver-900/50 via-silver-900 to-silver-950">
                <div className="relative h-52 overflow-hidden">
                  <div
                    className="h-full w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${venue.image})` }}
                  />
                  {/* Silver gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-silver-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-silver-700 to-silver-800 px-3 py-1.5 rounded-full text-xs font-semibold text-white flex items-center shadow-lg shadow-black/30 border border-silver-600">
                    <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
                    {venue.rating}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-silver-300 transition-colors">{venue.name}</h3>
                  <p className="text-silver-400 text-sm mb-4 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-silver-500" /> {venue.location}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white">{venue.price}</span>
                      <span className="text-sm text-silver-500"> / day</span>
                    </div>
                    <Button
                      size="sm"
                      variant="silver"
                      className="transition-all duration-300"
                      asChild
                    >
                      <Link href={`/venues`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* CTA Section - Premium Silver & Black */}
      <motion.section
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          className="rounded-3xl bg-gradient-to-r from-silver-900 via-silver-950 to-silver-900 px-6 py-16 text-center shadow-2xl shadow-black/40 sm:px-12 relative overflow-hidden border border-silver-700/50"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          {/* Silver accent glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-silver-700/10 via-silver-600/5 to-silver-700/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-silver-500 to-transparent opacity-50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-silver-600 to-transparent opacity-50" />

          {/* Corner silver accents */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-silver-600/10 to-transparent rounded-br-full" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-silver-600/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-silver-600/10 to-transparent rounded-tr-full" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-silver-600/10 to-transparent rounded-tl-full" />

          <div className="relative z-10">
            <motion.h2
              className="text-3xl font-bold text-white mb-4 drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Ready to Plan Your Perfect Event?
            </motion.h2>

            <motion.p
              className="mx-auto max-w-2xl text-silver-300 mb-8 text-lg drop-shadow-md"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Join thousands of happy customers who planned their weddings, corporate events, and parties with BlinkEventz.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    variant="premium"
                    className="text-lg px-8"
                  >
                    Get Started for Free
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
