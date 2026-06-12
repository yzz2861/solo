import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useMemo } from 'react';
import {
  Clock,
  Scissors,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { OrderCard } from './OrderCard';
import type { OrderStatus, WeddingCarOrder } from '@/types';

const STATUS_CONFIG: { key: OrderStatus; title: string; icon: typeof Clock; color: string; bg: string; border: string }[] = [
  { key: 'pending', title: '待准备', icon: Clock, color: 'text-coffee-600', bg: 'bg-cream-200/60', border: 'border-coffee-200' },
  { key: 'in_progress', title: '制作中', icon: Scissors, color: 'text-rose-600', bg: 'bg-rose-100/60', border: 'border-rose-200' },
  { key: 'delivered', title: '已交车', icon: CheckCircle2, color: 'text-sage-600', bg: 'bg-sage-500/10', border: 'border-sage-200' },
];

export const OrderKanban = () => {
  const { orders, selectedDate, updateOrderStatus } = useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, WeddingCarOrder[]> = {
      pending: [],
      in_progress: [],
      delivered: [],
    };
    orders
      .filter(o => o.date === selectedDate)
      .forEach(o => {
        const status: OrderStatus = map[o.status] ? o.status : 'pending';
        map[status].push(o);
      });
    // 按到店时间排序
    (Object.keys(map) as OrderStatus[]).forEach(k => {
      map[k].sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    });
    return map;
  }, [orders, selectedDate]);

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const orderId = String(active.id);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 判断 over 是列（status）还是卡片
    let targetStatus: OrderStatus | null = null;
    if (typeof over.id === 'string') {
      if (over.id.startsWith('col-')) {
        targetStatus = over.id.replace('col-', '') as OrderStatus;
      } else {
        // 是另一张卡片 -> 用它的 status
        const target = orders.find(o => o.id === over.id);
        if (target) targetStatus = target.status;
      }
    }
    if (targetStatus && targetStatus !== order.status) {
      updateOrderStatus(orderId, targetStatus);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-serif font-semibold text-coffee-700 text-base flex items-center gap-2">
          今日订单看板
          <span className="text-sm font-normal text-coffee-400">共 {orders.filter(o => o.date === selectedDate).length} 单</span>
        </h2>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-coffee-400">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-300" /> 拖动卡片切换状态
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">
          {STATUS_CONFIG.map(cfg => {
            const Icon = cfg.icon;
            const list = byStatus[cfg.key];
            return (
              <div
                key={cfg.key}
                id={`col-${cfg.key}`}
                data-droppable={`col-${cfg.key}`}
                className={`kanban-col ${cfg.bg} border ${cfg.border}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className={`flex items-center gap-1.5 font-medium ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{cfg.title}</span>
                  </div>
                  <span className={`tag ${cfg.key === 'pending' ? 'tag-pending' : cfg.key === 'in_progress' ? 'tag-progress' : 'tag-done'}`}>
                    {list.length}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-1 -mx-1 space-y-3">
                  <SortableContext items={list.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {list.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-coffee-300">
                        <Inbox className="w-8 h-8 mb-2 opacity-40" />
                        <span className="text-xs">暂无订单</span>
                      </div>
                    ) : (
                      list.map((o, i) => <OrderCard key={o.id} order={o} index={i} />)
                    )}
                  </SortableContext>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="opacity-95 rotate-[-1deg] scale-105 shadow-hover pointer-events-none">
              <OrderCard order={activeOrder} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
