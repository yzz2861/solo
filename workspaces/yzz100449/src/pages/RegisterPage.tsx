import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useRecycleStore } from '../store/useRecycleStore';
import { useAuthStore } from '../store/useAuthStore';
import type { RecycleOrder } from '../types';
import { emptyOrder } from '../utils/transition';
import dayjs from 'dayjs';
import BasicInfoForm from '../components/register/BasicInfoForm';
import CheckPanel from '../components/register/CheckPanel';
import PhotoUploader from '../components/register/PhotoUploader';
import PriceBargain from '../components/register/PriceBargain';
import ConfirmBar from '../components/register/ConfirmBar';

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { currentUser } = useAuthStore();
  const { orders, addOrder, getOrderById, updateOrder } = useRecycleStore();

  const isEdit = !!id;
  const existing = useMemo(() => (id ? getOrderById(id) : null), [id, getOrderById, orders]);

  const [order, setOrder] = useState<RecycleOrder>(() => {
    if (existing) return { ...existing };
    if (!currentUser) return emptyOrder({ createdBy: '未知', createdByRole: 'staff' });
    return emptyOrder({ createdBy: currentUser.name, createdByRole: currentUser.role });
  });

  const patch = (p: Partial<RecycleOrder>) => setOrder(prev => ({ ...prev, ...p }));

  const onSaveDraft = () => {
    if (existing) {
      updateOrder(order.id, { ...order, updatedAt: Date.now() }, {
        action: '编辑并保存草稿',
        operator: currentUser?.name ?? '未知',
        operatorRole: currentUser?.role ?? 'staff',
      });
    } else {
      addOrder({ ...order });
    }
    nav('/list');
  };

  const onNavigateList = () => nav('/list');

  const onPatchForStore = (p: Partial<RecycleOrder>) => {
    patch(p);
    if (existing) {
      updateOrder(order.id, p);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link to="/list" className="btn-ghost !py-2 !h-auto !px-3">
          <ArrowLeft size={16} />
          返回列表
        </Link>
        <div className="flex-1">
          <div className="text-sm text-slate-500">
            {isEdit ? '编辑回收单' : '新建回收单'}
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-mono text-xs text-slate-400">{order.id.slice(0, 10)}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-xs text-slate-400">
              创建：{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
        </div>
        <button onClick={onSaveDraft} className="btn-secondary">
          <Save size={16} />
          保存草稿
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5 lg:col-span-2">
          <BasicInfoForm order={order} onChange={onPatchForStore} />
          <CheckPanel value={order.checkResult} onChange={(v) => onPatchForStore({ checkResult: v })} />
          <PhotoUploader photos={order.photos} onChange={(v) => onPatchForStore({ photos: v })} />
        </div>
        <div className="space-y-5">
          <PriceBargain order={order} onPatch={onPatchForStore} />
        </div>
      </div>

      <ConfirmBar order={order} onNavigateList={onNavigateList} />
    </div>
  );
}
