import type { Coupon } from '@/types';
import { COUPON_TYPE_COLORS } from '@/utils/constants';
import { Ticket, AlertTriangle } from 'lucide-react';

interface CouponListProps {
  coupons: Coupon[];
}

export default function CouponList({ coupons }: CouponListProps) {
  if (coupons.length === 0) {
    return null;
  }

  const displayCoupons = coupons.filter(c => c.type !== 'points');
  const pointsCoupon = coupons.find(c => c.type === 'points');

  return (
    <div className="bg-white rounded-xl p-4 card-shadow">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-5 h-5 text-peach-500" />
        <h3 className="font-bold text-caramel-700">优惠券</h3>
      </div>
      <div className="space-y-2">
        {displayCoupons.map((coupon, index) => (
          <div
            key={coupon.id}
            className={`relative border-2 rounded-lg p-3 ${COUPON_TYPE_COLORS[coupon.type]} animate-fade-in ${
              coupon.isDamaged ? 'opacity-75' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {coupon.isDamaged && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                破损
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{coupon.name}</p>
                <p className="text-xs opacity-80">{coupon.description}</p>
                {coupon.isDamaged && coupon.damageNote && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ {coupon.damageNote}
                  </p>
                )}
              </div>
              <span className="text-xs px-2 py-1 bg-white/50 rounded-full">
                {coupon.isStackable ? '可叠加' : '不可叠加'}
              </span>
            </div>
          </div>
        ))}
        {pointsCoupon && (
          <div
            className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-3 text-blue-700 animate-fade-in"
            style={{ animationDelay: `${displayCoupons.length * 100}ms` }}
          >
            <p className="font-medium">💎 会员积分抵扣</p>
            <p className="text-xs">{pointsCoupon.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
