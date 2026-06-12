import * as React from "react";
import { cn } from "../../utils/cn";

type DeviceStatus =
  | "pending_inspect"
  | "available"
  | "reserved"
  | "sold"
  | "returned";

interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: DeviceStatus;
  dot?: boolean;
}

const statusConfig: Record<
  DeviceStatus,
  { label: string; styles: string; dotColor: string }
> = {
  pending_inspect: {
    label: "待检测",
    styles:
      "bg-signal-orange/15 text-signal-orange border-signal-orange/35",
    dotColor: "bg-signal-orange",
  },
  available: {
    label: "在售中",
    styles:
      "bg-signal-green/15 text-signal-green border-signal-green/35",
    dotColor: "bg-signal-green",
  },
  reserved: {
    label: "已预留",
    styles:
      "bg-signal-blue/15 text-signal-blue border-signal-blue/35",
    dotColor: "bg-signal-blue",
  },
  sold: {
    label: "已售出",
    styles:
      "bg-space-600/40 text-space-300 border-space-500/35",
    dotColor: "bg-space-400",
  },
  returned: {
    label: "已退回",
    styles:
      "bg-signal-red/15 text-signal-red border-signal-red/35",
    dotColor: "bg-signal-red",
  },
};

export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  dot = true,
  className,
  ...props
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
        config.styles,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)}
        />
      )}
      {config.label}
    </span>
  );
};
