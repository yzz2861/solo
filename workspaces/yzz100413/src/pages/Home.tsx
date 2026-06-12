import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Coffee, Pause, Play, ArrowRightLeft, Receipt, AlertTriangle } from 'lucide-react';
import type { BilliardTable, OrderSession } from '@/types';
import { useBilliardStore } from '@/store';
import { useNowTick, useSessionSeconds } from '@/hooks/useTick';
import { formatDuration, formatMoney } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/Toast';
import OpenTableModal, { OpenTableParams } from '@/components/OpenTableModal';

function TableCard({ table, onOpenTable }: { table: BilliardTable; onOpenTable: (id: string) => void }) {
  const navigate = useNavigate();
  const now = useNowTick(1000);
  const sessions = useBilliardStore(s => s.sessions);
  const checkouts = useBilliardStore(s => s.checkouts);
  const getFeePreview = useBilliardStore(s => s.getTableFeePreview);
  const getGrand = useBilliardStore(s => s.getSessionGrandTotal);
  const items = useBilliardStore(s => s.items);
  const pauses = useBilliardStore(s => s.pauses);
  const settings = useBilliardStore(s => s.settings);

  const session = sessions.find(s => s.table_id === table.id && !checkouts.some(c => c.session_id === s.id));
  const sessionSeconds = useSessionSeconds(session?.id);
  const openPause = session ? pauses.find(p => p.session_id === session.id && !p.pause_end) : null;
  const pauseMin = openPause ? Math.floor((now.getTime() - new Date(openPause.pause_start).getTime()) / 60000) : 0;
  const pauseOverdue = openPause && pauseMin >= settings.pause_reminder_minutes;

  const itemCount = session ? items.filter(i => i.session_id === session.id && i.delivery_status !== 'cancelled').reduce((s, i) => s + i.quantity, 0) : 0;
  const tableFee = session ? getFeePreview(session.id, now) : 0;
  const grand = session ? getGrand(session.id, now) : 0;

  const statusMap = {
    idle: {
      bg: 'bg-gradient-to-br from-felt-50 to-cream-100 border-felt-100 hover:border-gold-500/50',
      dot: 'bg-felt-500',
      text: '空闲',
      textColor: 'text-felt-600',
    },
    occupied: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 border-warn-500/40',
      dot: 'bg-warn-500 animate-pulse',
      text: '占用中',
      textColor: 'text-warn-600',
    },
    paused: {
      bg: pauseOverdue
        ? 'bg-gradient-to-br from-red-50 to-rose-50 border-danger-500/60 animate-pulseWarn'
        : 'bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-400/40',
      dot: pauseOverdue ? 'bg-danger-500 animate-pulse' : 'bg-sky-500',
      text: pauseOverdue ? '暂停超时' : '已暂停',
      textColor: pauseOverdue ? 'text-danger-600' : 'text-sky-600',
    },
    maintenance: {
      bg: 'bg-gradient-to-br from-gray-50 to-zinc-100 border-zinc-300',
      dot: 'bg-zinc-400',
      text: '维护中',
      textColor: 'text-zinc-500',
    },
  }[table.status];

  return (
    <div
      onClick={() => table.status === 'idle' ? onOpenTable(table.id) : navigate(`/table/${table.id}`)}
      className={`card p-5 cursor-pointer border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-table-card ${statusMap.bg}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`status-dot ${statusMap.dot}`}></span>
            <span className={`text-xs font-semibold ${statusMap.textColor}`}>{statusMap.text}</span>
          </div>
          <div className="font-serif text-3xl font-black text-felt-700 leading-none">{table.table_no}</div>
          <div className="text-xs text-felt-500 mt-1">{table.name} · {formatMoney(table.hourly_rate)}/时</div>
        </div>
        {table.status === 'idle' && (
          <div className="w-11 h-11 rounded-xl bg-felt-500/10 text-felt-600 flex items-center justify-center">
            <Plus size={22} />
          </div>
        )}
      </div>

      {session ? (
        <div className="space-y-2.5 pt-2 border-t border-black/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-felt-500">
              <Clock size={13} />
              <span>已计时</span>
            </div>
            <span className="font-mono font-bold text-felt-700 text-sm tabular-nums">
              {openPause ? (
                <span className="flex items-center gap-1">
                  {pauseOverdue ? <AlertTriangle size={12} className="text-danger-500" /> : <Pause size={12} className="text-sky-500" />}
                  <span className={pauseOverdue ? 'text-danger-600' : 'text-sky-600'}>
                    暂停{pauseMin}分
                  </span>
                </span>
              ) : formatDuration(sessionSeconds)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-felt-500">
              <Coffee size={13} />
              <span>商品 {itemCount} 件</span>
            </div>
            <span className="font-semibold text-felt-600">{formatMoney(tableFee)}</span>
          </div>
          <div className="pt-2 mt-2 border-t border-dashed border-black/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-felt-500">消费合计</span>
              <span className="font-serif text-xl font-black text-felt-700">{formatMoney(grand)}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={e => { e.stopPropagation(); navigate(`/table/${table.id}`); }}
              className="text-[11px] py-1.5 rounded-md bg-white/80 border border-felt-100 hover:bg-felt-500/10 text-felt-600 flex items-center justify-center gap-1"
            >
              <Play size={11} /> 详情
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate(`/table/${table.id}`); }}
              className="text-[11px] py-1.5 rounded-md bg-white/80 border border-felt-100 hover:bg-felt-500/10 text-felt-600 flex items-center justify-center gap-1"
            >
              <ArrowRightLeft size={11} /> 换桌
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate(`/checkout/${session.id}`); }}
              className="text-[11px] py-1.5 rounded-md bg-felt-500 text-white hover:bg-felt-600 flex items-center justify-center gap-1"
            >
              <Receipt size={11} /> 结账
            </button>
          </div>
        </div>
      ) : table.status === 'idle' ? (
        <div className="text-center py-4 border-t border-dashed border-felt-200/80">
          <div className="text-xs text-felt-400 mb-2">点击此桌快速开台</div>
          <div className="inline-flex items-center gap-1 text-xs text-gold-600 font-semibold">
            <Plus size={12} /> 立即开台
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const tables = useBilliardStore(s => s.tables);
  const startSession = useBilliardStore(s => s.startSession);
  const resumeSession = useBilliardStore(s => s.resumeSession);
  const sessions = useBilliardStore(s => s.sessions);
  const pauses = useBilliardStore(s => s.pauses);
  const checkouts = useBilliardStore(s => s.checkouts);
  const settings = useBilliardStore(s => s.settings);
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const now = useNowTick(5000);

  useEffect(() => {
    const allOpenSessions = sessions.filter(s => !checkouts.some(c => c.session_id === s.id));
    for (const session of allOpenSessions) {
      const openPause = pauses.find(p => p.session_id === session.id && !p.pause_end);
      if (openPause && !openPause.reminded) {
        const pauseMin = (now.getTime() - new Date(openPause.pause_start).getTime()) / 60000;
        if (pauseMin >= settings.pause_reminder_minutes) {
          const table = tables.find(t => t.id === session.table_id);
          showToast(`⚠️ ${table?.name ?? ''} 已暂停 ${Math.floor(pauseMin)} 分钟，请确认客人是否还在`, 'warning');
        }
      }
    }
  }, [now, sessions, pauses, checkouts, tables, settings]);

  const handleOpenTable = (params: OpenTableParams) => {
    if (!openTableId) return;
    const r = startSession(openTableId, params.customerType, params.memberId, params.packageId, params.note);
    if (r.ok) {
      showToast(r.message, 'success');
      setOpenTableId(null);
      setAutoOpen(true);
      setTimeout(() => setAutoOpen(false), 500);
      if (r.sessionId && params.autoCheckout) {
        // no-op
      }
    } else {
      showToast(r.message, 'error');
    }
  };

  const stats = useMemo(() => {
    const openSessions = sessions.filter(s => !checkouts.some(c => c.session_id === s.id));
    let todayRevenue = 0;
    let todayCount = 0;
    const todayIso = new Date().toISOString().slice(0, 10);
    checkouts.forEach(c => {
      if (c.checkout_time.slice(0, 10) === todayIso) {
        todayRevenue += c.final_total;
        todayCount += 1;
      }
    });
    let pendingDelivery = 0;
    openSessions.forEach(s => {
      pendingDelivery += useBilliardStore.getState().items.filter(i => i.session_id === s.id && i.delivery_status === 'pending').length;
    });
    return {
      total: tables.length,
      idle: tables.filter(t => t.status === 'idle').length,
      occupied: tables.filter(t => t.status === 'occupied' || t.status === 'paused').length,
      openSessions: openSessions.length,
      todayCount,
      todayRevenue,
      pendingDelivery,
    };
  }, [tables, sessions, checkouts]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-felt-500/10 text-felt-600 flex items-center justify-center text-xl">🎱</div>
          <div>
            <div className="text-xs text-felt-500">总桌台</div>
            <div className="font-serif text-2xl font-bold text-felt-700">{stats.total}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-felt-500 text-white flex items-center justify-center text-xl">🟢</div>
          <div>
            <div className="text-xs text-felt-500">空闲</div>
            <div className="font-serif text-2xl font-bold text-felt-600">{stats.idle}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warn-500/15 text-warn-600 flex items-center justify-center text-xl">🟠</div>
          <div>
            <div className="text-xs text-felt-500">占用</div>
            <div className="font-serif text-2xl font-bold text-warn-600">{stats.occupied}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center"><Receipt size={22} /></div>
          <div>
            <div className="text-xs text-felt-500">今日单量</div>
            <div className="font-serif text-2xl font-bold text-sky-600">{stats.todayCount}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 col-span-2">
          <div className="w-11 h-11 rounded-xl bg-gold-500 text-felt-900 flex items-center justify-center font-serif font-black">¥</div>
          <div className="flex-1">
            <div className="text-xs text-felt-500">今日营收</div>
            <div className="font-serif text-2xl font-bold text-felt-700">{formatMoney(stats.todayRevenue)}</div>
          </div>
          {stats.pendingDelivery > 0 && (
            <div className="chip border-danger-500/40 bg-danger-500/5 text-danger-600">
              <Coffee size={12} />
              <span className="text-xs font-semibold">待配送 {stats.pendingDelivery}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-felt-700">桌台总览</h2>
          <p className="text-xs text-felt-500 mt-0.5">点击桌台卡片可快速开台、查看详情或结账</p>
        </div>
      </div>

      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${autoOpen ? '' : ''}`}>
        {tables.map(t => <TableCard key={t.id} table={t} onOpenTable={setOpenTableId} />)}
      </div>

      <OpenTableModal
        open={!!openTableId}
        tableId={openTableId}
        onClose={() => setOpenTableId(null)}
        onSubmit={handleOpenTable}
      />
    </div>
  );
}
