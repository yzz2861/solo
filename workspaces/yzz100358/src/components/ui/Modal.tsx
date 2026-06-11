import { forwardRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      size = 'md',
      closeOnOverlayClick = true,
      closeOnEsc = true,
      className,
    },
    ref
  ) => {
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEsc) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [isOpen, onClose, closeOnEsc]);

    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 bg-ink-950/80 backdrop-blur-sm',
            'animate-fade-in',
            closeOnOverlayClick && 'cursor-pointer'
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        <div
          ref={ref}
          className={cn(
            'relative z-10 w-full mx-4',
            'bg-ink-800 border border-ink-700 rounded-lg shadow-2xl',
            'animate-slide-up',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-gold-700" />
          <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-gold-700" />
          <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-gold-700" />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-gold-700" />

          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
              <h3 className="text-lg font-semibold text-ivory-100 font-display">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-ink-400 hover:text-ivory-100 hover:bg-ink-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="px-6 py-4">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-700">
              {footer}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';
