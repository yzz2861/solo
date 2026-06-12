import { useState } from 'react';
import {
  Settings as SettingsIcon, Table, Clock, Save, Database, RefreshCw, Shield,
  Palette, Trash2, AlertTriangle, Download, Upload,
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { formatMoney, uid } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/Modal';
import type { BilliardTable, RoundMode } from '@/types';

export default function SettingsPage() {
  const tables = useBilliardStore(s => s.tables);
  const operators = useBilliardStore(s => s.operators);
  const settings = useBilliardStore(s => s.settings);
  const currentOpId = useBilliardStore(s => s.current_operator_id);
  const updateSettings = useBilliardStore(s => s.updateSettings);
  const hydrateFromIDB = useBilliardStore(s => s.hydrateFromIDB);
  const saveToIDB = useBilliardStore(s => s.saveToIDB);

  const [pauseMin, setPauseMin] = useState(settings.pause_reminder_minutes);
  const [defaultRate, setDefaultRate] = useState(settings.default_hourly_rate);
  const [roundMin, setRoundMin] = useState(settings.round_minutes);
  const [roundMode, setRoundMode] = useState<RoundMode>(settings.round_mode);
  const [storeName, setStoreName] = useState(settings.store_name);
  const [printFooter, setPrintFooter] = useState(settings.print_footer);

  const [tablesDraft, setTablesDraft] = useState<BilliardTable[]>(tables.map(t => ({ ...t })));
  const [resetConfirm, setResetConfirm] = useState(false);
  const [needExport, setNeedExport] = useState(false);

  const currentOp = operators.find(o => o.id === currentOpId);
  const isAdmin = currentOp?.role === 'admin';

  const addTable = () => {
    if (!isAdmin) { showToast('仅管理员可编辑桌台', 'error'); return; }
    const newNo = (tablesDraft.at(-1)?.table_no ?? 0) + 1;
    const nt: BilliardTable = {
      id: uid('tbl'), table_no: newNo, name: `普台${newNo}`,
      status: 'idle', hourly_rate: settings.default_hourly_rate,
    };
    setTablesDraft([...tablesDraft, nt]);
  };
  const updateTable = (id: string, patch: Partial<BilliardTable>) => {
    if (!isAdmin) return;
    setTablesDraft(list => list.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const removeTable = (id: string) => {
    if (!isAdmin) return;
    const t = tablesDraft.find(x => x.id === id);
    if (t && t.status !== 'idle') { showToast('只能删除空闲状态的桌台', 'error'); return; }
    setTablesDraft(list => list.filter(x => x.id !== id));
  };

  const saveAll = async () => {
    if (!isAdmin) { showToast('仅管理员可修改设置', 'error'); return; }
    for (const t of tablesDraft) {
      if (!t.name.trim() || !t.table_no) { showToast('桌台名称或编号有误', 'error'); return; }
      if (t.hourly_rate < 0) { showToast('费率不能为负', 'error'); return; }
    }
    const ids = new Set(tablesDraft.map(t => t.table_no));
    if (ids.size !== tablesDraft.length) { showToast('桌号存在重复', 'error'); return; }

    updateSettings({
      pause_reminder_minutes: pauseMin,
      default_hourly_rate: defaultRate,
      round_minutes: roundMin,
      round_mode: roundMode,
      store_name: storeName.trim(),
      print_footer: printFooter.trim(),
    });
    useBilliardStore.setState({ tables: tablesDraft });
    await saveToIDB();
    showToast('设置已保存并同步到本地数据库', 'success');
  };

  const exportAllData = () => {
    const state = useBilliardStore.getState();
    const data = {
      exported_at: new Date().toISOString(),
      tables: state.tables, sessions: state.sessions, items: state.items,
      transfers: state.transfers, pauses: state.pauses, products: state.products,
      members: state.members, packages: state.packages, checkouts: state.checkouts,
      revocations: state.revocations, operators: state.operators, settings: state.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `台球厅数据备份_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !data.tables) throw new Error('文件格式无效');
      if (!window.confirm('确认导入？会覆盖当前所有数据（除当前操作员会话）')) return;
      const curOp = useBilliardStore.getState().current_operator_id;
      useBilliardStore.setState({
        tables: data.tables ?? [], sessions: data.sessions ?? [], items: data.items ?? [],
        transfers: data.transfers ?? [], pauses: data.pauses ?? [], products: data.products ?? [],
        members: data.members ?? [], packages: data.packages ?? [], checkouts: data.checkouts ?? [],
        revocations: data.revocations ?? [], operators: data.operators ?? [],
        settings: data.settings ?? settings, current_operator_id: curOp,
      });
      await saveToIDB();
      showToast('导入成功', 'success');
    } catch (e: any) {
      showToast(`导入失败：${e.message}`, 'error');
    }
  };

  const resetLive = async () => {
    const openSessions = useBilliardStore.getState().sessions.filter(s =>
      !useBilliardStore.getState().checkouts.some(c => c.session_id === s.id)
    );
    if (openSessions.length > 0 && !window.confirm(`存在 ${openSessions.length} 个未结订单，确认清空？将导致数据丢失！`)) return;
    const activeIds = new Set(openSessions.map(s => s.table_id));
    useBilliardStore.setState(st => ({
      tables: st.tables.map(t => activeIds.has(t.id) ? { ...t, status: 'idle' as const } : t),
      sessions: [], items: [], transfers: [], pauses: [],
    }));
    await saveToIDB();
    setResetConfirm(false);
    showToast('已重置当前桌台状态', 'success');
  };

  const reloadFromIDB = async () => {
    await hydrateFromIDB();
    setTablesDraft(useBilliardStore.getState().tables.map(t => ({ ...t })));
    const s = useBilliardStore.getState().settings;
    setPauseMin(s.pause_reminder_minutes);
    setDefaultRate(s.default_hourly_rate);
    setRoundMin(s.round_minutes);
    setRoundMode(s.round_mode);
    setStoreName(s.store_name);
    setPrintFooter(s.print_footer);
    showToast('已从本地数据库重新加载', 'info');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-felt-700 flex items-center gap-2">
            <SettingsIcon className="text-gold-600" size={24} /> 系统设置
          </h1>
          <p className="text-xs text-felt-500 mt-0.5">
            桌台、计费规则、提醒阈值；所有数据均保存在浏览器本地（localStorage + IndexedDB）
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={reloadFromIDB}>
            <RefreshCw size={14} /> 从 IDB 重载
          </button>
          <button className="btn-secondary" onClick={exportAllData}>
            <Download size={14} /> 导出备份
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload size={14} /> 导入备份
            <input type="file" accept="application/json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
          </label>
          <button className="btn-primary" onClick={saveAll}>
            <Save size={14} /> 保存设置
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-xl bg-warn-500/5 border border-warn-500/30 p-4 mb-5 flex items-start gap-3">
          <Shield size={20} className="text-warn-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-warn-600">当前为收银员权限</div>
            <div className="text-xs text-warn-500 mt-0.5">可查看设置，修改后保存需要管理员权限。请切换「老板」账号登录。</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-gold-600" />
            <h2 className="font-serif font-bold text-lg text-felt-700">店铺信息</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">店铺名称</label>
              <input className="input" value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
            <div>
              <label className="label">小票页脚文字</label>
              <input className="input" value={printFooter} onChange={e => setPrintFooter(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gold-600" />
            <h2 className="font-serif font-bold text-lg text-felt-700">计费与提醒规则</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">默认小时费率（元）</label>
              <input type="number" min={0} step={1} className="input"
                value={defaultRate} onChange={e => setDefaultRate(parseInt(e.target.value) || 0)} />
              <div className="text-[11px] text-felt-400 mt-1">新增桌台时的默认值</div>
            </div>
            <div>
              <label className="label">暂停超时提醒（分钟）</label>
              <input type="number" min={1} step={1} className="input"
                value={pauseMin} onChange={e => setPauseMin(parseInt(e.target.value) || 30)} />
            </div>
            <div>
              <label className="label">计费最小单位（分钟）</label>
              <input type="number" min={1} step={1} className="input"
                value={roundMin} onChange={e => setRoundMin(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="label">取整方式</label>
              <select className="input" value={roundMode} onChange={e => setRoundMode(e.target.value as RoundMode)}>
                <option value="up">向上取整（不足按单位记）</option>
                <option value="nearest">四舍五入</option>
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-felt-500/5 border border-felt-500/20 p-3 text-xs text-felt-600 space-y-1">
            <div>• 计费公式：实际时长 = (当前时间 - 开台时间 - 累计暂停) ，按取整规则处理</div>
            <div>• 会员折扣只作用于<strong>桌费</strong>，不影响商品价格</div>
            <div>• 包时套餐：未超时长按套餐价，超出部分按桌费率叠加</div>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Table size={18} className="text-gold-600" />
              <h2 className="font-serif font-bold text-lg text-felt-700">桌台配置</h2>
              <span className="badge bg-felt-500/10 text-felt-600 ml-2">{tablesDraft.length} 张</span>
            </div>
            <button className="btn-secondary !py-2 text-xs" onClick={addTable}>
              <Save size={12} /> + 新增桌台
            </button>
          </div>
          <div className="overflow-auto scrollbar-thin max-h-96 rounded-xl border border-cream-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-cream-50 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200 z-10">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">桌号</th>
                  <th className="text-left py-3 px-4 font-semibold">名称</th>
                  <th className="text-left py-3 px-4 font-semibold">状态</th>
                  <th className="text-right py-3 px-4 font-semibold">小时费率</th>
                  <th className="py-3 px-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {tablesDraft.map(t => (
                  <tr key={t.id} className="border-b border-cream-100">
                    <td className="py-2.5 px-4 w-24">
                      <input type="number" min={1} className="input !py-1.5 font-serif font-bold"
                        value={t.table_no} onChange={e => updateTable(t.id, { table_no: parseInt(e.target.value) || 0 })} />
                    </td>
                    <td className="py-2.5 px-4">
                      <input className="input !py-1.5" value={t.name}
                        onChange={e => updateTable(t.id, { name: e.target.value })} />
                    </td>
                    <td className="py-2.5 px-4 w-36">
                      <select className="input !py-1.5" value={t.status} disabled={t.status !== 'idle' && t.status !== 'maintenance'}
                        onChange={e => updateTable(t.id, { status: e.target.value as any })}>
                        <option value="idle">🟢 空闲</option>
                        <option value="occupied">🟠 占用（不可直接设置）</option>
                        <option value="paused">🔵 暂停（不可直接设置）</option>
                        <option value="maintenance">⚪ 维护中</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 w-40">
                      <div className="flex items-center">
                        <span className="text-felt-400 mr-2">¥</span>
                        <input type="number" min={0} step={1} className="input !py-1.5 font-mono"
                          value={t.hourly_rate} onChange={e => updateTable(t.id, { hourly_rate: parseInt(e.target.value) || 0 })} />
                        <span className="text-felt-400 ml-2">/时</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button onClick={() => removeTable(t.id)}
                        className="p-1.5 rounded hover:bg-danger-500/10 text-danger-500"
                        disabled={t.status !== 'idle'}
                        title={t.status !== 'idle' ? '非空闲状态不可删除' : '删除此桌'}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {tablesDraft.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-felt-400">请先添加桌台</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-felt-500">
              提示：桌号不可重复；处于占用/暂停状态的桌台不可删除或改状态
            </div>
            <button onClick={() => setResetConfirm(true)} className="btn-danger !py-2 text-xs">
              <AlertTriangle size={12} /> 清空所有桌台占用状态
            </button>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-gold-600" />
            <h2 className="font-serif font-bold text-lg text-felt-700">数据存储与安全</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-cream-50 border border-cream-200 p-4 space-y-1.5 text-xs text-felt-600">
              <div className="font-semibold text-sm text-felt-700 mb-1">💾 数据存储说明</div>
              <div>• 实时状态（桌台/未结订单）每 30 秒 + 操作后自动写入 <code className="bg-white px-1 rounded">localStorage</code> 与 IndexedDB</div>
              <div>• 关闭浏览器 / 断网 重开后，数据<strong>自动恢复</strong></div>
              <div>• 历史订单/撤销记录永不丢失（除非手动「导入覆盖」）</div>
              <div>• 建议：<strong>每天日结后点击「导出备份」保存一份 JSON</strong></div>
            </div>
            <div className="rounded-xl bg-gold-500/5 border border-gold-500/20 p-4 space-y-1.5 text-xs text-gold-700">
              <div className="font-semibold text-sm text-gold-700 mb-1">🛡️ 防呆防错清单</div>
              <div>• 桌台占用时，开台自动拦截并提示</div>
              <div>• 换桌仅允许选择空闲目标桌，并二次确认</div>
              <div>• 暂停超时 {settings.pause_reminder_minutes} 分钟触发前台提醒 + 弹窗</div>
              <div>• 结账「锁定金额」后禁止修改折扣</div>
              <div>• 撤销订单必须管理员密码 + 记录原因</div>
              <div>• 日结前检查是否存在未结订单（阻断）</div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={resetLive}
        danger
        title="确认清空所有桌台状态？"
        message={
          <>
            该操作会<strong>重置所有桌台为空闲</strong>，并清空所有未结会话、订单项、暂停记录。
            <div className="mt-2 text-xs text-danger-500">⚠️ 这是破坏性操作，可能导致正在进行的订单丢失！</div>
          </>
        }
        confirmText="确认清空"
      />
    </div>
  );
}
