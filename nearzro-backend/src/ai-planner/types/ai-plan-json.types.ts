export interface AIPlanJson {
  summary: {
    eventType: string;
    city: string;
    guestCount: number;
    totalBudget: number;
  };
  allocations: {
    category: string;
    amount: number;
    notes: string;
  }[];
}
