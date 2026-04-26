"use client";

import { Check } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = [
    { label: "8+ chars", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special char", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;

  const getSegmentColor = (index: number) => {
    if (password.length === 0) return "bg-white/10";
    if (index < metCount) {
      if (metCount <= 1) return "bg-red-500";
      if (metCount <= 2) return "bg-amber-400";
      return "bg-emerald-500";
    }
    return "bg-white/10";
  };

  return (
    <div className="space-y-3">
      {/* Segmented Strength Bar */}
      {password.length > 0 && (
        <div className="flex gap-1.5">
          {requirements.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${getSegmentColor(index)}`}
            />
          ))}
        </div>
      )}

      {/* Minimal Criteria List */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${
              req.met ? "text-emerald-400" : "text-zinc-600"
            }`}
          >
            <div className={`h-1 w-1 rounded-full ${req.met ? "bg-emerald-400" : "bg-zinc-600"}`} />
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
