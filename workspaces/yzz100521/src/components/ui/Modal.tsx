import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-chocolate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-3xl shadow-xl animate-fade-in-up`}
      >
        <div className="flex items-center justify-between p-6 border-b border-cream-100">
          <h2 className="text-xl font-bold text-chocolate-700 font-display">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-cream-100 transition-colors text-chocolate-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
