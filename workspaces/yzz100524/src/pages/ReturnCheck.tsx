import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Star,
  Bicycle,
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatDateTime, formatMoney } from '@/utils/format';
import { INSPECTION_ITEMS } from '@/types';
import { useToast } from '@/store/app';
import type { TestRide } from '@/types';

export default function ReturnCheck() {
  const { id } = useParams();
  const navigate = useNavigate();
  const show = useToast((s) => s.show);

  const [ride, setRide] = useState<TestRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [inspection, setInspection] = useState<Record<string, boolean>>({});
  const [returnCondition, setReturnCondition] = useState<'normal' | 'scratched' | 'damaged'>('normal');
  const [returnNotes, setReturnNotes] = useState('');
  const [deduction, setDeduction] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');

  const [hasFeedback, setHasFeedback] = useState(false);
  const [preference, setPreference] = useState('');
  const [satisfaction, setSatisfaction] = useState('');
  const [intendedModel, setIntendedModel] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [starRating, setStarRating] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.testRides
      .list()
      .then((list) => {
        const r = list.find((x: TestRide) => x.id === Number(id));
        if (!r) {
          show('未找到该试骑记录', 'error');
          return;
        }
        setRide(r);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!ride) return;
    setSubmitting(true);
    try {
      const failedItems = INSPECTION_ITEMS.filter((i) => !inspection[i.id]);
      const issues: { type: string; description: string; severity: string }[] = failedItems.map((i) => ({
        type: i.label,
        description: `检查项未通过: ${i.label}${returnNotes ? `; ${returnNotes}` : ''}`,
        severity: returnCondition === 'damaged' ? 'major' : returnCondition === 'scratched' ? 'minor' : 'minor',
      }));

      if (returnCondition === 'damaged' || returnCondition === 'scratched') {
        issues.push({
          type: returnCondition === 'damaged' ? '车辆损坏' : '车辆刮蹭',
          description: returnNotes || deductionReason || '归还时发现异常',
          severity: returnCondition === 'damaged' ? 'critical' : 'minor',
        });
      }

      await api.testRides.returnRide(ride.id, {
        return_condition: returnCondition,
        return_notes: returnNotes,
        deduction_amount: deduction,
        deduction_reason: deductionReason,
        issues: issues.length > 0 ? issues : undefined,
      });

      if (hasFeedback) {
        const sat = satisfaction || (starRating >= 4 ? '满意' : starRating >= 3 ? '一般' : '不满意');
        await api.customers.feedback(ride.customer_id, {
          test_ride_id: ride.id,
          preference,
          satisfaction: sat,
          intended_model: intendedModel,
          notes: feedbackNotes,
        });
      }

      show('归还检查完成，押金已处理', 'success');
      setTimeout(() => navigate('/'), 800);
    } catch (e: any) {
      show(e.message || '提交失败', 'error');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!ride) return <div className="text-center py-20 text-gray-400">未找到试骑记录</div>;

  const refundAmount = Math.max(0, ride.deposit_amount - (deduction || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={18} /> 返回
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary-500">归还检查</h1>
          <p className="text-sm text-gray-500 mt-1">检查车辆状态，处理押金退还</p>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="grid grid-cols-5 gap-6">
          <div>
            <div className="text-sm text-white/70">客户</div>
            <div className="font-bold text-lg mt-1">{ride.customer_name}</div>
            <div className="text-xs text-white/70">{ride.customer_phone}</div>
          </div>
          <div>
            <div className="text-sm text-white/70">车辆</div>
            <div className="font-bold text-lg mt-1 flex items-center gap-1">
              <Bicycle size={18} /> {ride.vehicle_model}
            </div>
            <div className="text-xs text-white/70">{ride.vehicle_frame}</div>
          </div>
          <div>
            <div className="text-sm text-white/70">开始时间</div>
            <div className="font-semibold mt-1">{formatDateTime(ride.start_time)}</div>
          </div>
          <div>
            <div className="text-sm text-white/70">预计归还</div>
            <div className="font-semibold mt-1">{formatDateTime(ride.expected_return_time)}</div>
          </div>
          <div>
            <div className="text-sm text-white/70">押金金额</div>
            <div className="font-bold text-2xl text-accent-500 mt-1">{formatMoney(ride.deposit_amount)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
            <Check size={20} /> 车况逐项检查
          </h2>
          <p className="text-xs text-gray-500 mb-4">勾选代表该项目检查正常</p>
          <div className="grid grid-cols-2 gap-3">
            {INSPECTION_ITEMS.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  inspection[item.id]
                    ? 'border-success bg-green-50'
                    : 'border-gray-200 hover:border-warning hover:bg-yellow-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!inspection[item.id]}
                  onChange={(e) =>
                    setInspection({ ...inspection, [item.id]: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-300 text-success focus:ring-success"
                />
                <span className={`text-sm ${inspection[item.id] ? 'text-gray-700' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t space-y-4">
            <div>
              <label className="label">车况总体评价</label>
              <div className="flex gap-2">
                {[
                  { v: 'normal', l: '正常', c: 'badge-green', ic: ThumbsUp },
                  { v: 'scratched', l: '有刮蹭', c: 'badge-yellow', ic: Meh },
                  { v: 'damaged', l: '有损坏', c: 'badge-red', ic: ThumbsDown },
                ].map((opt) => {
                  const Icon = opt.ic;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setReturnCondition(opt.v as any)}
                      className={`flex-1 py-3 rounded-lg border-2 transition flex items-center justify-center gap-2 ${
                        returnCondition === opt.v
                          ? `${opt.c} border-current font-semibold`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={16} />
                      {opt.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">备注说明</label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="如有异常请详细描述（刮蹭位置、程度等）"
                rows={3}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
              <DollarSign size={20} /> 押金退还处理
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-500">收取押金</span>
                <span className="font-bold text-lg">{formatMoney(ride.deposit_amount)}</span>
              </div>
              <div>
                <label className="label">扣除赔偿金额（元）</label>
                <input
                  type="number"
                  value={deduction}
                  onChange={(e) => setDeduction(Number(e.target.value))}
                  className="input"
                  min={0}
                />
              </div>
              <div>
                <label className="label">扣除原因</label>
                <input
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  className="input"
                  placeholder="如：前叉刮蹭维修费用"
                />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <span className="text-success font-medium">应退金额</span>
                <span className="text-success font-bold text-2xl">{formatMoney(refundAmount)}</span>
              </div>
              {deduction > 0 && (
                <div className="flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle size={14} className="mt-0.5" />
                  <span>已从押金中扣除 {formatMoney(deduction)}，请在系统中确认</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary-500 flex items-center gap-2">
                <MessageSquare size={20} /> 客户试骑反馈
                <span className="text-xs font-normal text-gray-400">（写入客户档案）</span>
              </h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFeedback}
                  onChange={(e) => setHasFeedback(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-400"
                />
                录入反馈
              </label>
            </div>

            {hasFeedback && (
              <div className="space-y-4">
                <div>
                  <label className="label">整体满意度</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setStarRating(n)}
                        className="p-1"
                      >
                        <Star
                          size={28}
                          className={n <= starRating ? 'text-accent-500 fill-accent-500' : 'text-gray-300'}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['满意', '一般', '不满意'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSatisfaction(s)}
                        className={`px-3 py-1.5 rounded text-sm border transition ${
                          satisfaction === s
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-gray-200 text-gray-500 hover:border-primary-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">客户偏好</label>
                    <input
                      value={preference}
                      onChange={(e) => setPreference(e.target.value)}
                      className="input"
                      placeholder="如：长续航、轻便、高速度"
                    />
                  </div>
                  <div>
                    <label className="label">意向车型</label>
                    <input
                      value={intendedModel}
                      onChange={(e) => setIntendedModel(e.target.value)}
                      className="input"
                      placeholder="客户考虑购买的车型"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">其他备注</label>
                  <textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="客户需求、关注点等"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button onClick={() => navigate('/')} className="btn-secondary">
          取消
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-accent !px-8 !py-3 text-base">
          {submitting ? '提交中...' : `确认归还（应退 ${formatMoney(refundAmount)}）`}
        </button>
      </div>
    </div>
  );
}
