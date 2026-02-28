import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  text?: string;
}

export function LoadingState({ className, text = "Loading..." }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-neutral-700" />
      <p className="text-sm text-neutral-500 animate-pulse">{text}</p>
    </div>
  );
}
