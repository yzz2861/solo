import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Receipt,
  Minus,
  Calendar,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { useCameraStore } from '@/store/cameraStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

function AnimatedDeduction({
  amount,
  delay,
}: {
  amount: number;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -10, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex items-center justify-between py-2 px-3 rounded-md bg-space-800/60 border border-space-700/50"
        >
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="w-7 h-7 rounded bg-signal-orange/10 flex items-center justify-center flex-shrink-0"
            >
              <TrendingDown className="w-3.5 h-3.5 text-signal-orange" />
            </motion.div>
            <span className="text-xs text-space-300">各项扣费</span>
          </div>
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-mono text-sm text-signal-orange font-semibold"
          >
            -{formatPrice(amount)}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ConsignorFeesPage() {
  const { settlements, equipments } = useCameraStore();
  const { currentUser } = useAuthStore();

  const mySettlements = useMemo(() => {
    if (!currentUser) return [];
    return settlements
      .filter((s) => s.consignorId === currentUser.id)
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [settlements, currentUser]);

  const totalPayout = useMemo(
    () => mySettlements.reduce((sum, s) => sum + s.payoutAmount, 0),
    [mySettlements]
  );

  const totalSold = useMemo(
    () => mySettlements.reduce((sum, s) => sum + s.soldPrice, 0),
    [mySettlements]
  );

  const totalDeduction = useMemo(
    () => mySettlements.reduce((sum, s) => sum + s.totalDeduction, 0),
    [mySettlements]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1.5">
            CONSIGNOR · FEES DETAIL
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            扣费明细
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
            style={{ background: BRASS_GRADIENT }}
          />
          成交 {mySettlements.length} 笔
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 20%, rgba(224,185,110,0.15) 0%, transparent 50%)',
          }}
        />
        <CardBody>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(224,185,110,0.2) 0%, rgba(147,112,61,0.2) 100%)',
                  border: '1px solid rgba(201,169,110,0.3)',
                }}
              >
                <Wallet className="w-5 h-5 text-brass-300" strokeWidth={2} />
              </div>
              <div>
                <div className="text-[11px] text-space-400">累计到账金额</div>
                <div className="text-xs text-space-500">TOTAL PAYOUT</div>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-2">
              <span className="text-sm font-mono text-brass-400/70">¥</span>
              <motion.span
                key={totalPayout}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="font-mono text-4xl sm:text-5xl font-bold tracking-tight"
                style={{
                  background: BRASS_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {totalPayout.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </motion.span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-space-700/40">
              <MetricRow label="成交总额" value={formatPrice(totalSold)} variant="brass" />
              <MetricRow
                label="累计扣费"
                value={`-${formatPrice(totalDeduction)}`}
                variant="orange"
              />
              <MetricRow
                label="扣费占比"
                value={
                  totalSold > 0
                    ? `${((totalDeduction / totalSold) * 100).toFixed(1)}%`
                    : '—'
                }
                variant="neutral"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {mySettlements.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-base mb-2">暂无扣费明细</p>
              <p className="text-xs">设备成交后将在此显示扣费及到账信息</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-space-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brass-400/70" />
              逐笔明细
            </h2>
          </div>

          {mySettlements.map((s, idx) => {
            const equipment = equipments.find((e) => e.id === s.equipmentId);
            const feeItems = [
              { name: '平台服务费', amount: s.platformFee },
              { name: '检测鉴定费', amount: s.inspectionFee },
              ...s.otherFees,
            ];

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.3 }}
              >
                <Card>
                  <CardHeader
                    title={
                      <div className="flex items-center gap-3 flex-wrap">
                        {equipment?.defectGrade && (
                          <GradeBadge grade={equipment.defectGrade} size="sm" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-space-100">
                            {equipment
                              ? `${equipment.brand} ${equipment.model}`
                              : s.equipmentSerialNumber}
                          </div>
                          <div className="text-[11px] font-mono text-space-500 mt-0.5">
                            {s.equipmentSerialNumber}
                          </div>
                        </div>
                      </div>
                    }
                    subtitle={
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        成交：{formatDate(s.soldAt)}
                      </div>
                    }
                    action={
                      <Button variant="ghost" size="sm">
                        详情
                      </Button>
                    }
                  />
                  <CardBody>
                    <div className="space-y-3">
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 + 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-brass-400/8 to-transparent border border-brass-500/15"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-9 h-9 rounded-md flex items-center justify-center"
                            style={{ background: BRASS_GRADIENT }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              className="w-5 h-5 text-space-950"
                            >
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[11px] text-space-400">成交价格</div>
                            <div className="text-xs text-space-500">SOLD PRICE</div>
                          </div>
                        </div>
                        <span className="font-mono text-xl font-bold text-brass-200">
                          {formatPrice(s.soldPrice)}
                        </span>
                      </motion.div>

                      <div className="flex items-center justify-center py-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-space-500">
                          <Minus className="w-3 h-3" />
                          扣费 DEDUCTION
                        </div>
                      </div>

                      <div className="space-y-2">
                        {feeItems.map((fee, fi) => (
                          <FeeItem
                            key={fi}
                            name={fee.name}
                            amount={fee.amount}
                            delay={idx * 300 + fi * 120 + 150}
                          />
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: idx * 0.08 + feeItems.length * 0.12 + 0.3,
                          duration: 0.4,
                        }}
                        className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-signal-green/8 to-transparent border border-signal-green/15 mt-4"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-md bg-signal-green/15 flex items-center justify-center border border-signal-green/25">
                            <Wallet className="w-5 h-5 text-signal-green" strokeWidth={2} />
                          </div>
                          <div>
                            <div className="text-[11px] text-space-400">实际到账</div>
                            <div className="text-xs text-space-500">NET PAYOUT</div>
                          </div>
                        </div>
                        <span className="font-mono text-xl font-bold text-signal-green">
                          {formatPrice(s.payoutAmount)}
                        </span>
                      </motion.div>

                      <AnimatedDeduction
                        amount={s.totalDeduction}
                        delay={idx * 300 + feeItems.length * 120 + 80}
                      />
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function MetricRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'brass' | 'orange' | 'neutral';
}) {
  const variantStyles = {
    brass: 'text-brass-300',
    orange: 'text-signal-orange',
    neutral: 'text-space-300',
  };

  return (
    <div>
      <div className="text-[11px] text-space-500 mb-1">{label}</div>
      <div className={cn('font-mono text-sm font-semibold', variantStyles[variant])}>
        {value}
      </div>
    </div>
  );
}

function FeeItem({
  name,
  amount,
  delay,
}: {
  name: string;
  amount: number;
  delay: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={false}
      animate={
        mounted
          ? { opacity: 1, x: 0, height: 'auto', marginBottom: 0 }
          : { opacity: 0, x: -12, height: 0, marginBottom: -8 }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="flex items-center justify-between py-2.5 px-3.5 rounded-md bg-space-800/50 border border-space-700/40 group hover:border-space-600/60 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={false}
          animate={mounted ? { rotate: 0, scale: 1, opacity: 1 } : { rotate: -45, scale: 0.5, opacity: 0 }}
          transition={{ delay: 0.03, duration: 0.25 }}
          className="w-6 h-6 rounded bg-signal-orange/10 flex items-center justify-center flex-shrink-0"
        >
          <Minus className="w-3 h-3 text-signal-orange" strokeWidth={2.5} />
        </motion.div>
        <span className="text-xs text-space-200">{name}</span>
      </div>
      <motion.span
        initial={false}
        animate={
          mounted
            ? { opacity: 1, x: 0, scale: 1 }
            : { opacity: 0, x: 8, scale: 0.8 }
        }
        transition={{ delay: 0.08, duration: 0.25 }}
        className="font-mono text-xs text-signal-orange font-semibold"
      >
        -{formatPrice(amount)}
      </motion.span>
    </motion.div>
  );
}
