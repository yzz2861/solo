import type { CartItem } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { ShoppingCart } from 'lucide-react';

interface CartListProps {
  items: CartItem[];
  title?: string;
}

export default function CartList({ items, title = '商品清单' }: CartListProps) {
  return (
    <div className="bg-white rounded-xl p-4 card-shadow">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-5 h-5 text-primary-500" />
        <h3 className="font-bold text-caramel-700">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.product.id}-${index}`}
            className="flex items-center justify-between py-2 border-b border-primary-50 last:border-0 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.product.emoji}</span>
              <div>
                <p className="font-medium text-caramel-800">
                  {item.product.name}
                </p>
                <p className="text-xs text-caramel-500">
                  {formatCurrency(item.product.price)} × {item.quantity}
                </p>
              </div>
            </div>
            <p className="font-semibold text-caramel-700">
              {formatCurrency(item.subtotal)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-dashed border-primary-100">
        <span className="font-bold text-caramel-700">原价合计</span>
        <span className="text-xl font-bold text-caramel-800">
          {formatCurrency(items.reduce((sum, i) => sum + i.subtotal, 0))}
        </span>
      </div>
    </div>
  );
}
