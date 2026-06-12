import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputGroupProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: 'green' | 'soil' | 'water';
}

const InputGroup = ({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = 'green',
}: InputGroupProps) => {
  const accentBg = {
    green: 'bg-greenhouse-50 text-greenhouse-600',
    soil: 'bg-soil-50 text-soil-500',
    water: 'bg-water-50 text-water-500',
  }[accent];

  return (
    <section className="card-base p-5 sm:p-6 animate-fade-in-up">
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-bold text-greenhouse-800 leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-greenhouse-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
};

export default InputGroup;
