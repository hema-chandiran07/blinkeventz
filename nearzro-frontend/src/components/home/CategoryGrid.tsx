"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, Calendar, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * CategoryGrid Component - CRED-Inspired Dark Theme
 * Premium category cards with subtle gradients and hover physics
 */
export default function CategoryGrid() {
  const categories = [
    { name: "Venues", icon: MapPin, href: "/venues" },
    { name: "Catering", icon: Star, href: "/vendors?type=CATERING" },
    { name: "Photography", icon: Calendar, href: "/vendors?type=PHOTOGRAPHY" },
    { name: "Decor", icon: Sparkles, href: "/vendors?type=DECOR" },
  ];

  return (
    <motion.section
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeInUp}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        variants={fadeInUp}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-zinc-50 mb-4 tracking-tight">
          Everything You Need
        </h2>
        <p className="text-zinc-500 text-sm leading-relaxed">All your event essentials in one place</p>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent mx-auto mt-6" />
      </motion.div>

      <motion.div
        className="grid grid-cols-2 gap-6 md:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {categories.map((category) => (
          <motion.div
            key={category.name}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <Link href={category.href}>
              <Card className="group cursor-pointer bg-zinc-950/80 backdrop-blur-sm border border-white/10 ring-1 ring-white/5 rounded-2xl hover:border-white/20 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-400 ease-out relative overflow-hidden">
                {/* Faint glass-edge top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                {/* Radial glow behind icon area */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-[radial-gradient(ellipse_at_top,_rgba(161,161,170,0.08)_0%,_transparent_70%)] pointer-events-none" />
                {/* Hover satin sheen */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  {/* Flat matte icon container */}
                  <div className="h-16 w-16 rounded-full flex items-center justify-center mb-5 bg-zinc-900 border border-white/10 relative group-hover:border-white/20 transition-all duration-400">
                    <category.icon className="h-7 w-7 text-zinc-200 transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <h3 className="font-semibold text-zinc-50 text-lg leading-relaxed tracking-wide">{category.name}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
