import { AIChatPlanner } from "@/components/ai-planner/ai-planner-wrapper";
import { Sparkles } from "lucide-react";

export default function PlanEventPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-black min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-500 mb-4 flex items-center justify-center gap-4 tracking-tight">
            <Sparkles className="h-12 w-12 text-zinc-100/80" />
            AI Event Planner
          </h1>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
            Experience the future of event planning. Chat with <span className="text-zinc-300 font-semibold italic">Event Brain</span> to design your perfect occasion.
          </p>
        </div>

        {/* The Chat-focused AI Planner */}
        <AIChatPlanner 
          className="pb-20"
        />
      </div>
    </div>
  );
}
