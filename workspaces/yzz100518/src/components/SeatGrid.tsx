import type { Seat, SeatStatus } from '@/types';
import { SEAT_STATUS_LABEL, ZONE_LABEL } from '@/types';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { User, UserX, Clock, AlertTriangle, Check } from 'lucide-react';

const STATUS_STYLES: Record<SeatStatus, { card: string; dot: string; icon: LucideIcon | null }> = {
  available: {
    card: 'bg-white border-ink-200 hover:border-amber-400 hover:card-shadow-hover text-ink-500',
    dot: 'bg-moss-400',
    icon: null,
  },
  reserved: {
    card: 'bg-amber-50 border-amber-300 text-amber-700',
    dot: 'bg-amber-400',
    icon: Clock,
  },
  in_use: {
    card: 'bg-ink-700 border-ink-700 text-white shadow-md',
    dot: 'bg-ink-400',
    icon: User,
  },
  temporarily_away: {
    card: 'bg-ink-100 border-ink-400 text-ink-700',
    dot: 'bg-ink-400 animate-pulse',
    icon: UserX,
  },
  violation: {
    card: 'bg-clay-50 border-clay-400 text-clay-600 animate-pulse-ring',
    dot: 'bg-clay-500',
    icon: AlertTriangle,
  },
};

interface SeatGridProps {
  seats: Seat[];
  selectedSeatId?: string;
  onSeatClick?: (seat: Seat) => void;
  showChecked?: (seatId: string) => boolean;
  floor?: 1 | 2 | 'all';
  compact?: boolean;
  highlightViolations?: boolean;
}

export function SeatGrid({
  seats,
  selectedSeatId,
  onSeatClick,
  showChecked,
  floor = 'all',
  compact = false,
  highlightViolations = true,
}: SeatGridProps) {
  const filteredSeats = floor === 'all' ? seats : seats.filter((s) => s.floor === floor);
  const groupedByZone = filteredSeats.reduce<Record<string, Seat[]>>((acc, s) => {
    (acc[s.zone] ||= []).push(s);
    return acc;
  }, {});

  const zones = Object.keys(groupedByZone).sort();

  return (
    <div className={cn('flex flex-col gap-6', compact && 'gap-4')}>
      {zones.map((zone) => {
        const zoneSeats = groupedByZone[zone];
        const rows = Math.max(...zoneSeats.map((s) => s.row)) + 1;
        const cols = Math.max(...zoneSeats.map((s) => s.col)) + 1;
        return (
          <div
            key={zone}
            className={cn(
              'card-shadow rounded-2xl border border-ink-100 bg-white p-5 animate-stagger-in',
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-semibold text-ink-800">
                  {zone}区
                </div>
                <div className="text-xs text-ink-500">{ZONE_LABEL[zone as keyof typeof ZONE_LABEL]}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-moss-400" /> 空闲
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-ink-600" /> 使用
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> 已约
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-clay-500" /> 违规
                </span>
              </div>
            </div>
            <div
              className="grid gap-2.5"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
              }}
            >
              {Array.from({ length: rows }).map((_, rIdx) =>
                Array.from({ length: cols }).map((_, cIdx) => {
                  const seat = zoneSeats.find((s) => s.row === rIdx && s.col === cIdx);
                  if (!seat) return <div key={`${rIdx}-${cIdx}`} />;
                  const style = STATUS_STYLES[seat.status];
                  const Icon = style.icon;
                  const isSelected = selectedSeatId === seat.id;
                  const checked = showChecked?.(seat.id);
                  return (
                    <button
                      key={seat.id}
                      onClick={() => onSeatClick?.(seat)}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 transition-all duration-300',
                        style.card,
                        compact && 'py-2 text-[11px]',
                        isSelected &&
                          'ring-4 ring-amber-300 ring-offset-2 ring-offset-white scale-[1.03]',
                        onSeatClick && 'cursor-pointer active:scale-[0.97]',
                        !onSeatClick && seat.status === 'available' && 'cursor-default',
                        highlightViolations &&
                          seat.status === 'violation' &&
                          'animate-pulse-ring',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className={cn('font-semibold', compact && 'text-xs')}>
                          {seat.code}
                        </span>
                        {Icon && <Icon size={compact ? 12 : 14} />}
                      </div>
                      {!compact && seat.studentName && (
                        <div className="max-w-full truncate px-1 text-[11px] opacity-80">
                          {seat.studentName}
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full',
                          style.dot,
                        )}
                      />
                      {checked && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-moss-500 text-white shadow-md">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl bg-ink-50 px-4 py-2.5 text-xs text-ink-500">
              <span>
                {ZONE_LABEL[zone as keyof typeof ZONE_LABEL]} · 共 {zoneSeats.length} 座
              </span>
              <span>空闲 {zoneSeats.filter((s) => s.status === 'available').length}</span>
              <span>使用 {zoneSeats.filter((s) => s.status === 'in_use').length}</span>
              <span>临时离座 {zoneSeats.filter((s) => s.status === 'temporarily_away').length}</span>
              <span>
                违规 {zoneSeats.filter((s) => s.status === 'violation').length}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SeatStatusLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink-500">
      {Object.entries(SEAT_STATUS_LABEL).map(([k, v]) => {
        const style = STATUS_STYLES[k as SeatStatus];
        return (
          <div key={k} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-sm', style.dot)} />
            {v}
          </div>
        );
      })}
    </div>
  );
}
