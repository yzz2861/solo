import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-modal-in',
          sizeMap[size],
          className
        )}
        style={{ animation: 'modalIn 0.3s ease-out' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-lg font-semibold text-amber-900 font-serif">{title}</h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="p-2 hover:bg-amber-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-amber-700" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
      <style>{`
        @keyframes modalIn {
          from {
            transform: scale(0.95) translateY(-10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
