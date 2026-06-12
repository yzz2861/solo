import type { Staff } from '@/types';

export const INITIAL_STAFF: Staff[] = [
  {
    id: 's1',
    name: '小明',
    avatar: '👦',
    status: 'practicing',
    createdAt: '2024-01-15',
  },
  {
    id: 's2',
    name: '小红',
    avatar: '👧',
    status: 'observing',
    createdAt: '2024-01-20',
  },
  {
    id: 's3',
    name: '小李',
    avatar: '🧑',
    status: 'ready',
    statusNote: '已通过考核，可独立上岗',
    createdAt: '2023-12-01',
  },
  {
    id: 's4',
    name: '小张',
    avatar: '👨',
    status: 'practicing',
    createdAt: '2024-02-01',
  },
  {
    id: 's5',
    name: '小王',
    avatar: '👩',
    status: 'observing',
    createdAt: '2024-02-10',
  },
];

export const AVATAR_OPTIONS = ['👦', '👧', '🧑', '👨', '👩', '🧒', '👱', '👸', '🤴', '🧔'];

export const generateStaffId = (): string => {
  return `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
