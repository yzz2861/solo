import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: 'primary' | 'danger' | 'warn';
  children?: React.ReactNode;
  widthCls?: string;
}

export default function ConfirmDialog({
  open, title, onClose, onConfirm, confirmText = '确认', cancelText = '取消',
  confirmTone = 'primary', children, widthCls = 'max-w-md',
}: Props) {
  if (!open) return null;
  const toneCls = {
    primary: 'btn-primary',
    danger: 'btn-danger bg-danger-500 text-white hover:bg-danger-600',
    warn: 'btn-warn',
  }[confirmTone];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`card w-full ${widthCls} max-h-[90vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button className="btn-secondary" onClick={onClose}>{cancelText}</button>
          {onConfirm && (
            <button className={toneCls} onClick={onConfirm}>{confirmText}</button>
          )}
        </div>
      </div>
    </div>
  );
}
