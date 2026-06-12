import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ModalBaseProps {
  /** 控制弹窗显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 弹窗标题 */
  title?: React.ReactNode;
  /** 弹窗内容 */
  children?: React.ReactNode;
  /** 弹窗宽度，默认 640px */
  width?: number | string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 基础弹窗组件
 * - 半透明黑色背景遮罩
 * - 居中白色卡片容器
 * - 右上角关闭按钮 X
 * - 支持 ESC 关闭
 */
export default function ModalBase({
  open,
  onClose,
  title,
  children,
  width = 640,
  className,
}: ModalBaseProps) {
  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // 打开弹窗时禁止背景滚动
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 弹窗卡片 */}
      <div
        className={cn(
          'relative z-10 flex max-h-[85vh] flex-col rounded-xl bg-slate-800 text-slate-100 shadow-2xl ring-1 ring-slate-700/50',
          className,
        )}
        style={{ width: widthStyle }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
