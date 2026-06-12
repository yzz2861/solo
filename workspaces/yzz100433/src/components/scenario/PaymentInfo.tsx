import type { Payment } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { Wallet, CreditCard, Banknote } from 'lucide-react';

interface PaymentInfoProps {
  payment: Payment;
  memberPoints?: number;
  pointsDeduction?: number;
}

export default function PaymentInfo({ payment, memberPoints, pointsDeduction }: PaymentInfoProps) {
  const isCash = payment.method === 'cash';

  return (
    <div className="bg-white rounded-xl p-4 card-shadow">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-5 h-5 text-caramel-500" />
        <h3 className="font-bold text-caramel-700">支付信息</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
          <div className="flex items-center gap-2">
            {isCash ? (
              <Banknote className="w-5 h-5 text-primary-500" />
            ) : (
              <CreditCard className="w-5 h-5 text-primary-500" />
            )}
            <span className="font-medium text-caramel-700">
              {isCash ? '现金支付' : '电子支付'}
            </span>
          </div>
          <span className="text-lg font-bold text-caramel-800">
            {formatCurrency(payment.amountPaid)}
          </span>
        </div>
        {memberPoints !== undefined && memberPoints > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <span className="font-medium text-blue-700">会员积分</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-blue-800">{memberPoints.toLocaleString()} 分</span>
              {pointsDeduction !== undefined && pointsDeduction > 0 && (
                <p className="text-xs text-blue-600">
                  可抵扣 {formatCurrency(pointsDeduction)}
                </p>
              )}
            </div>
          </div>
        )}
        {isCash && (
          <div className="p-3 bg-peach-50 rounded-lg">
            <p className="text-sm text-peach-700">
              💰 顾客支付现金，请计算正确的找零金额
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
