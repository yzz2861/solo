import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  AlertCircle,
  type LucideIcon,
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
import { Modal } from '@/components/ui/Modal';
import { useCameraStore } from '@/store/cameraStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

export default function PriceAuditPage() {
  const { priceChangeRequests, equipments, approvePriceChangeRequest, rejectPriceChangeRequest } =
    useCameraStore();
  const { currentUser } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const filteredRequests = priceChangeRequests.filter((req) => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (searchKeyword) {
      const equipment = equipments.find((e) => e.id === req.equipmentId);
      const keyword = searchKeyword.toLowerCase();
      const matchBrand = equipment?.brand.toLowerCase().includes(keyword);
      const matchModel = equipment?.model.toLowerCase().includes(keyword);
      const matchSerial = equipment?.serialNumber.toLowerCase().includes(keyword);
      const matchRequester = req.requesterName.toLowerCase().includes(keyword);
      if (!matchBrand && !matchModel && !matchSerial && !matchRequester) return false;
    }
    return true;
  });

  const pendingCount = priceChangeRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = priceChangeRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = priceChangeRequests.filter((r) => r.status === 'rejected').length;

  const handleApprove = (id: string) => {
    if (!currentUser) return;
    approvePriceChangeRequest(id, currentUser.id, currentUser.name);
  };

  const openRejectModal = (id: string) => {
    setCurrentRequestId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = () => {
    if (!currentUser || !currentRequestId || !rejectReason.trim()) return;
    setSubmitLoading(true);
    setTimeout(() => {
      rejectPriceChangeRequest(currentRequestId, currentUser.id, currentUser.name, rejectReason.trim());
      setSubmitLoading(false);
      setRejectModalOpen(false);
      setCurrentRequestId(null);
    }, 400);
  };

  const getEquipment = (equipmentId: string) => equipments.find((e) => e.id === equipmentId);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      return <Badge variant="warning" dot>待审批</Badge>;
      case 'approved':
      return <Badge variant="success" dot>已通过</Badge>;
      case 'rejected':
      return <Badge variant="danger" dot>已驳回</Badge>;
      default:
      return <Badge variant="neutral">{status}</Badge>;
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
            MANAGER · PRICE AUDIT
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            调价审批
          </h1>
        </div>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="待审批"
          value={pendingCount}
          accent="from-signal-orange/20"
          icon={Clock}
        />
        <StatCard
          label="已通过"
          value={approvedCount}
          accent="from-signal-green/20"
          icon={CheckCircle2}
        />
        <StatCard
          label="已驳回"
          value={rejectedCount}
          accent="from-signal-red/20"
          icon={XCircle}
        />
      </div>

      <Card>
        <CardHeader
          title="调价申请列表"
          subtitle={`共 ${filteredRequests.length} 条记录`}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-56">
                <Input
                  placeholder="搜索品牌/型号/序列号/申请人"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <div className="w-40">
                <Select
                  placeholder="状态筛选"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'pending', label: '待审批' },
                    { value: 'approved', label: '已通过' },
                    { value: 'rejected', label: '已驳回' },
                  ]}
                />
              </div>
              <Button variant="ghost" size="sm" icon={<Filter className="w-4 h-4" />}>
                筛选
              </Button>
            </div>
          }
        />
        <CardBody noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-space-800/60 border-b border-brass-500/10">
                  <th className="text-left px-5 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    设备信息
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    价格变动
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    调价原因
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    申请人
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    申请时间
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    状态
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-mono font-medium text-space-400 tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16">
                        <div className="flex flex-col items-center justify-center text-space-500">
                          <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
                          <p className="text-sm">暂无调价申请记录</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req, idx) => {
                      const equipment = getEquipment(req.equipmentId);
                      const priceDiff = req.newPrice - req.oldPrice;
                      const isPriceUp = priceDiff > 0;

                      return (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b border-space-700/40 hover:bg-space-800/30 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center justify-center w-10 h-10 rounded-md"
                                style={{
                                  background:
                                    'linear-gradient(135deg, rgba(224,185,110,0.12) 0%, rgba(147,112,61,0.12) 100%)',
                                  border: '1px solid rgba(201,169,110,0.2)',
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="w-5 h-5 text-brass-300"
                                >
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                  <circle cx="12" cy="13" r="4" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-space-100 truncate max-w-[200px]">
                                  {equipment ? `${equipment.brand} ${equipment.model}` : '未知设备'}
                                </div>
                                <div className="text-[11px] font-mono text-space-500 mt-0.5">
                                  {equipment?.serialNumber || '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-space-400 line-through">
                                {formatPrice(req.oldPrice)}
                              </span>
                              <span
                                className={cn(
                                  'flex items-center gap-0.5 text-sm font-mono font-semibold',
                                  isPriceUp ? 'text-signal-green' : 'text-signal-red'
                                )}
                              >
                                {isPriceUp ? (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                )}
                                {formatPrice(req.newPrice)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                'text-[11px] font-mono mt-1',
                                isPriceUp ? 'text-signal-green' : 'text-signal-red'
                              )}
                            >
                              差额 {isPriceUp ? '+' : ''}
                              {formatPrice(priceDiff)}
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[240px]">
                            <p className="text-xs text-space-300 line-clamp-2">{req.reason}</p>
                            {req.rejectReason && (
                              <div className="mt-1.5 text-[11px] text-signal-red/80 flex items-start gap-1">
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>驳回：{req.rejectReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                  background: BRASS_GRADIENT,
                                  color: '#0f1115',
                                }}
                              >
                                {req.requesterName.charAt(0)}
                              </div>
                              <span className="text-sm text-space-200">{req.requesterName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-space-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDateTime(req.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-4">{statusBadge(req.status)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === 'pending' ? (
                                <>
                                  <Button
                                    size="sm"
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                    onClick={() => handleApprove(req.id)}
                                  >
                                    通过
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    icon={<XCircle className="w-4 h-4" />}
                                    onClick={() => openRejectModal(req.id)}
                                  >
                                    驳回
                                  </Button>
                                </>
                              ) : (
                                <span className="text-[11px] font-mono text-space-500">
                                  {req.approverName
                                    ? `${req.status === 'approved' ? '通过' : '驳回'}人：${req.approverName}`
                                    : '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="驳回调价申请"
        subtitle="请填写驳回原因"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={submitLoading}
              disabled={!rejectReason.trim()}
            >
              确认驳回
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-md bg-signal-red/5 border border-signal-red/20">
          <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-signal-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-signal-red">
                  驳回后将通知申请人
                </p>
                <p className="text-xs text-space-400 mt-1">
                  请详细说明驳回原因，便于申请人理解和调整
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="label-field">驳回原因</label>
            <div className="relative">
              <textarea
                placeholder="请输入驳回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={cn(
                  'w-full input-field resize-none min-h-[120px]',
                  rejectReason.trim() === '' && 'border-signal-red/60 focus:border-signal-red focus:ring-2 focus:ring-signal-red/20'
                )}
              />
            </div>
            {rejectReason.trim() === '' && (
              <p className="mt-1 text-xs text-signal-red">请输入驳回原因</p>
            )}
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: LucideIcon;
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
          <span className="font-mono text-3xl font-bold text-space-100 tracking-tight">
            {value}
          </span>
          <span className="text-xs text-space-400">条</span>
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
