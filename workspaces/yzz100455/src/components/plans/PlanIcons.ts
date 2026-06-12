import { Building2, Users, Server } from 'lucide-react';
import type { UsageType } from '@/types';
import type { LucideIcon } from 'lucide-react';

export const USAGE_TYPE_ICONS: Record<UsageType, LucideIcon> = {
  office: Building2,
  meeting: Users,
  server: Server,
};

export const USAGE_TYPE_LABELS: Record<UsageType, string> = {
  office: '开放办公区',
  meeting: '会议室',
  server: '机房',
};
