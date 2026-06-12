import * as React from "react";
import { cn } from "../../utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  children?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn("card-panel overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  title,
  subtitle,
  action,
  className,
  ...props
}) => {
  const hasContent = title || subtitle || children || action;
  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-5 py-4 border-b border-brass-500/10 bg-space-800/40",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-sm font-semibold text-brass-200 tracking-wide">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-0.5 text-xs text-space-400">{subtitle}</p>
        )}
        {!title && !subtitle && children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  noPadding = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        !noPadding && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-5 py-4 border-t border-brass-500/10 bg-space-800/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
