import { STATUS_LABEL, STATUS_COLOR, type RecycleStatus } from '../../types';

interface Props {
  status: RecycleStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span className={`chip ${STATUS_COLOR[status]} ${sizeCls}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
