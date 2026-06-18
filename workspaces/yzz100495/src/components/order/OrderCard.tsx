import { useState } from 'react';
import { Clock, Phone, Edit2, Trash2, CheckCircle, XCircle, AlertTriangle, Printer, Package } from 'lucide-react';
import type { Order, OrderStatus } from '@/types';
import { PRODUCT_INFO, STATUS_INFO } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onEdit?: () => void;
  showBatchInfo?: boolean;
}

export const OrderCard = ({ order, onEdit, showBatchInfo = true }: OrderCardProps) => {
  const { updateOrderStatus, deleteOrder, markNoShow, getBatchesByDate, selectedDate } = useAppStore();
  const { showToast } = useToast();
  const [showActions, setShowActions] = useState(false);

  const batches = getBatchesByDate(selectedDate);
  const batch = batches.find(b => b.id === order.batchId);

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    showToast(`订单状态已更新为「${STATUS_INFO[newStatus].label}」`, 'success');
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个订单吗？')) {
      deleteOrder(order.id);
      showToast('订单已删除', 'success');
    }
  };

  const handleMarkNoShow = () => {
    if (confirm('确定标记该顾客为爽约吗？')) {
      markNoShow(order.id, false);
      showToast('已标记为爽约', 'warning');
    }
  };

  const handleReschedule = () => {
    if (confirm('该顾客爽约后改期，需要记录吗？')) {
      markNoShow(order.id, true);
      showToast('已记录爽约改期', 'info');
    }
  };

  const statusInfo = STATUS_INFO[order.status];
  const isNoShow = order.status === 'noShow';
  const hasNoShowHistory = order.noShowHistory.length > 0;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden',
        isNoShow && 'border-red-300 bg-red-50/50',
        hasNoShowHistory && !isNoShow && 'border-amber-300',
        order.status === 'ready' && 'border-green-300',
        order.status === 'preparing' && 'border-orange-300',
        !order.isPaid && 'ring-2 ring-amber-200'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg">
              {order.customerName.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{order.customerName}</h4>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Phone className="w-3 h-3" />
                {order.customerPhone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!order.isPaid && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                待付款
              </span>
            )}
            <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', statusInfo.color)}>
              {statusInfo.label}
            </span>
            {hasNoShowHistory && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full" title="有爽约记录">
                ⚠️ 爽约记录
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {order.items.map((item, index) => {
            const info = PRODUCT_INFO[item.productType];
            return (
              <div
                key={index}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg text-sm"
              >
                <span className="text-lg">{info.emoji}</span>
                <span className="font-medium text-gray-700">{info.name}</span>
                {item.flavor && <span className="text-gray-500 text-xs">（{item.flavor}）</span>}
                <span className="font-bold text-amber-600">×{item.quantity}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{order.pickupDate} {order.pickupTime}</span>
          </div>
          {showBatchInfo && batch && (
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-orange-500" />
              <span>第{batch.batchNumber}炉</span>
            </div>
          )}
        </div>

        {order.specialRequest && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg text-sm text-amber-800">
            💬 {order.specialRequest}
          </div>
        )}

        <div className={cn(
          'mt-4 pt-3 border-t border-gray-100 flex items-center justify-between transition-opacity duration-200',
          showActions ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex gap-2">
            {order.status === 'paid' && (
              <button
                onClick={() => handleStatusChange('preparing')}
                className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                开始烘焙
              </button>
            )}
            {order.status === 'preparing' && (
              <button
                onClick={() => handleStatusChange('ready')}
                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                烘焙完成
              </button>
            )}
            {order.status === 'ready' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                已取货
              </button>
            )}
            {order.status !== 'completed' && order.status !== 'noShow' && (
              <button
                onClick={handleMarkNoShow}
                className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                标记爽约
              </button>
            )}
            {order.status === 'noShow' && (
              <button
                onClick={handleReschedule}
                className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                改期重订
              </button>
            )}
          </div>

          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="编辑订单"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除订单"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
