import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface IconWrapperProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "silver" | "outline";
  onClick?: () => void;
}

export function IconWrapper({ 
  children, 
  className, 
  size = "md", 
  variant = "default",
  onClick 
}: IconWrapperProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const variantClasses = {
    default: "bg-gradient-to-br from-black via-neutral-800 to-black text-white hover:from-silver-200 hover:via-silver-300 hover:to-silver-200 hover:text-black",
    silver: "bg-gradient-to-br from-silver-200 via-silver-300 to-silver-200 text-black hover:from-black hover:via-neutral-800 hover:to-black hover:text-white",
    outline: "border-2 border-black text-black hover:bg-gradient-to-br hover:from-silver-100 hover:to-silver-200",
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl flex items-center justify-center shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-silver-400/40 transition-all duration-300 cursor-pointer",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
