import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export type StatusType = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'confirmed' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let customClass = "";

  switch (normalizedStatus) {
    case 'approved':
    case 'completed':
    case 'confirmed':
    case 'active':
      variant = "default"; // We'll override color
      customClass = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
      break;
    case 'pending':
      variant = "secondary";
      customClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200";
      break;
    case 'rejected':
    case 'cancelled':
    case 'inactive':
      variant = "destructive";
      customClass = "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
      break;
    default:
      variant = "secondary";
      customClass = "bg-silver-100 text-neutral-700 hover:bg-silver-200 border-silver-200";
  }

  return (
    <Badge 
      variant={variant} 
      className={cn("capitalize border shadow-none", customClass, className)}
    >
      {status}
    </Badge>
  );
}
