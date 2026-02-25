"use client";

import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface PricingPackageProps {
  name: string;
  price: number;
  time: string;
  selected: boolean;
}

export function PricingPackage({ name, price, time, selected }: PricingPackageProps) {
  const [isSelected, setIsSelected] = useState(selected);
  return (
    <div
      className={`p-4 rounded-xl border text-center cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 shadow-md scale-105"
          : "bg-gray-50 border-gray-200 hover:border-purple-200 hover:bg-purple-50"
      }`}
      onClick={() => setIsSelected(!isSelected)}
    >
      <div className={`text-sm mb-1 ${isSelected ? "text-purple-700 font-semibold" : "text-gray-500"}`}>{name}</div>
      <div className={`text-xl font-bold ${isSelected ? "text-purple-600" : "text-gray-900"}`}>₹{price.toLocaleString("en-IN")}</div>
      <div className={`text-xs ${isSelected ? "text-purple-500" : "text-gray-500"}`}>{time}</div>
      {isSelected && <div className="mt-2"><Badge className="bg-purple-600 text-white">Selected</Badge></div>}
    </div>
  );
}
