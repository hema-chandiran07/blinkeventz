// src/ai-planner/ai/ai-budget-splitter.ts

export function splitBudget(budget: number, guests: number) {
  return {
    venue: Math.round(budget * 0.35),
    catering: Math.round(budget * 0.40),
    decor: Math.round(budget * 0.10),
    photography: Math.round(budget * 0.08),
    misc: Math.round(budget * 0.07),
    perGuestCost: Math.round(budget / guests),
  };
}
