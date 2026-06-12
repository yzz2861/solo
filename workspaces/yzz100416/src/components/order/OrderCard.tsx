import { useState } from 'react';
import {
  Car,
  UserCircle,
  Clock,
  Flower2,
  Play,
  CheckCircle2,
  Send,
  CarFront,
  AlertTriangle,
  FileText,
  Trash2,
  GripVertical,
  Edit3,
  X,
  Save,
} from 'lucide-react';
import type { WeddingCarOrder, OrderFlower } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { minutesUntilArrival, formatCountdown } from '@/utils/dateUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  order: WeddingCarOrder;
  index?: number;
}

export const OrderCard = ({ order, index = 0 }: Props) => {
  const { flowers, florists, updateOrderStatus, deleteOrder, updateOrder, recordDriverArrival } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(order.handoverNote);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, data: { order } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const florist = florists.find(f => f.id === order.floristId);
  const countdownMin = minutesUntilArrival(order.arrivalTime, order.date);
  const urgency = countdownMin >= 0 && countdownMin <= 15;
  const overdue = countdownMin >= 0 && countdownMin <= 30 && order.status === 'pending';

  const getFlowerTags = (): string => {
    return order.flowers
      .slice(0, 3)
      .map(of => {
        const f = flowers.find(x => x.id === of.flowerId);
        return f ? `${f.name}×${of.quantity}` : '';
      })
      .filter(Boolean)
      .join('、');
  };

  const saveNote = () => {
    updateOrder(order.id, { handoverNote: note });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`确认删除「${order.coupleName}」的订单？`)) {
      deleteOrder(order.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-4 group cursor-grab active:cursor-grabbing transition-all duration-200 animate-fade-in-up stagger-${(index % 6) + 1}
        hover:shadow-hover hover:-translate-y-0.5
        ${urgency && order.status !== 'delivered' ? 'ring-2 ring-danger-500/40 animate-pulse-warning' : ''}
        ${overdue ? 'ring-2 ring-amber-500/40' : ''}
        ${order.status === 'delivered' ? 'opacity-80' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span {...attributes} {...listeners} className="text-coffee-200 hover:text-coffee-400 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-coffee-500 font-medium mb-0.5">
              <UserCircle className="w-3 h-3 text-rose-400" />
              <span className="truncate">{order.coupleName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-gold-500" />
              <span className="font-semibold text-coffee-700">{order.carModel}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-sm font-bold text-coffee-800 tracking-wider font-serif">
            {order.plateNumber}
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-coffee-400" />
            <span className={`text-xs font-medium ${urgency ? 'text-danger-600 animate-blink font-bold' : 'text-coffee-500'}`}>
              {order.arrivalTime}
              {countdownMin >= 0 && order.status !== 'delivered' && (
                <span className="ml-1 opacity-80">({formatCountdown(countdownMin)})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs">
        {florist ? (
          <span className="tag tag-progress">
            <Flower2 className="w-3 h-3" />
            {florist.name}
          </span>
        ) : (
          <span className="tag tag-danger">未分配扎花师</span>
        )}
        <span className="tag bg-gold-400/15 text-gold-600">¥{order.costTotal}</span>
        {order.driverArrivedTime && order.status !== 'delivered' && (
          <span className="tag tag-danger animate-pulse-warning">
            <CarFront className="w-3 h-3" />
            司机{order.driverArrivedTime}到店
          </span>
        )}
      </div>

      <div className="bg-cream-50 rounded-xl p-2.5 mb-3 border border-cream-200/70">
        <div className="flex items-start gap-1.5 text-xs text-coffee-600">
          <Flower2 className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            {getFlowerTags()}
            {order.flowers.length > 3 && <span className="text-coffee-400"> 等{order.flowers.length}种</span>}
          </div>
        </div>
      </div>

      {order.handoverNote && (
        <div className="mb-3">
          {editing ? (
            <div className="flex gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                className="input flex-1 text-xs py-1.5"
                placeholder="交接备注"
              />
              <button onClick={saveNote} className="btn btn-success !px-2 !py-1.5">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setEditing(false); setNote(order.handoverNote); }} className="btn btn-ghost !px-2 !py-1.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-start gap-1.5 text-xs text-coffee-600 cursor-pointer hover:bg-cream-50 rounded-lg p-1.5 -mx-1.5 group/note"
              onClick={() => setEditing(true)}
            >
              <FileText className="w-3 h-3 text-coffee-300 shrink-0 mt-0.5" />
              <span className="flex-1">{order.handoverNote}</span>
              <Edit3 className="w-3 h-3 text-coffee-200 group-hover/note:text-coffee-500 opacity-0 group-hover/note:opacity-100 transition" />
            </div>
          )}
        </div>
      )}
      {!order.handoverNote && (
        <button
          onClick={() => setEditing(true)}
          className="mb-3 flex items-center gap-1 text-[11px] text-coffee-400 hover:text-coffee-600"
        >
          <FileText className="w-3 h-3" />
          添加交接备注
        </button>
      )}

      {order.anomalies.length > 0 && (
        <div className="flex items-start gap-1.5 mb-3 text-[11px] text-amber-600 bg-amber-500/5 rounded-lg p-2 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <div>
            {order.anomalies.map((a, i) => (
              <div key={i}>{a}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-cream-200/70">
        {order.status === 'pending' && (
          <>
            <button
              onClick={() => updateOrderStatus(order.id, 'in_progress')}
              className="btn btn-primary !py-1.5 !text-xs flex-1"
            >
              <Play className="w-3.5 h-3.5" />
              开始制作
            </button>
            <button
              onClick={() => recordDriverArrival(order.id)}
              className="btn btn-secondary !py-1.5 !text-xs"
              title="登记司机到店"
            >
              <CarFront className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {order.status === 'in_progress' && (
          <>
            <button
              onClick={() => updateOrderStatus(order.id, 'pending')}
              className="btn btn-ghost !py-1.5 !text-xs"
              title="退回到待准备"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => recordDriverArrival(order.id)}
              className="btn btn-secondary !py-1.5 !text-xs"
              title="登记司机到店"
            >
              <CarFront className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateOrderStatus(order.id, 'delivered')}
              className="btn btn-success !py-1.5 !text-xs flex-1"
            >
              <Send className="w-3.5 h-3.5" />
              完成交车
            </button>
          </>
        )}
        {order.status === 'delivered' && (
          <>
            <div className="flex items-center gap-1 text-sage-600 text-xs font-medium flex-1">
              <CheckCircle2 className="w-4 h-4" />
              已交车 {order.deliveredAt || ''}
            </div>
            <button
              onClick={() => updateOrderStatus(order.id, 'in_progress')}
              className="btn btn-ghost !py-1.5 !text-xs"
              title="撤回"
            >
              撤回
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="btn btn-ghost !py-1.5 !text-xs text-coffee-300 hover:text-danger-500"
          title="删除订单"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
