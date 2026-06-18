import { useEffect, useState } from 'react';
import {
  Bicycle,
  Plus,
  Battery,
  Search,
  Edit3,
  RefreshCw,
  Wrench,
  BatteryLow,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/utils/api';
import { useToast } from '@/store/app';
import type { Vehicle } from '@/types';
import { VEHICLE_STATUS_LABEL } from '@/types';

export default function Vehicles() {
  const show = useToast((s) => s.show);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    model: '', frame_number: '', battery_level: 100, status: 'available', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const list = await api.vehicles.list(params);
      setVehicles(list);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  const handleSubmit = async () => {
    if (!form.model || !form.frame_number) {
      show('请填写车型和车架号', 'error');
      return;
    }
    try {
      if (editId) {
        await api.vehicles.update(editId, form);
        show('更新成功', 'success');
      } else {
        await api.vehicles.create(form);
        show('添加成功', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) {
        show(e.message || '操作失败', 'error');
      }
  };

  const handleEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      model: v.model,
      frame_number: v.frame_number,
      battery_level: v.battery_level,
      status: v.status,
      notes: v.notes,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ model: '', frame_number: '', battery_level: 100, status: 'available', notes: '' });
    setEditId(null);
  };

  const updateStatus = async (v: Vehicle, status: string) => {
    try {
      await api.vehicles.updateStatus(v.id, { status });
      show('状态已更新', 'success');
      load();
    } catch (e: any) {
      show(e.message || '操作失败', 'error');
    }
  };

  const statusBadge = (v: Vehicle) => {
    const map: Record<string, { cls: string; text: string } = {
      available: { cls: 'badge-green', text: VEHICLE_STATUS_LABEL[v.status] },
      in_use: { cls: 'badge-blue', text: VEHICLE_STATUS_LABEL[v.status] },
      low_battery: { cls: 'badge-red', text: VEHICLE_STATUS_LABEL[v.status] },
      inspection: { cls: 'badge-yellow', text: VEHICLE_STATUS_LABEL[v.status] },
      maintenance: { cls: 'badge-gray', text: VEHICLE_STATUS_LABEL[v.status] },
    };
    const m = map[v.status] || map.available;
    return <span className={m.cls}>{m.text}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-500">车辆管理</h1>
          <p className="text-sm text-gray-500 mt-1">
          共 {vehicles.length} 辆车，{vehicles.filter(v => v.battery_level < 20).length} 辆电量不足
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-accent"
        >
          <Plus size={18} /> 添加车辆
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索车型或车架号"
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input !w-40"
          >
            <option value="all">全部状态</option>
            <option value="available">可试骑</option>
            <option value="in_use">试骑中</option>
            <option value="low_battery">电量不足</option>
            <option value="inspection">待检查</option>
            <option value="maintenance">维修中</option>
          </select>
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={16} /> 刷新
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">车型</th>
                  <th className="th">车架号</th>
                  <th className="th">电量</th>
                  <th className="th">状态</th>
                  <th className="th">备注</th>
                  <th className="th">试骑次数</th>
                  <th className="th">操作</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="td text-gray-400">{v.id}</td>
                    <td className="td font-medium">{v.model}</td>
                    <td className="td text-gray-500">{v.frame_number}</td>
                    <td className="td">
                      <div className="flex items-center gap-2 max-w-[160px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              v.battery_level < 20
                                ? 'bg-danger'
                                : v.battery_level < 50
                                ? 'bg-warning'
                                : 'bg-success'
                            }`}
                            style={{ width: `${v.battery_level}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs ${v.battery_level < 20 ? 'text-danger font-medium' : 'text-gray-600'}`}
                        >
                          {v.battery_level}%
                        </span>
                      </div>
                    </td>
                    <td className="td">{statusBadge(v)}</td>
                    <td className="td text-gray-500 text-xs max-w-[120px] truncate">{v.notes || '-'}</td>
                    <td className="td">{v.ride_count || 0}</td>
                    <td className="td">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => handleEdit(v)} className="btn-ghost !p-2">
                          <Edit3 size={14} />
                        </button>
                        {v.status !== 'available' && (
                          <button
                            onClick={() => updateStatus(v, 'available')}
                            className="btn-ghost !p-2"
                            title="标记可用"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {v.battery_level < 20 && (
                          <button
                            onClick={() => updateStatus(v, 'low_battery')}
                            className="btn-ghost !p-2 text-warning"
                            title="标记低电量"
                          >
                            <BatteryLow size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(v, 'maintenance')}
                          className="btn-ghost !p-2 text-warning"
                          title="送入维修"
                        >
                          <Wrench size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Bicycle size={20} /> {editId ? '编辑车辆' : '添加车辆'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">车型 *</label>
                  <input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="input"
                    placeholder="如：小牛 N1"
                  />
                </div>
                <div>
                  <label className="label">车架号 *</label>
                  <input
                    value={form.frame_number}
                    onChange={(e) => setForm({ ...form, frame_number: e.target.value })}
                    className="input"
                    placeholder="车架编号"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                <label className="label">电量 (%)</label>
                <input
                  type="number"
                  value={form.battery_level}
                  onChange={(e) => setForm({ ...form, battery_level: Number(e.target.value) })}
                  className="input"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="label">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input"
                >
                  <option value="available">可试骑</option>
                  <option value="low_battery">电量不足</option>
                  <option value="inspection">待检查</option>
                  <option value="maintenance">维修中</option>
                </select>
              </div>
              </div>
              <div>
                <label className="label">备注</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="input"
                  placeholder="颜色、特征等"
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">取消</button>
              <button onClick={handleSubmit} className="btn-primary">
                {editId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
