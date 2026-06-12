import { useState } from 'react';
import {
  Plus, Edit3, Trash2, Search, Gift, UserPlus, CreditCard, Award, Gem, Crown,
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { formatMoney, uid } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Modal, { ConfirmDialog } from '@/components/Modal';
import type { Member, Package } from '@/types';

export default function Members() {
  const members = useBilliardStore(s => s.members);
  const packages = useBilliardStore(s => s.packages);
  const tables = useBilliardStore(s => s.tables);
  const upsertMember = useBilliardStore(s => s.upsertMember);
  const upsertPackage = useBilliardStore(s => s.upsertPackage);

  const [tab, setTab] = useState<'member' | 'package'>('member');
  const [search, setSearch] = useState('');
  const [mOpen, setMOpen] = useState(false);
  const [pOpen, setPOpen] = useState(false);
  const [mDel, setMDel] = useState<Member | null>(null);
  const [pDel, setPDel] = useState<Package | null>(null);
  const [recharge, setRecharge] = useState<{ m: Member; amount: number } | null>(null);

  const [mForm, setMForm] = useState<Partial<Member & { _id?: string }>>({});
  const [pForm, setPForm] = useState<Partial<Package & { _id?: string }>>({});

  const openEditMember = (m?: Member) => {
    setMForm(m ? { ...m, _id: m.id } : { level: 'silver', balance: 0, discount_rate: 0.9 });
    setMOpen(true);
  };
  const openEditPackage = (p?: Package) => {
    setPForm(p ? { ...p, _id: p.id } : { applicable_tables: tables.filter(t => t.hourly_rate <= 50).map(t => t.id) });
    setPOpen(true);
  };

  const saveMember = () => {
    if (!mForm.name?.trim() || !mForm.phone?.trim()) { showToast('请填写姓名和手机号', 'error'); return; }
    const id = (mForm as any)._id || uid('m');
    const data: Member = {
      id,
      name: mForm.name,
      phone: mForm.phone,
      level: (mForm.level as any) || 'silver',
      balance: mForm.balance ?? 0,
      discount_rate: mForm.discount_rate ?? 0.9,
    };
    upsertMember(data);
    showToast(`已保存会员 ${data.name}`, 'success');
    setMOpen(false);
  };
  const savePackage = () => {
    if (!pForm.name?.trim()) { showToast('请输入套餐名称', 'error'); return; }
    const id = (pForm as any)._id || uid('pkg');
    const data: Package = {
      id,
      name: pForm.name,
      duration_minutes: pForm.duration_minutes ?? 60,
      original_price: pForm.original_price ?? 0,
      package_price: pForm.package_price ?? 0,
      applicable_tables: pForm.applicable_tables ?? [],
    };
    upsertPackage(data);
    showToast(`已保存套餐 ${data.name}`, 'success');
    setPOpen(false);
  };
  const toggleTableInPkg = (tid: string) => {
    const cur = new Set(pForm.applicable_tables || []);
    cur.has(tid) ? cur.delete(tid) : cur.add(tid);
    setPForm({ ...pForm, applicable_tables: Array.from(cur) });
  };
  const doRecharge = () => {
    if (!recharge) return;
    const amount = recharge.amount;
    if (amount <= 0) { showToast('请输入充值金额', 'error'); return; }
    upsertMember({ ...recharge.m, balance: Math.round((recharge.m.balance + amount) * 100) / 100 });
    showToast(`${recharge.m.name} 充值成功 +${formatMoney(amount)}`, 'success');
    setRecharge(null);
  };

  const mList = members.filter(m =>
    !search || m.name.includes(search) || m.phone.includes(search)
  );
  const levelIcon = (lv: string) => lv === 'diamond' ? <Gem size={12} /> : lv === 'gold' ? <Crown size={12} /> : <Award size={12} />;
  const levelBadge = (lv: string) => {
    const c = lv === 'diamond' ? 'bg-sky-500/10 text-sky-600 border-sky-300/30'
              : lv === 'gold'    ? 'bg-gold-500/10 text-gold-700 border-gold-300/50'
                                    : 'bg-zinc-400/10 text-zinc-600 border-zinc-300/30';
    const t = lv === 'diamond' ? '钻石' : lv === 'gold' ? '金卡' : '银卡';
    return <span className={`chip ${c} gap-1`}>{levelIcon(lv)}{t}会员</span>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-felt-700">会员 & 套餐</h1>
          <p className="text-xs text-felt-500 mt-0.5">会员折扣、余额充值，包时套餐管理</p>
        </div>
        <div className="flex gap-2">
          {tab === 'member' ? (
            <button className="btn-primary" onClick={() => openEditMember()}>
              <UserPlus size={16} /> 新增会员
            </button>
          ) : (
            <button className="btn-primary" onClick={() => openEditPackage()}>
              <Gift size={16} /> 新增套餐
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 inline-flex p-1 bg-cream-100 rounded-xl">
        <button
          onClick={() => setTab('member')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'member' ? 'bg-white shadow text-felt-700' : 'text-felt-500 hover:text-felt-700'
          }`}
        >👥 会员管理</button>
        <button
          onClick={() => setTab('package')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'package' ? 'bg-white shadow text-felt-700' : 'text-felt-500 hover:text-felt-700'
          }`}
        >🎁 包时套餐</button>
      </div>

      {tab === 'member' ? (
        <div>
          <div className="card overflow-hidden">
            <div className="p-4 bg-cream-50/60 border-b border-cream-200 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-felt-400" />
                <input className="input pl-9 !py-2" placeholder="搜索姓名/手机号" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="ml-auto text-xs text-felt-500">共 {mList.length} 名会员</div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-50 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200">
                  <th className="text-left py-3 px-5 font-semibold">会员</th>
                  <th className="text-left py-3 px-4 font-semibold">等级</th>
                  <th className="text-right py-3 px-4 font-semibold">余额</th>
                  <th className="text-center py-3 px-4 font-semibold">折扣</th>
                  <th className="text-right py-3 px-5 font-semibold w-44">操作</th>
                </tr>
              </thead>
              <tbody>
                {mList.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-felt-400">暂无会员</td></tr>
                ) : mList.map(m => (
                  <tr key={m.id} className="border-b border-cream-100 hover:bg-cream-50/40">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold ${
                          m.level === 'diamond' ? 'bg-sky-500/15 text-sky-600' :
                          m.level === 'gold'    ? 'bg-gold-500/15 text-gold-700'
                                                : 'bg-zinc-400/15 text-zinc-600'
                        }`}>{m.name[0]}</div>
                        <div>
                          <div className="font-semibold text-felt-700">{m.name}</div>
                          <div className="text-xs text-felt-400">{m.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{levelBadge(m.level)}</td>
                    <td className="py-3 px-4 text-right font-serif font-bold text-felt-700 text-lg">{formatMoney(m.balance)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="badge bg-felt-500/10 text-felt-600">{(m.discount_rate * 10).toFixed(1)} 折</span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => setRecharge({ m, amount: 100 })} className="p-1.5 rounded hover:bg-gold-500/10 text-gold-600" title="充值">
                          <CreditCard size={15} />
                        </button>
                        <button onClick={() => openEditMember(m)} className="p-1.5 rounded hover:bg-felt-500/10 text-felt-500" title="编辑">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => setMDel(m)} className="p-1.5 rounded hover:bg-danger-500/10 text-danger-500" title="停用">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(p => {
            const applicable = tables.filter(t => p.applicable_tables.includes(t.id));
            return (
              <div key={p.id} className="card p-5 border-2 border-felt-100 hover:border-gold-500/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                    <Gift size={22} />
                  </div>
                  <div className="inline-flex gap-1">
                    <button onClick={() => openEditPackage(p)} className="p-1.5 rounded hover:bg-felt-500/10 text-felt-500"><Edit3 size={14} /></button>
                    <button onClick={() => setPDel(p)} className="p-1.5 rounded hover:bg-danger-500/10 text-danger-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="font-serif text-xl font-bold text-felt-700">{p.name}</div>
                <div className="text-xs text-felt-500 mt-0.5">时长 {p.duration_minutes} 分钟（{(p.duration_minutes / 60).toFixed(1)}小时）</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-black text-rose-600">{formatMoney(p.package_price)}</span>
                  {p.original_price > p.package_price && (
                    <span className="text-sm text-felt-400 line-through">{formatMoney(p.original_price)}</span>
                  )}
                  {p.original_price > p.package_price && (
                    <span className="ml-auto badge bg-rose-500 text-white">省 {formatMoney(p.original_price - p.package_price)}</span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-cream-200 flex flex-wrap gap-1">
                  {applicable.map(t => (
                    <span key={t.id} className="chip border-felt-100 bg-felt-500/5 text-felt-600 text-[11px]">
                      {t.table_no}号·{t.name}
                    </span>
                  ))}
                  {applicable.length === 0 && <span className="text-xs text-felt-400">未选择适用桌台</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={mOpen}
        onClose={() => setMOpen(false)}
        title={mForm._id ? '编辑会员' : '新增会员'}
        size="md"
        footer={<><button className="btn-secondary" onClick={() => setMOpen(false)}>取消</button><button className="btn-primary" onClick={saveMember}>保存</button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">姓名</label>
            <input className="input" value={mForm.name || ''} onChange={e => setMForm({ ...mForm, name: e.target.value })} placeholder="如：张先生" />
          </div>
          <div>
            <label className="label">手机号</label>
            <input className="input" value={mForm.phone || ''} onChange={e => setMForm({ ...mForm, phone: e.target.value })} placeholder="13800138000" />
          </div>
          <div>
            <label className="label">会员等级</label>
            <select className="input" value={mForm.level} onChange={e => setMForm({ ...mForm, level: e.target.value as any })}>
              <option value="silver">🥈 银卡会员</option>
              <option value="gold">🥇 金卡会员</option>
              <option value="diamond">💎 钻石会员</option>
            </select>
          </div>
          <div>
            <label className="label">折扣率（0.75 即为 7.5折）</label>
            <input type="number" min={0} max={1} step={0.01} className="input" value={mForm.discount_rate ?? ''}
              onChange={e => setMForm({ ...mForm, discount_rate: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">账户余额（元）</label>
            <input type="number" min={0} step={0.01} className="input" value={mForm.balance ?? ''}
              onChange={e => setMForm({ ...mForm, balance: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={pOpen}
        onClose={() => setPOpen(false)}
        title={pForm._id ? '编辑套餐' : '新增套餐'}
        size="lg"
        footer={<><button className="btn-secondary" onClick={() => setPOpen(false)}>取消</button><button className="btn-primary" onClick={savePackage}>保存</button></>}
      >
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="col-span-2">
            <label className="label">套餐名称</label>
            <input className="input" value={pForm.name || ''} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="如：3小时畅打" />
          </div>
          <div>
            <label className="label">时长（分钟）</label>
            <input type="number" min={0} className="input" value={pForm.duration_minutes ?? ''}
              onChange={e => setPForm({ ...pForm, duration_minutes: parseInt(e.target.value) || 0 })} />
          </div>
          <div></div>
          <div>
            <label className="label">原价（元）</label>
            <input type="number" min={0} step={0.01} className="input" value={pForm.original_price ?? ''}
              onChange={e => setPForm({ ...pForm, original_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">套餐价（元）</label>
            <input type="number" min={0} step={0.01} className="input" value={pForm.package_price ?? ''}
              onChange={e => setPForm({ ...pForm, package_price: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <label className="label">适用桌台（多选）</label>
          <div className="grid grid-cols-4 gap-2">
            {tables.map(t => {
              const active = (pForm.applicable_tables || []).includes(t.id);
              return (
                <button key={t.id} onClick={() => toggleTableInPkg(t.id)}
                  className={`rounded-lg border-2 p-2.5 text-left transition-all ${
                    active ? 'border-felt-500 bg-felt-500/5' : 'border-felt-100 hover:border-felt-300'
                  }`}>
                  <div className="font-serif font-bold text-felt-700">{t.table_no}号</div>
                  <div className="text-[11px] text-felt-500">{t.name} · {formatMoney(t.hourly_rate)}/时</div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!recharge}
        onClose={() => setRecharge(null)}
        title={`为 ${recharge?.m.name} 充值`}
        size="sm"
        footer={<><button className="btn-secondary" onClick={() => setRecharge(null)}>取消</button><button className="btn-gold" onClick={doRecharge}>确认充值</button></>}
      >
        <div className="text-xs text-felt-500 mb-1">当前余额</div>
        <div className="font-serif font-black text-3xl text-felt-700 mb-4">{formatMoney(recharge?.m.balance ?? 0)}</div>
        <div className="label">充值金额</div>
        <input type="number" min={0} step={50} className="input !py-3 text-lg font-mono font-bold"
          value={recharge?.amount ?? ''}
          onChange={e => setRecharge(r => r ? { ...r, amount: parseFloat(e.target.value) || 0 } : null)} />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[100, 200, 500, 1000].map(v => (
            <button key={v} onClick={() => setRecharge(r => r ? { ...r, amount: v } : null)}
              className={`chip border-felt-100 hover:border-gold-500/50 hover:bg-gold-500/5 justify-center ${recharge?.amount === v ? '!border-gold-500 !bg-gold-500/10 !text-gold-700' : ''}`}>
              ¥{v}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={!!mDel} onClose={() => setMDel(null)} danger
        onConfirm={() => { if (mDel) { upsertMember({ ...mDel, discount_rate: 1, balance: 0 }); showToast('已停用会员（余额清零，恢复原价）', 'info'); } setMDel(null); }}
        title="停用会员？" message={<>确定停用「{mDel?.name}」？<br /><span className="text-xs text-felt-500">系统会将其账户清零、折扣设为无折扣。</span></>} />
      <ConfirmDialog open={!!pDel} onClose={() => setPDel(null)} danger
        onConfirm={() => { if (pDel) { upsertPackage({ ...pDel, applicable_tables: [] }); showToast('已停用该套餐（移除适用桌台）', 'info'); } setPDel(null); }}
        title="停用套餐？" message={<>确定停用「{pDel?.name}」？<br /><span className="text-xs text-felt-500">将清空适用桌台列表，已开台不受影响。</span></>} />
    </div>
  );
}
