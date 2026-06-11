'use client';

import { User, MapPin, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student } from '@/hooks/useApi';

type StudentCardProps = {
  student: Student;
  className?: string;
};

export function StudentCard({ student, className }: StudentCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-card p-5',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-brand-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-brand-navy truncate">{student.name}</h3>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            学号 {student.studentNo} · {student.class.name}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Bus className="w-4 h-4 text-brand-orange shrink-0" />
              <span className="text-slate-600">默认线路：</span>
              <span className="font-medium text-brand-navy">{student.defaultRoute.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-brand-navy shrink-0" />
              <span className="text-slate-600">默认站点：</span>
              <span className="font-medium text-brand-navy">{student.defaultStop.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
