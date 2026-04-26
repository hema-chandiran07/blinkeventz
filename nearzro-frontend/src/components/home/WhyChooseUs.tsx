"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

/**
 * WhyChooseUs Component - CRED-Inspired Premium Dark Theme
 * Feature cards with subtle gradients and hover physics
 */
export default function WhyChooseUs() {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      desc: "Plan your event in minutes with our intuitive platform",
    },
    {
      icon: Shield,
      title: "Secure & Trusted",
      desc: "Your data and payments are protected with enterprise-grade security",
    },
    {
      icon: CheckCircle,
      title: "Verified Partners",
      desc: "All venues and vendors are thoroughly vetted for quality",
    },
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
        className="mb-12"
        variants={fadeInLeft}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-zinc-50 tracking-tight">Why Choose NearZro</h2>
        <p className="text-zinc-500 text-sm leading-relaxed mt-2">Built for discerning event planners who demand the best</p>
        <div className="w-16 h-px bg-gradient-to-r from-zinc-600 via-zinc-500 to-transparent mt-5" />
      </motion.div>

      <motion.div
        className="grid gap-6 md:grid-cols-3 items-stretch"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {features.map((feature) => (
          <motion.div
            key={feature.title}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="h-full"
          >
            <Card className="group h-full flex flex-col bg-zinc-950/80 backdrop-blur-sm border border-white/10 ring-1 ring-white/5 rounded-2xl hover:border-white/20 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-400 ease-out relative overflow-hidden">
              {/* Faint glass-edge top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              {/* Radial glow behind icon area */}
              <div className="absolute top-0 left-0 w-36 h-36 bg-[radial-gradient(ellipse_at_top_left,_rgba(161,161,170,0.07)_0%,_transparent_65%)] pointer-events-none" />
              {/* Hover satin sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="p-7">
                {/* Flat matte icon container */}
                <div className="h-12 w-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 relative group-hover:border-white/20 transition-all duration-400">
                  <feature.icon className="h-5 w-5 text-zinc-200 transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-zinc-50 mb-2 group-hover:text-white transition-colors duration-300 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
