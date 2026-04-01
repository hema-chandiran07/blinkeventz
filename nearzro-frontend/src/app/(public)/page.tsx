"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import SplitHero from "@/components/home/SplitHero";
import CategoryGrid from "@/components/home/CategoryGrid";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import FeaturedVenues from "@/components/home/FeaturedVenues";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

/**
 * LandingPage - CRED-Inspired Modular Architecture
 * Split-screen hero with parallax, premium dark theme, real data integration
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Split Hero Section with Parallax */}
      <SplitHero />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Featured Venues with Real Data */}
      <FeaturedVenues />

      {/* CTA Section - CRED-Inspired Dark */}
      <motion.section
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
        transition={{ duration: 0.7 }}
      >
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] ring-1 ring-white/10 inset px-6 py-16 text-center sm:px-12 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          {/* Silver accent lines */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-30" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-30" />

          <div className="relative z-10">
            <motion.h2
              className="text-3xl font-bold text-white mb-4"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Ready to Plan Your Perfect Event?
            </motion.h2>

            <motion.p
              className="mx-auto max-w-2xl text-zinc-500 mb-8 text-lg"
              variants={fadeInUp}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Join thousands of happy customers who planned their weddings, corporate events, and parties with NearZro.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-zinc-200 font-semibold text-lg px-8"
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
