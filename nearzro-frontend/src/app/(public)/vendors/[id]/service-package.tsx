"use client";

import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ServicePackageProps {
  name: string;
  price: number;
  description: string;
  selected: boolean;
}

export function ServicePackage({ name, price, description, selected }: ServicePackageProps) {
  const [isSelected, setIsSelected] = useState(selected);
  return (
    <div
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? "bg-gradient-to-br from-silver-100 to-silver-50 border-silver-300 shadow-md scale-105"
          : "bg-silver-50 border-silver-200 hover:border-silver-200 hover:bg-silver-100"
      }`}
      onClick={() => setIsSelected(!isSelected)}
    >
      <div className={`text-sm mb-1 ${isSelected ? "text-neutral-800 font-semibold" : "text-neutral-600"}`}>{name}</div>
      <div className={`text-xl font-bold ${isSelected ? "text-neutral-800" : "text-black"}`}>₹{price.toLocaleString("en-IN")}</div>
      <div className={`text-xs ${isSelected ? "text-neutral-700" : "text-neutral-600"} mt-1`}>{description}</div>
      {isSelected && <div className="mt-2"><Badge className="bg-neutral-900 text-white">Selected</Badge></div>}
    </div>
  );
}
