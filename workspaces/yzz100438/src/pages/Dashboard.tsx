import { useEffect } from 'react';
import {
  Tent,
  Undo2,
  Sparkles,
  ClipboardCheck,
  Boxes,
  Clock,
  AlertTriangle,
  HandCoins,
  Droplets,
} from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import {
  categoryEmoji,
  cleaningLabel,
  cleaningColor,
  formatDateTime,
  hoursSince,
  currency,
} from '@/components/ui/helpers';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, gradient, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${gradient} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm opacity-90 font-medium">{label}</div>
          <div className="font-display text-4xl mt-2">{value}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
    </button>
  );
}

export default function Dashboard() {
  const { stats, pendingCleaning, loadStats, loadPendingCleaning, setCleaningStatus, showToast, loadActiveRentals, activeRentals } =
    useRentalStore();

  useEffect(() => {
    void loadStats();
    void loadPendingCleaning();
    void loadActiveRentals();
  }, [loadStats, loadPendingCleaning, loadActiveRentals]);

  async function handleCleaning(id: number, status: 'in_progress' | 'done') {
    try {
      await setCleaningStatus(id, status);
      showToast('success', status === 'done' ? '已标记为已清洁，装备可再次出租' : '已开始清洁');
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="今日租出"
          value={stats?.todayRented ?? 0}
          icon={Tent}
          gradient="bg-gradient-to-br from-forest-600 to-forest-800"
        />
        <StatCard
          label="今日归还"
          value={stats?.todayReturned ?? 0}
          icon={Undo2}
          gradient="bg-gradient-to-br from-ember-500 to-ember-700"
        />
        <StatCard
          label="待清洁装备"
          value={stats?.pendingCleaning ?? 0}
          icon={Sparkles}
          gradient="bg-gradient-to-br from-amber-500 to-amber-700"
        />
        <StatCard
          label="待审批赔损"
          value={stats?.pendingClaims ?? 0}
          icon={ClipboardCheck}
          gradient="bg-gradient-to-br from-rose-500 to-rose-700"
        />
        <StatCard
          label="可租装备"
          value={stats?.availableEquipment ?? 0}
          icon={Boxes}
          gradient="bg-gradient-to-br from-teal-600 to-teal-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl text-bark-800 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-ember-600" />
                待清洁队列
              </h2>
              <p className="text-xs text-bark-400 mt-0.5">
                按归还时间排序，先清洁最早归还的装备
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-ember-50 text-ember-700 text-xs font-semibold border border-ember-100">
              {pendingCleaning.length} 件待处理
            </span>
          </div>

          {pendingCleaning.length === 0 ? (
            <div className="text-center py-16 text-bark-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>所有装备都已清洁完成 🎉</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pendingCleaning.map((item, idx) => {
                const eq = item.equipment;
                const hrs = hoursSince(item.returnedAt!);
                const urgent = hrs > 18;
                return (
                  <li
                    key={item.id}
                    className="group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-soft animate-slide-in"
                    style={{
                      animationDelay: `${idx * 40}ms`,
                      borderColor: urgent ? '#f5a366' : '#ebe3cf',
                      background: urgent
                        ? 'linear-gradient(90deg, rgba(255,229,209,0.5), transparent 60%)'
                        : '#fff',
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                          urgent ? 'bg-ember-100' : 'bg-forest-50'
                        }`}
                      >
                        {eq ? categoryEmoji[eq.category] : '📦'}
                      </div>
                      <div className="w-0.5 flex-1 mt-2 bg-cream-200 rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-bark-800">
                          {eq?.name || '装备 #' + item.equipmentId}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            cleaningColor[item.cleaningStatus || 'pending']
                          }`}
                        >
                          {cleaningLabel[item.cleaningStatus || 'pending']}
                        </span>
                        {urgent && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            超 {Math.floor(hrs)}h
                          </span>
                        )}
                        {item.damageNotes && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            有赔损备注
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bark-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          归还于 {formatDateTime(item.returnedAt)}
                        </span>
                        {item.missingAccessories && item.missingAccessories.length > 0 && (
                          <span>缺失配件：{item.missingAccessories.join('、')}</span>
                        )}
                      </div>

                      {item.damageNotes && (
                        <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {item.damageNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {item.cleaningStatus !== 'in_progress' && (
                        <button
                          onClick={() => handleCleaning(item.id, 'in_progress')}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                        >
                          开始清洁
                        </button>
                      )}
                      <button
                        onClick={() => handleCleaning(item.id, 'done')}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-forest-700 text-white hover:bg-forest-800 transition-colors shadow-soft"
                      >
                        已清洁
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl text-bark-800 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-forest-700" />
              进行中租单
            </h2>
            <span className="text-xs text-bark-400">{activeRentals.length} 单</span>
          </div>

          {activeRentals.length === 0 ? (
            <div className="text-center py-12 text-bark-400 text-sm">暂无进行中租单</div>
          ) : (
            <ul className="space-y-3">
              {activeRentals.map((r) => (
                <li
                  key={r.id}
                  className="p-3.5 rounded-xl border border-cream-200 bg-white hover:border-forest-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-bark-800 text-sm">{r.renterName}</span>
                    <span className="text-[11px] text-bark-400">#{r.id}</span>
                  </div>
                  <div className="text-xs text-bark-500 space-y-1">
                    <div>{r.renterPhone}</div>
                    <div className="flex flex-wrap gap-1">
                      {r.items.slice(0, 4).map((it) => (
                        <span
                          key={it.id}
                          className="px-2 py-0.5 rounded-md bg-cream-100 text-bark-600 text-[11px]"
                        >
                          {it.equipment
                            ? categoryEmoji[it.equipment.category] + ' ' + it.equipment.name.split(' ')[0]
                            : '#' + it.equipmentId}
                        </span>
                      ))}
                      {r.items.length > 4 && (
                        <span className="text-[11px] text-bark-400">+{r.items.length - 4}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-bark-500">
                        {r.startDate} ~ {r.endDate}
                      </span>
                      <span className="font-semibold text-forest-700">{currency(r.deposit)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
