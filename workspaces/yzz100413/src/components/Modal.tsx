import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideClose?: boolean;
  footer?: ReactNode;
}

export default function Modal({ open, onClose, title, children, size = 'md', hideClose, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const w = size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-lg' : size === 'lg' ? 'max-w-2xl' : 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-felt-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className={`relative w-full ${w} bg-white rounded-2xl shadow-modal overflow-hidden animate-slideDown`}>
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-cream-50/60">
            <div className="font-serif text-lg font-bold text-felt-700">{title}</div>
            {!hideClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-felt-500/10 text-felt-500">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5 max-h-[75vh] overflow-auto scrollbar-thin">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-cream-200 bg-cream-50/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title = '确认操作',
  message, confirmText = '确认', cancelText = '取消',
  danger = false, confirmDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="text-center mb-5">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${danger ? 'bg-danger-500/10 text-danger-500' : 'bg-gold-500/15 text-gold-600'}`}>
          <div className={danger ? '' : ''} style={{ fontSize: 24 }}>⚠️</div>
        </div>
        <div className="font-serif text-xl font-bold text-felt-700 mb-1.5">{title}</div>
        <div className="text-sm text-felt-600">{message}</div>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onClose}>{cancelText}</button>
        <button
          className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >{confirmText}</button>
      </div>
    </Modal>
  );
}
