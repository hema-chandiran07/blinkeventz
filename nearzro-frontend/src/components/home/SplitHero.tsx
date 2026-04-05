"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * SplitHero Component - CRED-Inspired 50/50 Split Layout
 * Left: True black with premium typography
 * Right: Original image with parallax effect and dark/silver vignette
 * Hardware-accelerated parallax using transform (no background-position)
 */
export default function SplitHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax effect using Framer Motion - hardware accelerated
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  // Transform image vertically at different speed - GPU accelerated
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  return (
    <section ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Dynamic Fluid Mercury/Chrome Texture Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(192,192,192,0.4),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(163,163,163,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(229,229,229,0.2),transparent_60%)]" />
        </div>
        {/* Liquid mercury animation overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-600/10 to-transparent animate-pulse" />
      </div>

      {/* 50/50 Split Layout - Desktop */}
      <div className="flex flex-col lg:flex-row min-h-screen relative z-10">
        
        {/* Left Side - True Black with Typography */}
        <div className="w-full lg:w-1/2 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 lg:p-16 relative">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* NearZro Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl ring-1 ring-white/10">
                <img
                  src="/logo.jpeg"
                  alt="NearZro Logo"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>

            {/* Premium badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] ring-1 ring-white/10 mb-6"
            >
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Premium Event Planning</span>
            </motion.div>

            {/* Main Typography */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              Plan Your Dream Event{" "}
              <span className="text-zinc-400">With Confidence</span>
            </motion.h1>

            <motion.p
              className="text-lg text-zinc-500 mb-10 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              Discover top-rated venues, trusted vendors, and AI-powered planning tools all in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              <Link href="/plan-event">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button size="lg" className="bg-gradient-to-r from-zinc-200 via-white to-zinc-200 text-black hover:from-zinc-100 hover:via-zinc-50 hover:to-zinc-100 font-semibold text-lg px-8 border-2 border-zinc-300 shadow-[0_0_20px_rgba(192,192,192,0.3)] hover:shadow-[0_0_30px_rgba(192,192,192,0.5)] transition-all duration-300">
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
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 border-2 border-zinc-400 text-white hover:from-zinc-600 hover:via-zinc-500 hover:to-zinc-600 hover:border-zinc-300 text-lg px-8 shadow-[0_0_20px_rgba(192,192,192,0.2)] hover:shadow-[0_0_30px_rgba(192,192,192,0.4)] transition-all duration-300"
                  >
                    Browse Venues
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side - Image with Parallax and Vignette */}
        <div className="w-full lg:w-1/2 relative h-[50vh] lg:h-screen overflow-hidden">
          {/* Parallax Image - Hardware Accelerated */}
          <motion.div
            className="absolute inset-0 w-full h-full"
            style={{ y: imageY, opacity: imageOpacity }}
          >
            <div
              className="absolute inset-0 w-full h-[130%] -top-[15%] bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=2098&q=80')`,
              }}
            />
          </motion.div>

          {/* Dark/Silver Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          
          {/* Subtle silver accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-30" />
        </div>
      </div>

    </section>
  );
}
