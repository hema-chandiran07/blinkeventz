"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Users, 
  MapPin, 
  Wallet,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { cn } from "@/lib/utils";

interface AIPlannerFormProps {
  className?: string;
  onComplete?: () => void;
  initialData?: {
    budget?: number;
    eventType?: string;
    city?: string;
    area?: string;
    guestCount?: number;
  };
}

// Flag for initial data handling
const _hasInitialData = false;

// Common Indian cities
const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  "Chandigarh", "Goa", "Kochi", "Vizag", "Indore"
];

// Event types
const EVENT_TYPES = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Corporate Event",
  "Anniversary",
  "Baby Shower",
  "Mehendi/Sangeet",
  "Reception",
  "Other"
];

export function AIPlannerForm({ className, onComplete, initialData }: AIPlannerFormProps) {
  const {
    formData,
    setFormData,
    submitPlan,
    isSubmitting,
    uiState,
  } = useAIPlanner();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Initialize with provided data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData, setFormData]);

  // Handle completion
  useEffect(() => {
    if (uiState === "SUCCESS" || uiState === "GENERATING") {
      onComplete?.();
    }
  }, [uiState, onComplete]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    await submitPlan();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.eventType?.length > 0;
      case 2:
        return formData.city?.length > 0 && formData.guestCount > 0;
      case 3:
        return formData.budget > 0;
      default:
        return false;
    }
  };

  return (
    <div className={cn("w-full max-w-lg mx-auto", className)}>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-400">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-zinc-500">
            {Math.round((step / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-zinc-400 via-zinc-300 to-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Form steps */}
      <div className="relative overflow-hidden min-h-[300px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
                  <Sparkles className="w-6 h-6 text-zinc-300" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  What type of event are you planning?
                </h2>
                <p className="text-zinc-400 mt-1">
                  Select your event type to get personalized recommendations
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ eventType: type })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all shadow-sm",
                      formData.eventType === type
                        ? "border-zinc-400 bg-zinc-900/80 text-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <span className="font-medium">{type}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
                  <MapPin className="w-6 h-6 text-zinc-300" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  Where and how many guests?
                </h2>
                <p className="text-zinc-400 mt-1">
                  Tell us your location and guest count
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ city: e.target.value })}
                    className="w-full p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-400 focus:border-zinc-500 text-zinc-100 transition-all shadow-sm"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-500">Select your city</option>
                    {INDIAN_CITIES.map((city) => (
                      <option key={city} value={city} className="bg-zinc-900">{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ area: e.target.value })}
                    placeholder="e.g., Whitefield, Andheri"
                    className="w-full p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-400 focus:border-zinc-500 text-zinc-100 transition-all shadow-sm placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1 text-zinc-400" />
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    value={formData.guestCount || ""}
                    onChange={(e) => setFormData({ guestCount: parseInt(e.target.value) || 0 })}
                    placeholder="Enter guest count"
                    min={1}
                    max={10000}
                    className="w-full p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-400 focus:border-zinc-500 text-zinc-100 transition-all shadow-sm placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
                  <Wallet className="w-6 h-6 text-zinc-300" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  What's your budget?
                </h2>
                <p className="text-zinc-400 mt-1">
                  Set your total budget for the event
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Total Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.budget || ""}
                    onChange={(e) => setFormData({ budget: parseInt(e.target.value) || 0 })}
                    placeholder="Enter your budget"
                    min={1000}
                    className="w-full p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-400 focus:border-zinc-500 text-zinc-100 text-lg font-medium transition-all shadow-sm placeholder:text-zinc-600"
                  />
                </div>

                {/* Quick budget presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "₹50K", value: 50000 },
                    { label: "₹1L", value: 100000 },
                    { label: "₹5L", value: 500000 },
                    { label: "₹10L", value: 1000000 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setFormData({ budget: preset.value })}
                      className={cn(
                        "p-2 rounded-lg border text-sm font-medium transition-all shadow-sm",
                        formData.budget === preset.value
                          ? "border-zinc-400 bg-zinc-800 text-zinc-100 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                          : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {formData.budget > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl"
                  >
                    <p className="text-sm text-zinc-300">
                      <strong className="text-zinc-100">₹{formData.budget.toLocaleString()}</strong> budget set
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800/80">
        <button
          onClick={handleBack}
          disabled={step === 1 || isSubmitting}
          className={cn(
            "px-6 py-2.5 rounded-lg font-medium transition-all border",
            step === 1
              ? "text-zinc-700 border-transparent cursor-not-allowed"
              : "text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 bg-zinc-900/50"
          )}
        >
          Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all border shadow-sm",
              canProceed()
                ? "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-white hover:scale-[1.02]"
                : "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
            )}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all border shadow-sm",
              canProceed() && !isSubmitting
                ? "bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-950 border-zinc-300 hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                : "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Plan
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
