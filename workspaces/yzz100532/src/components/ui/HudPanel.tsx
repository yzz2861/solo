import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HudPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  accentColor?: "cyan" | "orange" | "green" | "red";
}

const accentColors = {
  cyan: {
    border: "border-tech-cyan",
    glow: "shadow-glow-cyan",
    text: "text-tech-cyan",
  },
  orange: {
    border: "border-warning-orange",
    glow: "shadow-glow-orange",
    text: "text-warning-orange",
  },
  green: {
    border: "border-safety-green",
    glow: "shadow-glow-green",
    text: "text-safety-green",
  },
  red: {
    border: "border-alert-red",
    glow: "shadow-glow-red",
    text: "text-alert-red",
  },
};

export function HudPanel({
  title,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
  accentColor = "cyan",
}: HudPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const accent = accentColors[accentColor];

  return (
    <div
      className={cn(
        "relative border backdrop-blur-md",
        "bg-gradient-to-br from-mine-blue/90 to-mine-blue-light/70",
        "shadow-inner-glow",
        accent.border,
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2",
          accent.border
        )}
      />
      <div
        className={cn(
          "absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2",
          accent.border
        )}
      />
      <div
        className={cn(
          "absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2",
          accent.border
        )}
      />
      <div
        className={cn(
          "absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2",
          accent.border
        )}
      />

      {title && (
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2",
            "border-b",
            accent.border,
            "bg-mine-blue-dark/50"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", accent.text, "bg-current", "animate-pulse")} />
            <h3 className={cn("font-orbitron text-sm font-bold uppercase tracking-wider", accent.text)}>
              {title}
            </h3>
          </div>
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("p-1 transition-colors", accent.text, "hover:opacity-80")}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
