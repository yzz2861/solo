import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/app';
import { BookOpen, LayoutGrid, LineChart, BarChart3, ChevronRight, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { dayjs } from '@/utils';
import { useMemo } from 'react';

interface EntryCardProps {
  to: string;
  title: string;
  description: string;
  icon: unknown;
  gradient: string;
  onClick?: () => void;
  quickInfo?: string;
}

function RoleCard({ to, title, description, icon, gradient, onClick, quickInfo }: EntryCardProps) {
  const Icon = icon as typeof BookOpen;
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl card-shadow transition-all duration-300 hover:card-shadow-hover hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-black/5 blur-2xl" />
      <div className="relative flex min-h-[220px] flex-col justify-between p-7">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur text-white shadow-inner">
            <Icon size={28} />
          </div>
          <ChevronRight className="text-white/70 transition-transform group-hover:translate-x-1" size={22} />
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-white/80 leading-relaxed">{description}</p>
          {quickInfo && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur">
              <Sparkles size={12} />
              {quickInfo}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const seats = useAppStore((s) => s.seats);
  const violations = useAppStore((s) => s.violations);
  const reservations = useAppStore((s) => s.reservations);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const stats = useMemo(() => {
    const total = seats.length;
    const available = seats.filter((s) => s.status === 'available').length;
    const occupied = seats.filter(
      (s) => s.status === 'in_use' || s.status === 'temporarily_away',
    ).length;
    const utilization = total ? Math.round((occupied / total) * 100) : 0;
    const todayViol = violations.filter((v) =>
      dayjs(v.occurredAt).isSame(dayjs(), 'day'),
    ).length;
    const todayReserv = reservations.filter((r) =>
      dayjs(r.reservedAt).isSame(dayjs(), 'day'),
    ).length;
    return { total, available, occupied, utilization, todayViol, todayReserv };
  }, [seats, violations, reservations]);

  const loginAs = (role: 'student' | 'reception' | 'manager' | 'owner') => {
    const map = { student: '张三', reception: '小林', manager: '王店长', owner: '陈老板' };
    setCurrentUser({
      id: `demo_${role}`,
      name: map[role],
      role,
      phone: role === 'student' ? '13800000001' : undefined,
    });
  };

  return (
    <div className="grain-bg min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="animate-stagger-in">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-700">
                <Sparkles size={12} />
                {dayjs().format('YYYY年M月D日 dddd')} · 欢迎使用静读空间预约系统
              </div>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink-800 md:text-5xl">
                让每一个座位，<br className="md:hidden" />
                都在对的时间，遇到对的人。
              </h1>
              <p className="mt-4 max-w-2xl text-base text-ink-600 leading-relaxed">
                从学生预约签到到前台清场管理，从店长时段决策到老板经营报表，
                一站式解决商业自习室的座位、储物柜与清场遗留物全流程管理。
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-500">实时总览</div>
              <div className="mt-1 font-display text-5xl font-semibold text-ink-700">
                {stats.utilization}
                <span className="ml-1 text-2xl text-ink-500">%</span>
              </div>
              <div className="mt-1 text-sm text-ink-500">当前上座率 · 共 {stats.total} 座</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              label="空闲座位"
              value={stats.available}
              hint="随时可预约"
              accent="moss"
              icon={<Sparkles size={22} />}
            />
            <StatCard
              label="使用中"
              value={stats.occupied}
              hint="含临时离座"
              accent="ink"
              icon={<BookOpen size={22} />}
            />
            <StatCard
              label="今日预约"
              value={stats.todayReserv}
              hint="累计预约数"
              accent="amber"
              icon={<LayoutGrid size={22} />}
            />
            <StatCard
              label="今日违规"
              value={stats.todayViol}
              hint="含未签到与超时"
              accent="clay"
              icon={<BarChart3 size={22} />}
            />
          </div>

          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold text-ink-800 mb-1">选择工作台</h2>
            <p className="text-sm text-ink-500 mb-6">点击角色卡片进入对应工作界面（将自动登录演示账号）</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <RoleCard
                to="/student"
                onClick={() => loginAs('student')}
                title="学生预约台"
                description="座位图预约、储物柜绑定、签到离座、临时离座与续时，超时自动提醒。"
                icon={BookOpen}
                gradient="from-ink-600 via-ink-700 to-ink-900"
                quickInfo="一人一座 · 30分钟签到"
              />
              <RoleCard
                to="/reception"
                onClick={() => loginAs('reception')}
                title="前台工作台"
                description="实时空位看板、签到确认、违规处理、清场检查、遗留物登记。"
                icon={LayoutGrid}
                gradient="from-amber-500 via-amber-600 to-amber-800"
                quickInfo="实时状态 · 一键清场"
              />
              <RoleCard
                to="/manager"
                onClick={() => loginAs('manager')}
                title="店长分析台"
                description="24小时空座率趋势、晚间套餐建议、保洁时段智能推荐、违规趋势。"
                icon={LineChart}
                gradient="from-moss-500 via-moss-600 to-moss-800"
                quickInfo="数据驱动 · 智能建议"
              />
              <RoleCard
                to="/owner"
                onClick={() => loginAs('owner')}
                title="老板仪表盘"
                description="利用率汇总、违规报表、柜位分析、全量数据导出，一屏掌握经营。"
                icon={BarChart3}
                gradient="from-clay-500 via-clay-600 to-clay-800"
                quickInfo="一键导出 · 经营全景"
              />
            </div>
          </div>

          <div className="mt-16 rounded-3xl border border-ink-100 bg-white/60 p-8 card-shadow backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <h3 className="font-display text-xl font-semibold text-ink-800">
                  核心业务规则
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-ink-600">
                  <li>• 同一学生同时只能占用一个座位，预约前自动校验</li>
                  <li>• 预约后30分钟内未扫码签到 → 自动释放并记录违规</li>
                  <li>• 临时离座单次30分钟，可续时2次，超时标记违规</li>
                  <li>• 座位与储物柜同区绑定，可手动更换同区空闲柜位</li>
                  <li>• 清场时逐座检查勾选，遗留物登记后可追踪认领</li>
                  <li>• 数据通过 LocalStorage 持久化，刷新后座位图一致</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-1 md:grid-rows-2 text-right">
                <div>
                  <div className="font-display text-3xl font-semibold text-ink-700">60</div>
                  <div className="text-xs text-ink-500">座位总数</div>
                </div>
                <div>
                  <div className="font-display text-3xl font-semibold text-amber-600">2</div>
                  <div className="text-xs text-ink-500">楼层 · 4个区域</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
