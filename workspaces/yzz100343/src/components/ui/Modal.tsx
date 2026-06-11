import React from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<Props> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeMap[size]} bg-white rounded-md
          shadow-2xl border border-industrial-gray-200 animate-slide-in
          overflow-hidden`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-industrial-gray-200 bg-industrial-gray-50">
            <h3 className="text-base font-bold text-industrial-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-industrial-gray-200 text-industrial-gray-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-5 max-h-[70vh] overflow-auto scrollbar-thin">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-industrial-gray-200 bg-industrial-gray-50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
};
