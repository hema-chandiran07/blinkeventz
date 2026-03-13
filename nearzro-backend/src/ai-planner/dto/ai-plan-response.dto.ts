export class AIBudgetItemDto {
  category: string;
  allocatedAmount: number;
  notes: string;
}

export class AIPlanResponseDto {
  totalBudget: number;
  breakdown: AIBudgetItemDto[];
}
