export function budgetSplitPrompt(input: {
  budget: number;
  eventType: string;
  city: string;
  area: string;
  guestCount: number;
}) {
  return `
Create a budget allocation plan for an event.

Rules:
- Budget must be fully distributed
- Use realistic Indian pricing
- Respond ONLY in valid JSON
- No markdown

Input:
${JSON.stringify(input)}

Output format:
{
  "summary": {
    "eventType": "",
    "city": "",
    "guestCount": 0,
    "totalBudget": 0
  },
  "allocations": [
    { "category": "Venue", "amount": 0, "notes": "" },
    { "category": "Catering", "amount": 0, "notes": "" },
    { "category": "Decor", "amount": 0, "notes": "" },
    { "category": "Entertainment", "amount": 0, "notes": "" }
  ]
}
`;
}
