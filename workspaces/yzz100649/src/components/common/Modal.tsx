import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_.15s_ease]"
      onClick={onClose}
    >
      <div
        className={clsx(
          'w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-[popIn_.18s_ease]',
          SIZES[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-slate-800">{title}</h3>
            ) : (
              title
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
