import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  Tag,
  AlertCircle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { StatusTag } from '@/components/ui/StatusTag';
import { Badge } from '@/components/ui/Badge';
import { useCameraStore } from '@/store/cameraStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

export default function ConsignorPortal() {
  const { equipments } = useCameraStore();
  const { currentUser } = useAuthStore();

  const myEquipments = useMemo(() => {
    if (!currentUser) return [];
    return equipments
      .filter((e) => e.consignorId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [equipments, currentUser]);

  const stats = useMemo(() => {
    const total = myEquipments.length;
    const available = myEquipments.filter((e) => e.status === 'available').length;
    const sold = myEquipments.filter((e) => e.status === 'sold').length;
    const totalSoldPrice = myEquipments
      .filter((e) => e.status === 'sold')
      .reduce((sum, e) => sum + (e.soldPrice || 0), 0);
    return { total, available, sold, totalSoldPrice };
  }, [myEquipments]);

  const getProgressConfig = (status: string) => {
    switch (status) {
      case 'pending_inspect':
        return { label: '检测中', progress: 25, color: 'bg-signal-orange' };
      case 'available':
        return { label: '在售中', progress: 50, color: 'bg-signal-green' };
      case 'reserved':
        return { label: '已预留', progress: 75, color: 'bg-signal-blue' };
      case 'sold':
        return { label: '已成交', progress: 100, color: 'bg-brass-400' };
      case 'returned':
        return { label: '已退回', progress: 100, color: 'bg-signal-red' };
      default:
        return { label: status, progress: 0, color: 'bg-space-500' };
    }
  };

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
            CONSIGNOR · MY DEVICES
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            我的设备
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
            style={{ background: BRASS_GRADIENT }}
          />
          共 {stats.total} 台设备
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label="设备总数"
          value={stats.total}
          unit="台"
          icon={Package}
          accent="from-brass-400/20"
        />
        <MiniStat
          label="在售中"
          value={stats.available}
          unit="台"
          icon={Tag}
          accent="from-signal-green/20"
        />
        <MiniStat
          label="已成交"
          value={stats.sold}
          unit="台"
          icon={CheckCircle2}
          accent="from-signal-blue/20"
        />
        <MiniStat
          label="成交总额"
          value={formatPrice(stats.totalSoldPrice).replace('¥', '')}
          unit=""
          icon={Package}
          accent="from-brass-400/25"
          isPrice
        />
      </div>

      {myEquipments.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-base mb-2">暂无设备记录</p>
              <p className="text-xs">
                联系店员将您的设备寄卖，开启收益之旅
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {myEquipments.map((eq, idx) => {
            const progress = getProgressConfig(eq.status);
            const isSold = eq.status === 'sold';

            return (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Card className="h-full group">
                  <div className="relative">
                    <div
                      className={cn(
                        'aspect-[4/3] relative overflow-hidden',
                        isSold && 'grayscale opacity-70'
                      )}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(145deg, #1a1f2a 0%, #141821 50%, #0f1318 100%)',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className={cn(
                            'w-20 h-20 transition-all duration-300',
                            'text-brass-400/40 group-hover:text-brass-400/60'
                          )}
                        >
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </div>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 30%, rgba(224,185,110,0.12) 0%, transparent 60%)',
                        }}
                      />

                      {isSold && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            已成交
                          </Badge>
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        {eq.defectGrade && <GradeBadge grade={eq.defectGrade} />}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <StatusTag status={eq.status} />
                      </div>
                    </div>

                    <div
                      className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
                      style={{ background: BRASS_GRADIENT }}
                    />
                  </div>

                  <CardBody>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-space-100 truncate">
                          {eq.brand} {eq.model}
                        </h3>
                        <p className="text-[11px] font-mono text-space-500 mt-0.5">
                          {eq.serialNumber}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[10px] text-space-500 mb-0.5">当前价</div>
                        <div className="font-mono text-lg font-bold text-brass-300">
                          {formatPrice(eq.currentPrice)}
                        </div>
                      </div>
                    </div>

                    {isSold && eq.soldPrice && (
                      <div className="mb-3 p-2.5 rounded-md bg-signal-green/5 border border-signal-green/15">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-signal-green/80">成交金额</span>
                          <span className="font-mono text-sm font-bold text-signal-green">
                            {formatPrice(eq.soldPrice)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-space-400">
                          {progress.label}
                        </span>
                        <span className="text-[11px] font-mono text-space-500">
                          {progress.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-space-700/60 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.progress}%` }}
                          transition={{ duration: 0.6, delay: 0.2 + idx * 0.05 }}
                          className={cn('h-full rounded-full', progress.color)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-space-700/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-space-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(eq.createdAt)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        iconPosition="right"
                      >
                        详情
                      </Button>
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

function MiniStat({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  isPrice = false,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  accent: string;
  isPrice?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card-panel p-4 relative overflow-hidden"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-50 pointer-events-none`}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex items-center justify-center rounded w-7 h-7"
            style={{
              background:
                'linear-gradient(135deg, rgba(224,185,110,0.12) 0%, rgba(147,112,61,0.12) 100%)',
              border: '1px solid rgba(201,169,110,0.2)',
            }}
          >
            <Icon className="w-4 h-4 text-brass-300" strokeWidth={2} />
          </div>
          <span className="text-[11px] text-space-400">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          {isPrice ? (
            <>
              <span className="text-[11px] text-space-400">¥</span>
              <span className="font-mono text-xl font-bold text-space-100">{value}</span>
            </>
          ) : (
            <>
              <span className="font-mono text-xl font-bold text-space-100">{value}</span>
              <span className="text-[11px] text-space-400">{unit}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
