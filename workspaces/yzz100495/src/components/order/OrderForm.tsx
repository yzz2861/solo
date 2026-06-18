import { useState, useEffect } from 'react';
import { Plus, Minus, Check, User, Phone, Calendar, Clock, MessageSquare, CreditCard } from 'lucide-react';
import type { OrderFormData, ProductType, OrderItem, Warning } from '@/types';
import { PRODUCT_INFO } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { WarningList } from '@/components/common/WarningBadge';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface OrderFormProps {
  onSuccess?: () => void;
}

export const OrderForm = ({ onSuccess }: OrderFormProps) => {
  const { addOrder, updateOrder, editingOrder, config, setShowOrderModal, clearWarnings } = useAppStore();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerPhone: '',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: '15:00',
    isPaid: false,
    specialRequest: '',
    items: [{ productType: 'baguette', quantity: 1, flavor: '原味' }],
  });

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        customerName: editingOrder.customerName,
        customerPhone: editingOrder.customerPhone,
        pickupDate: editingOrder.pickupDate,
        pickupTime: editingOrder.pickupTime,
        isPaid: editingOrder.isPaid,
        specialRequest: editingOrder.specialRequest,
        items: editingOrder.items.map(item => ({
          productType: item.productType,
          quantity: item.quantity,
          flavor: item.flavor,
        })),
      });
    }
  }, [editingOrder]);

  useEffect(() => {
    if (formData.customerName && formData.customerPhone && formData.items.length > 0) {
      const validate = useAppStore.getState().validateOrder;
      const result = validate(formData, editingOrder?.id);
      setWarnings(result);
    } else {
      setWarnings([]);
    }
  }, [formData, editingOrder]);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productType: 'baguette', quantity: 1, flavor: '原味' }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone) {
      showToast('请填写顾客信息', 'error');
      return;
    }
    
    if (formData.items.every(item => item.quantity <= 0)) {
      showToast('请至少添加一个产品', 'error');
      return;
    }

    const validItems = formData.items.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      showToast('请添加有效的产品数量', 'error');
      return;
    }

    const submitData = { ...formData, items: validItems };

    if (editingOrder) {
      const validate = useAppStore.getState().validateOrder;
      const validationWarnings = validate(submitData, editingOrder.id);
      if (validationWarnings.some(w => w.severity === 'error')) {
        setWarnings(validationWarnings);
        showToast('订单更新失败，请检查错误提示', 'error');
        return;
      }
      setWarnings(validationWarnings);
      updateOrder(editingOrder.id, submitData);
      showToast('订单更新成功', 'success');
    } else {
      const result = addOrder(submitData);
      if (result.order) {
        showToast('订单创建成功', 'success');
      } else if (result.warnings.some(w => w.severity === 'error')) {
        showToast('订单创建失败，请检查错误提示', 'error');
        return;
      }
    }

    clearWarnings();
    onSuccess?.();
    setShowOrderModal(false);
  };

  const productTypes: ProductType[] = ['baguette', 'toast', 'cake'];
  const flavorOptions: Record<ProductType, string[]> = {
    baguette: ['原味', '蒜香', '全麦', '杂粮'],
    toast: ['原味', '全麦', '牛奶', '紫薯', '椰蓉'],
    cake: ['巧克力', '草莓', '芒果', '提拉米苏', '芝士'],
  };

  const timeOptions = [];
  const startHour = parseInt(config.pickupStartTime.split(':')[0]);
  const endHour = parseInt(config.pickupEndTime.split(':')[0]);
  for (let h = startHour; h < endHour; h++) {
    timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
    timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5" />
            订单提示
          </h3>
          <WarningList warnings={warnings} />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-amber-900 flex items-center gap-2">
          <User className="w-5 h-5" />
          顾客信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">顾客姓名 *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-4 h-4" />
              联系电话 *
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              placeholder="请输入手机号"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-amber-900">🥖 产品选择</h3>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div 
              key={index}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100"
              style={{ animation: `fadeIn 0.3s ease-out ${index * 0.1}s both` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">品类</label>
                  <select
                    value={item.productType}
                    onChange={(e) => handleUpdateItem(index, 'productType', e.target.value as ProductType)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {productTypes.map(type => (
                      <option key={type} value={type}>
                        {PRODUCT_INFO[type].emoji} {PRODUCT_INFO[type].name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(index, 'quantity', Math.max(0, item.quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-center border border-amber-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(index, 'quantity', item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">口味</label>
                  <select
                    value={item.flavor}
                    onChange={(e) => handleUpdateItem(index, 'flavor', e.target.value)}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {flavorOptions[item.productType].map(flavor => (
                      <option key={flavor} value={flavor}>{flavor}</option>
                    ))}
                  </select>
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full py-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-600 hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加产品
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-amber-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          取货信息
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">取货日期</label>
            <input
              type="date"
              value={formData.pickupDate}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              取货时间
            </label>
            <select
              value={formData.pickupTime}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            付款状态
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.isPaid}
                onChange={(e) => setFormData(prev => ({ ...prev, isPaid: e.target.checked }))}
                className="sr-only"
              />
              <div className={cn(
                "w-14 h-8 rounded-full transition-colors",
                formData.isPaid ? "bg-green-500" : "bg-gray-300"
              )}>
                <div className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
                  formData.isPaid ? "translate-x-7" : "translate-x-1"
                )} />
              </div>
            </div>
            <span className={cn(
              "font-medium",
              formData.isPaid ? "text-green-600" : "text-gray-500"
            )}>
              {formData.isPaid ? "已收款" : "未收款"}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            特殊要求 / 备注
          </label>
          <textarea
            value={formData.specialRequest}
            onChange={(e) => setFormData(prev => ({ ...prev, specialRequest: e.target.value }))}
            rows={2}
            className="w-full px-4 py-2.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
            placeholder="例如：不要切、少糖、加礼盒包装等"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setShowOrderModal(false);
            clearWarnings();
          }}
          className="flex-1 py-3 px-6 border border-amber-300 text-amber-700 rounded-xl font-medium hover:bg-amber-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className={cn(
            "flex-1 py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
            warnings.some(w => w.severity === 'error')
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl"
          )}
          disabled={warnings.some(w => w.severity === 'error')}
        >
          <Check className="w-5 h-5" />
          {editingOrder ? '更新订单' : '确认下单'}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
};
