import { useToast } from '@/store/app';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Toast() {
  const { message, type } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [message]);

  if (!visible) return null;

  const styles: Record<string, string> = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    info: 'bg-primary-500 text-white',
  };

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div className={`${styles[type]} px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]`}>
        <Icon size={18} />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
