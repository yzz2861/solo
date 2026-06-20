import type { ReactNode } from 'react';

interface EmptyProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function Empty({ icon, title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-gray-500">{icon}</div>
      <h3 className="mb-1 text-sm font-medium text-gray-400">{title}</h3>
      <p className="max-w-xs text-xs text-gray-600">{description}</p>
    </div>
  );
}
