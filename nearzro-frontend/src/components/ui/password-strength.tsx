"use client";

import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strength = metCount / requirements.length;

  const getStrengthColor = () => {
    if (strength < 0.4) return "bg-red-500";
    if (strength < 0.7) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return "";
    if (strength < 0.4) return "Weak";
    if (strength < 0.7) return "Medium";
    return "Strong";
  };

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600">Password Strength</span>
            <span className={`font-medium ${
              strength < 0.4 ? "text-red-600" :
              strength < 0.7 ? "text-yellow-600" :
              "text-green-600"
            }`}>
              {getStrengthLabel()}
            </span>
          </div>
          <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getStrengthColor()} transition-all duration-500`}
              style={{ width: `${strength * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="grid grid-cols-2 gap-2">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-xs ${
              req.met ? "text-green-600" : "text-neutral-400"
            }`}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
