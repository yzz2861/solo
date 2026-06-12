import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div
        className={`modal-panel w-full ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-farm-700 font-serif">{title}</h3>
            {subtitle && <p className="text-xs text-earth-500 mt-1">{subtitle}</p>}
          </div>
          <button
            className="p-1.5 rounded-lg text-earth-400 hover:bg-earth-100 hover:text-earth-600 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
