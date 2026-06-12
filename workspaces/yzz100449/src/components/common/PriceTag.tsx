interface Props {
  value: number;
  prefix?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'up' | 'down';
}

export default function PriceTag({ value, prefix = '¥', size = 'md', tone = 'default' }: Props) {
  const sizeCls = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  }[size];
  const toneCls = {
    default: 'text-slate-800',
    up: 'text-emerald-600',
    down: 'text-danger-600',
  }[tone];
  return (
    <span className={`font-mono font-bold ${sizeCls} ${toneCls} tabular-nums`}>
      {prefix}
      {value.toLocaleString('zh-CN')}
    </span>
  );
}
