import { LucideIcon, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title = "No items found",
  description = "There are no items to display right now.",
  icon: Icon = PackageOpen,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-silver-300 bg-white/50 p-12 text-center animate-in fade-in-50",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-silver-100">
        <Icon className="h-6 w-6 text-neutral-700" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-black">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
