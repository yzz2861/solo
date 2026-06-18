import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PlayCircle,
  AlertTriangle,
  BatteryLow,
  Clock,
  ArrowRight,
  Printer,
  CircleDollarSign,
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatDateTime, formatMoney, isOverdue, getToday } from '@/utils/format';
import type { TestRide, Vehicle } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeRides, setActiveRides] = useState<TestRide[]>([]);
  const [unreturned, setUnreturned] = useState<TestRide[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, u, v] = await Promise.all([
        api.testRides.active(),
        api.testRides.unreturned(),
        api.vehicles.list(),
      ]);
      setActiveRides(a);
      setUnreturned(u);
      setVehicles(v);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const todayRides = activeRides.length + unreturned.filter(r => {
    return r.start_time && r.start_time.startsWith(getToday());
  }).length;

  const lowBattery = vehicles.filter(v => v.battery_level < 20).length;

  const stats = [
    {
      label: '今日试骑',
      value: todayRides,
      icon: ClipboardList,
      color: 'bg-primary-500',
    },
    {
      label: '进行中',
      value: activeRides.length,
      icon: PlayCircle,
      color: 'bg-success',
    },
    {
      label: '未退押金',
      value: unreturned.length,
      icon: CircleDollarSign,
      color: 'bg-danger',
    },
    {
      label: '低电量车辆',
      value: lowBattery,
      icon: BatteryLow,
      color: 'bg-warning',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-500">试骑看板</h1>
          <p className="text-sm text-gray-500 mt-1">实时掌握门店试骑状态</p>
        </div>
        <button onClick={() => navigate('/register')} className="btn-accent">
          <ClipboardList size={18} /> 新建试骑
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.color} stat-card`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-white/80">{s.label}</div>
                  <div className="text-3xl font-bold mt-1">{s.value}</div>
                </div>
                <Icon size={28} className="text-white/80" />
              </div>
            </div>
          );
        })}
      </div>

      {unreturned.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-danger" />
            <span className="font-semibold text-danger">
              {unreturned.length} 笔押金尚未退还，请及时处理
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {unreturned.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/return/${r.id}`)}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 hover:bg-red-100 transition text-left"
              >
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.customer_name}</div>
                  <div className="text-xs text-gray-500">
                    {r.vehicle_model} · {formatMoney(r.deposit_amount)}
                  </div>
                </div>
                <ArrowRight size={16} className="text-danger" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-500">进行中的试骑</h2>
          <span className="text-sm text-gray-500">共 {activeRides.length} 条</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : activeRides.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无进行中的试骑</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">客户</th>
                  <th className="th">车型 / 车架号</th>
                  <th className="th">试骑时间</th>
                  <th className="th">预计归还</th>
                  <th className="th">押金</th>
                  <th className="th">路线</th>
                  <th className="th">状态</th>
                  <th className="th">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeRides.map((r) => {
                  const overdue = isOverdue(r.expected_return_time);
                  return (
                    <tr
                      key={r.id}
                      className={overdue ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}
                    >
                      <td className="td">
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-xs text-gray-400">{r.customer_phone}</div>
                      </td>
                      <td className="td">
                        <div className="font-medium">{r.vehicle_model}</div>
                        <div className="text-xs text-gray-400">{r.vehicle_frame}</div>
                      </td>
                      <td className="td">{formatDateTime(r.start_time)}</td>
                      <td className="td">
                        <div className={overdue ? 'text-danger font-medium' : ''}>
                          {formatDateTime(r.expected_return_time)}
                        </div>
                        {overdue && (
                          <div className="text-xs text-danger flex items-center gap-1 mt-0.5">
                            <Clock size={12} /> 已超时
                          </div>
                        )}
                      </td>
                      <td className="td font-medium">{formatMoney(r.deposit_amount)}</td>
                      <td className="td text-gray-600">{r.route || '-'}</td>
                      <td className="td">
                        {overdue ? (
                          <span className="badge-red">已超时</span>
                        ) : (
                          <span className="badge-green">进行中</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/return/${r.id}`)}
                            className="btn-primary !py-1 !px-3 text-xs"
                          >
                            归还
                          </button>
                          <Link
                            to={`/register?print=${r.id}`}
                            className="btn-secondary !py-1 !px-3 text-xs"
                          >
                            <Printer size={14} /> 打印
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
