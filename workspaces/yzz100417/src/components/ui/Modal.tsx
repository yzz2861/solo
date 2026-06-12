import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] h-[90vh]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  contentClassName,
}) => {
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  React.useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden",
          sizeClasses[size],
          "animate-slide-up",
          contentClassName
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-xl font-semibold text-slate-900 leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0 -mr-2 -mt-1"
              >
                <X size={20} />
              </Button>
            )}
          </div>
        )}

        <div className={cn(
          "flex-1 overflow-y-auto px-6 py-5",
          size === "full" ? "" : ""
        )}>
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger" | "success";
  confirmLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title = "确认操作",
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "primary",
  confirmLoading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={confirmLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : variant === "success" ? "success" : "primary"}
            onClick={onConfirm}
            loading={confirmLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    />
  );
};
