import { useState, useMemo, useEffect } from 'react';
import { User, Gift, Users, ChevronDown, Search } from 'lucide-react';
import Modal from './Modal';
import { useBilliardStore } from '@/store';
import type { CustomerType } from '@/types';
import { formatMoney } from '@/lib/utils';

export interface OpenTableParams {
  customerType: CustomerType;
  memberId?: string | null;
  packageId?: string | null;
  note?: string;
  autoCheckout?: boolean;
}

interface Props {
  open: boolean;
  tableId: string | null;
  onClose: () => void;
  onSubmit: (params: OpenTableParams) => void;
}

export default function OpenTableModal({ open, tableId, onClose, onSubmit }: Props) {
  const tables = useBilliardStore(s => s.tables);
  const members = useBilliardStore(s => s.members);
  const packages = useBilliardStore(s => s.packages);
  const table = tables.find(t => t.id === tableId);

  const [customerType, setCustomerType] = useState<CustomerType>('walk-in');
  const [memberId, setMemberId] = useState<string>('');
  const [packageId, setPackageId] = useState<string>('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setCustomerType('walk-in');
      setMemberId('');
      setPackageId('');
      setNote('');
      setSearch('');
    }
  }, [open]);

  const availablePackages = useMemo(
    () => packages.filter(p => !table || p.applicable_tables.includes(table.id)),
    [packages, table]
  );

  const filteredMembers = useMemo(
    () => members.filter(m => !search || m.name.includes(search) || m.phone.includes(search)),
    [members, search]
  );

  const types: { key: CustomerType; icon: typeof User; label: string; desc: string; color: string }[] = [
    { key: 'walk-in', icon: User, label: '散客', desc: '按时计费', color: 'from-sky-500 to-cyan-500' },
    { key: 'member',  icon: Users, label: '会员', desc: '享会员折扣', color: 'from-amber-500 to-orange-500' },
    { key: 'package', icon: Gift, label: '包时', desc: '套餐更划算', color: 'from-rose-500 to-pink-500' },
  ];

  const canSubmit = customerType === 'walk-in' || (customerType === 'member' && memberId) || (customerType === 'package' && packageId);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      customerType,
      memberId: customerType === 'member' ? memberId : null,
      packageId: customerType === 'package' ? packageId : null,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={table ? `为 ${table.name}（${table.table_no}号）开台` : '开台'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!canSubmit} onClick={submit}>
            确认开台 · 开始计时
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {table && (
          <div className="rounded-xl bg-cream-50 p-4 border border-cream-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-felt-500">桌台</div>
              <div className="font-serif text-2xl font-bold text-felt-700">{table.table_no} 号 · {table.name}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-felt-500">小时费率</div>
              <div className="font-serif text-xl font-bold text-gold-600">{formatMoney(table.hourly_rate)}</div>
            </div>
          </div>
        )}

        <div>
          <label className="label">客人类型</label>
          <div className="grid grid-cols-3 gap-3">
            {types.map(t => {
              const Icon = t.icon;
              const active = customerType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setCustomerType(t.key)}
                  className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                    active ? 'border-felt-500 bg-white shadow-md -translate-y-0.5' : 'border-felt-100 bg-white/60 hover:border-felt-300'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br ${t.color} opacity-${active ? 20 : 10}`}></div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${t.color} text-white flex items-center justify-center mb-3 shadow ${active ? '' : 'opacity-80'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="font-bold text-felt-700">{t.label}</div>
                  <div className="text-[11px] text-felt-500 mt-0.5">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {customerType === 'member' && (
          <div>
            <label className="label">选择会员</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-felt-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
                placeholder="搜索姓名或手机号"
              />
            </div>
            <div className="space-y-1.5 max-h-56 overflow-auto scrollbar-thin pr-1 rounded-lg border border-felt-100 p-1">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-felt-400 text-sm">没有匹配的会员</div>
              ) : filteredMembers.map(m => {
                const active = m.id === memberId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMemberId(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      active ? 'bg-felt-500 text-white' : 'hover:bg-felt-500/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-sm ${active ? 'bg-white/20 text-white' : 'bg-gold-500/15 text-gold-600'}`}>
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${active ? '' : 'text-felt-700'}`}>
                        {m.name} <span className="text-[10px] ml-1 opacity-80">{m.phone}</span>
                      </div>
                      <div className={`text-[11px] ${active ? 'text-white/80' : 'text-felt-500'}`}>
                        {m.level === 'diamond' ? '💎 钻石会员' : m.level === 'gold' ? '🥇 金卡会员' : '🥈 银卡会员'}
                        · 余额 {formatMoney(m.balance)} · 折扣 {(m.discount_rate * 10).toFixed(1)}折
                      </div>
                    </div>
                    {active && <ChevronDown size={16} className="rotate-[-90deg]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {customerType === 'package' && (
          <div>
            <label className="label">选择包时套餐</label>
            <div className="grid grid-cols-2 gap-3">
              {availablePackages.length === 0 ? (
                <div className="col-span-2 p-6 text-center text-felt-400 text-sm border border-dashed border-felt-200 rounded-xl">
                  该桌台暂无可选套餐
                </div>
              ) : availablePackages.map(p => {
                const active = p.id === packageId;
                const perMin = p.package_price / p.duration_minutes;
                const savings = p.original_price - p.package_price;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPackageId(p.id)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all overflow-hidden ${
                      active ? 'border-rose-500/60 bg-rose-50/60 -translate-y-0.5 shadow-md' : 'border-felt-100 bg-white hover:border-rose-300/50'
                    }`}
                  >
                    {savings > 0 && (
                      <div className="absolute top-2 right-2 badge bg-rose-500 text-white">
                        省¥{savings}
                      </div>
                    )}
                    <div className="font-bold text-felt-700 mb-1">{p.name}</div>
                    <div className="text-[11px] text-felt-500 mb-3">
                      时长 {p.duration_minutes} 分钟 · 约 {(perMin * 60).toFixed(0)}元/时
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-black text-rose-600">{formatMoney(p.package_price)}</span>
                      {savings > 0 && <span className="text-xs text-felt-400 line-through">{formatMoney(p.original_price)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="label">备注（可选）</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="如：客人说等朋友，稍后加球杆等"
          />
        </div>
      </div>
    </Modal>
  );
}
