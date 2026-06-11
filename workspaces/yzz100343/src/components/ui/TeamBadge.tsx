import React from 'react';
import type { Team } from '@/types';
import { Users } from 'lucide-react';

interface Props {
  team: Team;
  size?: 'sm' | 'md';
}

const colorByTeam: Record<Team, string> = {
  'A班': 'bg-rose-50 text-rose-700 border-rose-200',
  'B班': 'bg-sky-50 text-sky-700 border-sky-200',
  'C班': 'bg-violet-50 text-violet-700 border-violet-200',
  'D班': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const dotColorByTeam: Record<Team, string> = {
  'A班': 'bg-rose-500',
  'B班': 'bg-sky-500',
  'C班': 'bg-violet-500',
  'D班': 'bg-emerald-500',
};

export const TeamBadge: React.FC<Props> = ({ team, size = 'md' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium
        ${colorByTeam[team]}
        ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColorByTeam[team]}`} />
      <Users size={size === 'sm' ? 11 : 13} />
      {team}
    </span>
  );
};
