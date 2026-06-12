import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Calendar,
  User,
  Search,
  Plus,
  TrendingUp,
  Tag,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useCameraStore } from '@/store/cameraStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatDate, formatDateTime } from '@/utils/format';
import { exportToCSV } from '@/utils/csv';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span>{formatPrice(display)}</span>;
}

export default function AuditLogPage() {
  const { priceChangeLogs, equipments } = useCameraStore();
  const { currentUser } = useAuthStore();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const operatorOptions = useMemo(() => {
    const unique = new Map<string, string>();
    priceChangeLogs.forEach((log) => {
      unique.set(log.operatorId, log.operatorName);
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [priceChangeLogs]);

  const filteredLogs = useMemo(() => {
    return priceChangeLogs
      .filter((log) => {
        if (dateFrom) {
          const logDate = new Date(log.createdAt).toISOString().split('T')[0];
          if (logDate < dateFrom) return false;
        }
        if (dateTo) {
          const logDate = new Date(log.createdAt).toISOString().split('T')[0];
          if (logDate > dateTo) return false;
        }
        if (operatorFilter && log.operatorId !== operatorFilter) return false;
        if (typeFilter && log.changeType !== typeFilter) return false;
        if (searchKeyword) {
          const equipment = equipments.find((e) => e.id === log.equipmentId);
          const keyword = searchKeyword.toLowerCase();
          const matchBrand = equipment?.brand.toLowerCase().includes(keyword);
          const matchModel = equipment?.model.toLowerCase().includes(keyword);
          const matchSerial = equipment?.serialNumber.toLowerCase().includes(keyword);
          const matchRemark = log.remark?.toLowerCase().includes(keyword);
          if (!matchBrand && !matchModel && !matchSerial && !matchRemark) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [priceChangeLogs, dateFrom, dateTo, operatorFilter, typeFilter, searchKeyword, equipments]);

  const handleExport = () => {
    const data = filteredLogs.map((log) => {
      const equipment = equipments.find((e) => e.id === log.equipmentId);
      return {
        时间: formatDateTime(log.createdAt),
        操作类型:
          log.changeType === 'create' ? '入库定价' : log.changeType === 'adjust' ? '价格调整' : '成交出售',
        设备: equipment ? `${equipment.brand} ${equipment.model}` : '—',
        序列号: equipment?.serialNumber || '—',
        原价: formatPrice(log.oldPrice),
        新价: formatPrice(log.newPrice),
        差额: formatPrice(log.newPrice - log.oldPrice),
        操作人: log.operatorName,
        备注: log.remark || '—',
      };
    });

    exportToCSV(
      data,
      [
        { key: '时间', label: '时间' },
        { key: '操作类型', label: '操作类型' },
        { key: '设备', label: '设备' },
        { key: '序列号', label: '序列号' },
        { key: '原价', label: '原价' },
        { key: '新价', label: '新价' },
        { key: '差额', label: '差额' },
        { key: '操作人', label: '操作人' },
        { key: '备注', label: '备注' },
      ],
      `价格审计日志_${formatDate(new Date().toISOString())}.csv`
    );
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'create':
        return {
          label: '入库定价',
          icon: Plus,
          variant: 'success' as const,
          dot: 'bg-signal-green',
        };
      case 'adjust':
        return {
          label: '价格调整',
          icon: TrendingUp,
          variant: 'info' as const,
          dot: 'bg-signal-blue',
        };
      case 'sale':
        return {
          label: '成交出售',
          icon: Tag,
          variant: 'warning' as const,
          dot: 'bg-signal-orange',
        };
      default:
        return {
          label: type,
          icon: AlertCircle,
          variant: 'neutral' as const,
          dot: 'bg-space-400',
        };
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
            MANAGER · AUDIT LOG
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            审计日志
          </h1>
        </div>
        <Button
          icon={<Download className="w-4 h-4" />}
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
        >
          导出CSV
        </Button>
      </div>

      <Card>
        <CardHeader
          title="筛选条件"
          subtitle={`共 ${filteredLogs.length} 条日志记录`}
        />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label="开始日期"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="结束日期"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              label="操作人"
              placeholder="全部操作人"
              value={operatorFilter}
              onChange={setOperatorFilter}
              options={operatorOptions}
            />
            <Select
              label="操作类型"
              placeholder="全部类型"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'create', label: '入库定价' },
                { value: 'adjust', label: '价格调整' },
                { value: 'sale', label: '成交出售' },
              ]}
            />
            <Input
              label="设备关键词"
              placeholder="品牌/型号/序列号"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="价格变动时间轴"
          subtitle="按时间倒序排列"
        />
        <CardBody>
          {filteredLogs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">暂无符合条件的日志记录</p>
            </div>
          ) : (
            <div className="relative">
              <div
                className="absolute left-[18px] top-2 bottom-2 w-[2px]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(224,185,110,0.6) 0%, rgba(201,169,110,0.3) 100%)',
                }}
              />

              <AnimatePresence>
                <div className="space-y-4">
                  {filteredLogs.map((log, idx) => {
                    const equipment = equipments.find((e) => e.id === log.equipmentId);
                    const typeConfig = getTypeConfig(log.changeType);
                    const TypeIcon = typeConfig.icon;
                    const priceDiff = log.newPrice - log.oldPrice;
                    const isPriceUp = priceDiff > 0;

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: idx * 0.03, duration: 0.3 }}
                        className="relative pl-12"
                      >
                        <div
                          className={cn(
                            'absolute left-[10px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            'bg-space-900 border-brass-400/60'
                          )}
                        >
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              typeConfig.dot
                            )}
                          />
                        </div>

                        <div className="card-panel p-4 hover:border-brass-400/25 transition-all duration-200 group">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                                style={{
                                  background: BRASS_GRADIENT,
                                  color: '#0f1115',
                                }}
                              >
                                {log.operatorName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-space-100">
                                    {log.operatorName}
                                  </span>
                                  <Badge variant={typeConfig.variant} dot>
                                    <TypeIcon className="w-3 h-3 mr-0.5" />
                                    {typeConfig.label}
                                  </Badge>
                                </div>

                                <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                                  {log.changeType === 'create' ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs text-space-500">定价：</span>
                                      <span className="text-lg font-mono font-bold text-signal-green">
                                        <AnimatedNumber value={log.newPrice} />
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs text-space-500">原价</span>
                                      <span className="text-sm font-mono text-space-400 line-through">
                                        <AnimatedNumber value={log.oldPrice} />
                                      </span>
                                      <span className="text-space-600">→</span>
                                      <span className="text-xs text-space-500">新价</span>
                                      <span
                                        className={cn(
                                          'text-lg font-mono font-bold',
                                          isPriceUp ? 'text-signal-green' : 'text-signal-red'
                                        )}
                                      >
                                        <AnimatedNumber value={log.newPrice} />
                                      </span>
                                      <span
                                        className={cn(
                                          'text-[11px] font-mono px-2 py-0.5 rounded',
                                          isPriceUp
                                            ? 'bg-signal-green/10 text-signal-green'
                                            : 'bg-signal-red/10 text-signal-red'
                                        )}
                                      >
                                        {isPriceUp ? '+' : ''}
                                        {formatPrice(priceDiff)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-2.5 flex items-center gap-4 flex-wrap text-xs text-space-400">
                                  <div className="flex items-center gap-1.5">
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      className="w-3.5 h-3.5 text-brass-400/70"
                                    >
                                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                      <circle cx="12" cy="13" r="4" />
                                    </svg>
                                    <span className="truncate max-w-[280px]">
                                      {equipment
                                        ? `${equipment.brand} ${equipment.model}`
                                        : '未知设备'}
                                    </span>
                                    {equipment && (
                                      <span className="font-mono text-space-500">
                                        {equipment.serialNumber}
                                      </span>
                                    )}
                                  </div>
                                  {log.remark && (
                                    <div className="flex items-center gap-1.5 max-w-[320px]">
                                      <AlertCircle className="w-3.5 h-3.5 text-space-500 flex-shrink-0" />
                                      <span className="truncate">{log.remark}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-space-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(log.createdAt)}
                              </div>
                              <div className="text-[11px] font-mono text-space-500">
                                {new Date(log.createdAt).toLocaleTimeString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}
