import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowLeft,
  UserPlus,
  Tag,
  MessageSquare,
  Bicycle,
  Calendar,
  CircleDollarSign,
  Edit3,
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatDateTime, formatMoney } from '@/utils/format';
import { useToast } from '@/store/app';
import type { Customer, CustomerDetail, TestRide } from '@/types';

export default function Customers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const show = useToast((s) => s.show);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', id_card: '', tags: '' });

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.customers.list(search ? { search } : undefined);
      setCustomers(list);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadDetail = async () => {
    if (!id) return;
    try {
      const d: any = await api.customers.get(Number(id));
      setDetail(d);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      show('请填写姓名和手机号', 'error');
      return;
    }
    try {
      if (editId) {
        await api.customers.update(editId, form);
        show('更新成功', 'success');
      } else {
        await api.customers.create(form);
        show('添加成功', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
      loadDetail();
    } catch (e: any) {
      show(e.message || '操作失败', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', id_card: '', tags: '' });
    setEditId(null);
  };

  const handleEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone, id_card: c.id_card || '', tags: c.tags || '' });
    setShowModal(true);
  };

  if (id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customers')} className="btn-ghost">
            <ArrowLeft size={18} /> 返回列表
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary-500">客户详情</h1>
          </div>
        </div>

        {detail ? (
          <div className="grid grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-2xl font-bold">
                  {detail.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{detail.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">{detail.phone}</p>
                  {detail.id_card && <p className="text-gray-400 text-xs mt-0.5">{detail.id_card}</p>}
                  <button
                    onClick={() => handleEdit(detail as any)}
                    className="btn-ghost !p-2 mt-2"
                  >
                    <Edit3 size={14} /> 编辑
                  </button>
                </div>
              </div>

              {detail.tags && (
                <div className="mt-5 pt-5 border-t">
                  <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                    <Tag size={12} /> 推荐标签
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.split(',').filter(Boolean).map((t) => (
                      <span key={t} className="badge-blue text-sm">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 pt-5 border-t grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg py-3">
                  <div className="text-2xl font-bold text-primary-500">{detail.ride_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">试骑次数</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-3">
                  <div className="text-2xl font-bold text-accent-500">{detail.feedback_count || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">反馈条数</div>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-6">
              <div className="card">
                <h3 className="font-semibold text-primary-500 mb-4 flex items-center gap-2">
                  <Bicycle size={18} /> 试骑历史
                </h3>
                {(!detail.rides || detail.rides.length === 0) ? (
                  <div className="text-center py-8 text-gray-400">暂无试骑记录</div>
                ) : (
                  <div className="space-y-2">
                    {detail.rides.map((r: TestRide) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-500 flex items-center justify-center">
                            <Bicycle size={18} />
                          </div>
                          <div>
                            <div className="font-medium">
                              {r.vehicle_model}
                              <span className="text-gray-400 text-xs ml-2">{r.vehicle_frame}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} /> {formatDateTime(r.start_time)}
                              </span>
                              {r.route && <span className="flex items-center gap-1">路线: {r.route}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-accent-500">
                            {formatMoney(r.deposit_amount)}
                          </div>
                          <span
                            className={`badge ${
                              r.deposit_status === 'refunded' ? 'badge-green' : 'badge-yellow'
                            }`}
                          >
                            {r.deposit_status === 'refunded' ? '已退还' : '押金中'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="font-semibold text-primary-500 mb-4 flex items-center gap-2">
                  <MessageSquare size={18} /> 客户反馈
                </h3>
                {(!detail.feedbacks || detail.feedbacks.length === 0) ? (
                  <div className="text-center py-8 text-gray-400">暂无反馈记录</div>
                ) : (
                  <div className="space-y-3">
                    {detail.feedbacks.map((f) => (
                      <div key={f.id} className="p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 text-sm">
                            {f.satisfaction && (
                              <span className="badge-blue">{f.satisfaction}</span>
                            )}
                            {f.preference && (
                              <span className="badge-green">偏好: {f.preference}</span>
                            )}
                            {f.intended_model && (
                              <span className="badge-yellow">意向: {f.intended_model}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{formatDateTime(f.created_at)}</div>
                        </div>
                        {f.notes && <p className="text-sm text-gray-600 mt-2">{f.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        )}

        {showModal && (
          <CustomerModal
            form={form}
            setForm={setForm}
            editId={editId}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-500">客户档案</h1>
          <p className="text-sm text-gray-500 mt-1">共 {customers.length} 位客户</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-accent"
        >
          <UserPlus size={18} /> 新建客户
        </button>
      </div>

      <div className="card">
        <div className="relative max-w-sm mb-4">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索客户姓名或手机号"
            className="input pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无客户数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">客户</th>
                  <th className="th">手机号</th>
                  <th className="th">身份证</th>
                  <th className="th">试骑次数</th>
                  <th className="th">反馈</th>
                  <th className="th">标签</th>
                  <th className="th">操作</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="td text-gray-400">{c.id}</td>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center text-sm font-bold">
                          {c.name.charAt(0)}
                        </div>
                        <Link to={`/customers/${c.id}`} className="font-medium hover:text-primary-500">
                          {c.name}
                        </Link>
                      </div>
                    </td>
                    <td className="td text-gray-600">{c.phone}</td>
                    <td className="td text-gray-400 text-xs">{c.id_card || '-'}</td>
                    <td className="td">
                      <span className="badge-blue">{c.ride_count || 0} 次</span>
                    </td>
                    <td className="td">
                      <span className="badge-green">{c.feedback_count || 0} 条</span>
                    </td>
                    <td className="td max-w-[180px]">
                      <div className="flex flex-wrap gap-1">
                        {c.tags
                          ? c.tags.split(',').filter(Boolean).slice(0, 3).map((t) => (
                              <span key={t} className="badge-blue">{t}</span>
                            ))
                          : <span className="text-gray-400 text-xs">-</span>}
                        {c.tags && c.tags.split(',').length > 3 && (
                          <span className="text-xs text-gray-400">+{c.tags.split(',').length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex gap-1">
                        <Link to={`/customers/${c.id}`} className="btn-ghost !p-2" title="查看">
                          <Users size={14} />
                        </Link>
                        <button onClick={() => handleEdit(c)} className="btn-ghost !p-2" title="编辑">
                          <Edit3 size={14} />
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
        <CustomerModal
          form={form}
          setForm={setForm}
          editId={editId}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

interface ModalProps {
  form: any;
  setForm: any;
  editId: number | null;
  onClose: () => void;
  onSubmit: () => void;
}

function CustomerModal({ form, setForm, editId, onClose, onSubmit }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users size={20} /> {editId ? '编辑客户' : '新建客户'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">姓名 *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="客户姓名"
              />
            </div>
            <div>
              <label className="label">手机号 *</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="联系电话"
              />
            </div>
          </div>
          <div>
            <label className="label">身份证号</label>
            <input
              value={form.id_card}
              onChange={(e) => setForm({ ...form, id_card: e.target.value })}
              className="input"
              placeholder="可选"
            />
          </div>
          <div>
            <label className="label">推荐标签（逗号分隔）</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input"
              placeholder="如：长续航,通勤代步,运动骑行"
            />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button onClick={onSubmit} className="btn-primary">{editId ? '保存' : '创建'}</button>
        </div>
      </div>
    </div>
  );
}
