import * as React from "react";
import { cn } from "../../utils/cn";
import { gradeColor, type GradeLevel } from "../../utils/format";

interface GradeBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  grade: GradeLevel | string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { badge: "w-6 h-6 text-xs", label: "text-xs" },
  md: { badge: "", label: "text-sm" },
  lg: { badge: "w-9 h-9 text-base", label: "text-base" },
};

export const GradeBadge: React.FC<GradeBadgeProps> = ({
  grade,
  showLabel = false,
  size = "md",
  className,
  ...props
}) => {
  const colors = gradeColor(grade);
  const sizes = sizeStyles[size];

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <div
        className={cn(
          "grade-badge border",
          sizes.badge,
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        {grade.toUpperCase()}
      </div>
      {showLabel && (
        <span className={cn("font-medium", sizes.label, colors.text)}>
          {colors.name}
        </span>
      )}
    </div>
  );
};
