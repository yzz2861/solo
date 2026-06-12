import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Receipt,
  Wallet,
  AlertCircle,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useCameraStore } from '@/store/cameraStore';
import { formatPrice, formatDate } from '@/utils/format';
import { exportToCSV } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Settlement } from '@/types';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

export default function SettlementPage() {
  const { settlements } = useCameraStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSettlements = useMemo(() => {
    return settlements
      .filter((s) => {
        if (dateFrom) {
          const soldDate = new Date(s.soldAt).toISOString().split('T')[0];
          if (soldDate < dateFrom) return false;
        }
        if (dateTo) {
          const soldDate = new Date(s.soldAt).toISOString().split('T')[0];
          if (soldDate > dateTo) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }, [settlements, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalSold = filteredSettlements.reduce((sum, s) => sum + s.soldPrice, 0);
    const totalDeduction = filteredSettlements.reduce((sum, s) => sum + s.totalDeduction, 0);
    const totalPayout = filteredSettlements.reduce((sum, s) => sum + s.payoutAmount, 0);
    return { totalSold, totalDeduction, totalPayout };
  }, [filteredSettlements]);

  const handleExport = () => {
    const data = filteredSettlements.map((s) => ({
      序列号: s.equipmentSerialNumber,
      成交价: formatPrice(s.soldPrice),
      平台费: formatPrice(s.platformFee),
      检测费: formatPrice(s.inspectionFee),
      其他费: s.otherFees.map((f) => `${f.name}:${formatPrice(f.amount)}`).join('; ') || '—',
      扣费合计: formatPrice(s.totalDeduction),
      实际到账: formatPrice(s.payoutAmount),
      寄卖人: s.consignorName,
      联系电话: s.consignorPhone,
      成交日期: formatDate(s.soldAt),
      结算日期: formatDate(s.settledAt),
      经办人: s.managerName,
    }));

    exportToCSV(
      data,
      [
        { key: '序列号', label: '序列号' },
        { key: '成交价', label: '成交价' },
        { key: '平台费', label: '平台费' },
        { key: '检测费', label: '检测费' },
        { key: '其他费', label: '其他费' },
        { key: '扣费合计', label: '扣费合计' },
        { key: '实际到账', label: '实际到账' },
        { key: '寄卖人', label: '寄卖人' },
        { key: '联系电话', label: '联系电话' },
        { key: '成交日期', label: '成交日期' },
        { key: '结算日期', label: '结算日期' },
        { key: '经办人', label: '经办人' },
      ],
      `成交结算表_${formatDate(new Date().toISOString())}.csv`
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
            MANAGER · SETTLEMENT
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            成交结算
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
              style={{ background: BRASS_GRADIENT }}
            />
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </div>
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={filteredSettlements.length === 0}
          >
            导出结算表CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="日期范围筛选" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              label="成交起始日期"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="成交结束日期"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="成交总额"
          value={summary.totalSold}
          accent="from-brass-400/25 to-brass-700/10"
          icon={DollarSign}
        />
        <SummaryCard
          label="总扣费"
          value={summary.totalDeduction}
          accent="from-signal-orange/20 to-transparent"
          icon={Receipt}
          prefix=""
        />
        <SummaryCard
          label="总到账"
          value={summary.totalPayout}
          accent="from-signal-green/20 to-transparent"
          icon={Wallet}
        />
      </div>

      <Card>
        <CardHeader
          title="结算明细"
          subtitle={`共 ${filteredSettlements.length} 条记录 · 点击行展开扣费详情`}
        />
        <CardBody noPadding>
          {filteredSettlements.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">暂无符合条件的结算记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-space-800/60 border-b border-brass-500/10">
                    <th className="w-10 px-3 py-3" />
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      序列号
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      成交价
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      平台费
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      检测费
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      其他费
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      扣费合计
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      实际到账
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      寄卖人
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                      成交日期
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredSettlements.map((s, idx) => (
                      <>
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={cn(
                            'border-b border-space-700/40 transition-colors cursor-pointer',
                            expandedId === s.id
                              ? 'bg-space-800/50'
                              : 'hover:bg-space-800/30'
                          )}
                          onClick={() => toggleExpand(s.id)}
                        >
                          <td className="px-3 py-3">
                            {expandedId === s.id ? (
                              <ChevronUp className="w-4 h-4 text-brass-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-space-500" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-space-200">
                              {s.equipmentSerialNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-brass-300 font-semibold">
                              {formatPrice(s.soldPrice)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-space-400">
                              -{formatPrice(s.platformFee)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-space-400">
                              -{formatPrice(s.inspectionFee)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {s.otherFees.length > 0 ? (
                              <Badge variant="warning">
                                {s.otherFees.length} 项
                              </Badge>
                            ) : (
                              <span className="text-xs text-space-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-signal-orange font-semibold">
                              -{formatPrice(s.totalDeduction)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-signal-green font-semibold">
                              {formatPrice(s.payoutAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-sm text-space-200">
                                {s.consignorName}
                              </span>
                              <div className="text-[11px] font-mono text-space-500 mt-0.5">
                                {s.consignorPhone}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-space-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(s.soldAt)}
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {expandedId === s.id && (
                            <motion.tr
                              key={`${s.id}_expand`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-space-800/30"
                            >
                              <td colSpan={10} className="px-5 py-0">
                                <ExpandedDetail settlement={s} />
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    ))}
                  </AnimatePresence>
                </tbody>
                <tfoot>
                  <tr className="bg-space-800/60 border-t-2 border-brass-500/20">
                    <td className="px-3 py-4" />
                    <td className="px-4 py-4 text-[12px] font-mono font-semibold text-brass-300">
                      合计 ({filteredSettlements.length} 笔)
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-brass-200 font-bold">
                        {formatPrice(summary.totalSold)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-signal-orange font-semibold">
                        -
                        {formatPrice(
                          filteredSettlements.reduce((sum, s) => sum + s.platformFee, 0)
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-signal-orange font-semibold">
                        -
                        {formatPrice(
                          filteredSettlements.reduce((sum, s) => sum + s.inspectionFee, 0)
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-signal-orange font-semibold">
                        -
                        {formatPrice(
                          filteredSettlements.reduce(
                            (sum, s) =>
                              sum + s.otherFees.reduce((a, f) => a + f.amount, 0),
                            0
                          )
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-signal-orange font-bold">
                        -{formatPrice(summary.totalDeduction)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-signal-green font-bold">
                        {formatPrice(summary.totalPayout)}
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: LucideIcon;
  prefix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-panel p-5 relative overflow-hidden group"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-60 pointer-events-none`}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex items-center justify-center rounded-md w-10 h-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(224,185,110,0.15) 0%, rgba(147,112,61,0.15) 100%)',
              border: '1px solid rgba(201,169,110,0.25)',
            }}
          >
            <Icon className="w-5 h-5 text-brass-300" strokeWidth={2} />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-mono text-2xl sm:text-3xl font-bold text-space-100 tracking-tight">
            {formatPrice(value)}
          </span>
        </div>
        <div className="text-[12px] text-space-400 tracking-wide">{label}</div>
      </div>
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
        style={{ background: BRASS_GRADIENT }}
      />
    </motion.div>
  );
}

function ExpandedDetail({ settlement }: { settlement: Settlement }) {
  const feeItems = [
    { name: '平台服务费', amount: settlement.platformFee },
    { name: '检测鉴定费', amount: settlement.inspectionFee },
    ...settlement.otherFees,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="text-[11px] font-mono tracking-wider text-space-500 mb-2">
            扣费明细
          </div>
          {feeItems.map((fee, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-md bg-space-800/60 border border-space-700/50"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-signal-orange/10 flex items-center justify-center">
                  <Minus className="w-3.5 h-3.5 text-signal-orange" />
                </div>
                <span className="text-sm text-space-200">{fee.name}</span>
              </div>
              <span className="font-mono text-sm text-signal-orange font-semibold">
                -{formatPrice(fee.amount)}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-mono tracking-wider text-space-500 mb-2">
            结算概览
          </div>

          <div className="p-4 rounded-md border border-brass-500/20 bg-gradient-to-br from-brass-400/5 to-transparent">
            <div className="space-y-3">
              <Row label="成交价格" value={formatPrice(settlement.soldPrice)} highlight />
              <div className="h-px bg-space-700/50" />
              <Row label="平台服务费" value={`-${formatPrice(settlement.platformFee)}`} />
              <Row label="检测鉴定费" value={`-${formatPrice(settlement.inspectionFee)}`} />
              {settlement.otherFees.map((f, i) => (
                <Row key={i} label={f.name} value={`-${formatPrice(f.amount)}`} />
              ))}
              <div className="h-px bg-space-700/50" />
              <Row label="扣费合计" value={`-${formatPrice(settlement.totalDeduction)}`} />
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-space-400">实际到账</span>
                  <span className="font-mono text-xl font-bold text-signal-green">
                    {formatPrice(settlement.payoutAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-space-800/60 border border-space-700/50">
              <div className="text-[10px] font-mono text-space-500 mb-1">经办人</div>
              <div className="text-sm text-space-200">{settlement.managerName}</div>
            </div>
            <div className="p-3 rounded-md bg-space-800/60 border border-space-700/50">
              <div className="text-[10px] font-mono text-space-500 mb-1">结算日期</div>
              <div className="text-sm text-space-200">{formatDate(settlement.settledAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-space-400">{label}</span>
      <span
        className={cn(
          'font-mono',
          highlight ? 'text-sm text-brass-200 font-semibold' : 'text-xs text-space-300'
        )}
      >
        {value}
      </span>
    </div>
  );
}
