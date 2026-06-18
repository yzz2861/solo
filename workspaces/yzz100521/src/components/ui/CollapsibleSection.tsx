import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}) => {
  const { expandedSections, toggleSection } = useUIStore();
  const isOpen = expandedSections[id] ?? defaultOpen;

  return (
    <div className="border border-cream-200 rounded-2xl overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-cream-50 hover:bg-cream-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-icecream-pink">{icon}</span>}
          <h3 className="font-bold text-chocolate-700">{title}</h3>
          {badge && <span>{badge}</span>}
        </div>
        <span className="text-chocolate-500 transition-transform duration-300">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
