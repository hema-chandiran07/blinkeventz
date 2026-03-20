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
          <span className="text-sm font-medium text-gray-600">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((step / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-4">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  What type of event are you planning?
                </h2>
                <p className="text-gray-500 mt-1">
                  Select your event type to get personalized recommendations
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ eventType: type })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      formData.eventType === type
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-200 hover:bg-gray-50"
                    )}
                  >
                    <span className="font-medium text-gray-900">{type}</span>
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Where and how many guests?
                </h2>
                <p className="text-gray-500 mt-1">
                  Tell us your location and guest count
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ city: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select your city</option>
                    {INDIAN_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ area: e.target.value })}
                    placeholder="e.g., Whitefield, Andheri"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    value={formData.guestCount || ""}
                    onChange={(e) => setFormData({ guestCount: parseInt(e.target.value) || 0 })}
                    placeholder="Enter guest count"
                    min={1}
                    max={10000}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  What's your budget?
                </h2>
                <p className="text-gray-500 mt-1">
                  Set your total budget for the event
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.budget || ""}
                    onChange={(e) => setFormData({ budget: parseInt(e.target.value) || 0 })}
                    placeholder="Enter your budget"
                    min={1000}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
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
                        "p-2 rounded-lg border text-sm font-medium transition-all",
                        formData.budget === preset.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-green-200"
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
                    className="p-4 bg-green-50 rounded-xl"
                  >
                    <p className="text-sm text-green-800">
                      <strong>₹{formData.budget.toLocaleString()}</strong> budget set
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={handleBack}
          disabled={step === 1 || isSubmitting}
          className={cn(
            "px-6 py-2.5 rounded-lg font-medium transition-all",
            step === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
              canProceed()
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
              "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
              canProceed() && !isSubmitting
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
