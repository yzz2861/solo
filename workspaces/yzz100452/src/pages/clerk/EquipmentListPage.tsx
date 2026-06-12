import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit3,
  CheckCircle2,
  Eye,
  Plus,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { Badge } from "@/components/ui/Badge";
import { useCameraStore } from "@/store/cameraStore";
import { useAuthStore } from "@/store/authStore";
import type { Equipment, EquipmentStatus } from "@/types";
import { formatDateTime, formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

const statusOptions: { value: EquipmentStatus; label: string }[] = [
  { value: "pending_inspect", label: "待检测" },
  { value: "available", label: "在售中" },
  { value: "reserved", label: "已预留" },
  { value: "sold", label: "已售出" },
  { value: "returned", label: "已退回" },
];

const brandOptions = [
  { value: "Sony", label: "Sony" },
  { value: "Canon", label: "Canon" },
  { value: "Nikon", label: "Nikon" },
  { value: "Fujifilm", label: "Fujifilm" },
  { value: "Leica", label: "Leica" },
  { value: "Olympus", label: "Olympus" },
  { value: "Panasonic", label: "Panasonic" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

type SortField = "createdAt" | "currentPrice" | "serialNumber";
type SortOrder = "asc" | "desc";

export default function EquipmentListPage() {
  const navigate = useNavigate();
  const equipments = useCameraStore((s) => s.equipments);
  const addPriceChangeRequest = useCameraStore((s) => s.addPriceChangeRequest);
  const markEquipmentSold = useCameraStore((s) => s.markEquipmentSold);
  const { currentUser } = useAuthStore();

  const [selectedStatuses, setSelectedStatuses] = useState<EquipmentStatus[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [keyword, setKeyword] = useState("");

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [priceChangeTarget, setPriceChangeTarget] = useState<Equipment | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  const [soldTarget, setSoldTarget] = useState<Equipment | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [soldSubmitting, setSoldSubmitting] = useState(false);

  const toggleStatus = (status: EquipmentStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredEquipments = useMemo(() => {
    let list = [...equipments];

    if (selectedStatuses.length > 0) {
      list = list.filter((e) => selectedStatuses.includes(e.status));
    }

    if (selectedBrand) {
      list = list.filter((e) => e.brand === selectedBrand);
    }

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.serialNumber.toLowerCase().includes(kw) ||
          e.brand.toLowerCase().includes(kw) ||
          e.model.toLowerCase().includes(kw) ||
          e.consignorName.includes(kw)
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortField === "createdAt") {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "currentPrice") {
        diff = a.currentPrice - b.currentPrice;
      } else if (sortField === "serialNumber") {
        diff = a.serialNumber.localeCompare(b.serialNumber);
      }
      return sortOrder === "asc" ? diff : -diff;
    });

    return list;
  }, [equipments, selectedStatuses, selectedBrand, keyword, sortField, sortOrder]);

  const stats = useMemo(() => {
    const total = equipments.length;
    const pending = equipments.filter((e) => e.status === "pending_inspect").length;
    const available = equipments.filter((e) => e.status === "available").length;
    const sold = equipments.filter((e) => e.status === "sold").length;
    return { total, pending, available, sold };
  }, [equipments]);

  const openPriceChange = (eq: Equipment) => {
    setPriceChangeTarget(eq);
    setNewPrice(eq.currentPrice.toString());
    setPriceReason("");
  };

  const submitPriceChange = () => {
    if (!priceChangeTarget || !currentUser) return;
    const newPriceNum = parseFloat(newPrice);
    if (isNaN(newPriceNum) || newPriceNum <= 0) return;
    if (!priceReason.trim()) return;
    if (newPriceNum === priceChangeTarget.currentPrice) return;

    setPriceSubmitting(true);
    setTimeout(() => {
      addPriceChangeRequest({
        equipmentId: priceChangeTarget.id,
        oldPrice: priceChangeTarget.currentPrice,
        newPrice: newPriceNum,
        reason: priceReason.trim(),
        requesterId: currentUser.id,
        requesterName: currentUser.name,
      });
      setPriceSubmitting(false);
      setPriceChangeTarget(null);
    }, 500);
  };

  const openSold = (eq: Equipment) => {
    setSoldTarget(eq);
    setSoldPrice(eq.currentPrice.toString());
  };

  const submitSold = () => {
    if (!soldTarget) return;
    const price = parseFloat(soldPrice);
    if (isNaN(price) || price <= 0) return;

    setSoldSubmitting(true);
    setTimeout(() => {
      markEquipmentSold(soldTarget.id, price);
      setSoldSubmitting(false);
      setSoldTarget(null);
    }, 500);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 text-space-500 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-brass-300" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-brass-300" />
    );
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1">
            CLERK · INVENTORY
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            设备库存管理
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate("/clerk/equipment/new")}
          >
            新设备入库
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "设备总数", value: stats.total, color: "brass", icon: "📦" },
          { label: "待检测", value: stats.pending, color: "orange", icon: "🔍" },
          { label: "在售中", value: stats.available, color: "green", icon: "✨" },
          { label: "已售出", value: stats.sold, color: "neutral", icon: "💸" },
        ].map((s) => (
          <div
            key={s.label}
            className="card-panel p-4 relative overflow-hidden"
          >
            <div
              className={cn(
                "absolute top-0 left-0 h-[2px] w-full",
                s.color === "brass" && "opacity-60"
              )}
              style={s.color === "brass" ? { background: BRASS_GRADIENT } : undefined}
            />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-space-400 tracking-wide">{s.label}</span>
              <span className="text-base">{s.icon}</span>
            </div>
            <div className="font-mono text-2xl font-bold text-space-100">
              {s.value}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title="筛选条件"
            subtitle="FILTERS"
            action={
              <div
                className="flex items-center justify-center w-9 h-9 rounded-md bg-space-800/40 border border-space-700"
              >
                <Filter className="w-[18px] h-[18px] text-space-400" />
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 relative">
                <label className="label-field">状态筛选</label>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full input-field appearance-none text-left flex items-center justify-between pr-9"
                >
                  <span className={selectedStatuses.length === 0 ? "text-space-500" : "text-space-200"}>
                    {selectedStatuses.length === 0
                      ? "全部状态"
                      : `已选 ${selectedStatuses.length} 项`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-400 transition-transform",
                      showStatusDropdown && "rotate-180"
                    )}
                  />
                </button>
                {selectedStatuses.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStatuses([]);
                    }}
                    className="absolute right-10 top-[38px] -translate-y-1/2 text-space-500 hover:text-signal-red transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {showStatusDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowStatusDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 card-panel p-2 shadow-lg">
                      {statusOptions.map((opt) => {
                        const checked = selectedStatuses.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleStatus(opt.value)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                              checked
                                ? "bg-brass/10 text-brass-200"
                                : "text-space-300 hover:bg-space-700/40"
                            )}
                          >
                            <span>{opt.label}</span>
                            {checked && (
                              <CheckCircle2 className="w-4 h-4 text-brass-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <Select
                label="品牌"
                options={brandOptions}
                placeholder="全部品牌"
                value={selectedBrand}
                onChange={setSelectedBrand}
              />

              <div className="md:col-span-2">
                <Input
                  label="关键词搜索"
                  placeholder="搜索序列号 / 型号 / 寄卖人..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
            </div>

            {selectedStatuses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[11px] text-space-500 flex items-center mr-1">
                  已选状态：
                </span>
                {selectedStatuses.map((s) => {
                  const opt = statusOptions.find((o) => o.value === s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brass/10 text-brass-200 border border-brass/30 hover:bg-signal-red/10 hover:text-signal-red hover:border-signal-red/30 transition-colors"
                    >
                      {opt?.label}
                      <X className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title={`设备列表 (${filteredEquipments.length})`}
            subtitle="EQUIPMENT LIST"
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-space-800/40">
                <tr>
                  <th className="text-left px-5 py-3">
                    <button
                      onClick={() => handleSort("serialNumber")}
                      className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-space-400 uppercase hover:text-space-300 transition-colors"
                    >
                      序列号
                      <SortIcon field="serialNumber" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono tracking-wider text-space-400 uppercase">
                    品牌 / 型号
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono tracking-wider text-space-400 uppercase">
                    寄卖人
                  </th>
                  <th className="text-left px-5 py-3">
                    <button
                      onClick={() => handleSort("currentPrice")}
                      className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-space-400 uppercase hover:text-space-300 transition-colors"
                    >
                      当前价
                      <SortIcon field="currentPrice" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono tracking-wider text-space-400 uppercase">
                    状态
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-mono tracking-wider text-space-400 uppercase">
                    成色
                  </th>
                  <th className="text-left px-5 py-3">
                    <button
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-space-400 uppercase hover:text-space-300 transition-colors"
                    >
                      入库时间
                      <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-mono tracking-wider text-space-400 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-space-700/40 flex items-center justify-center">
                          <Search className="w-6 h-6 text-space-500" />
                        </div>
                        <div className="text-sm text-space-400">未找到匹配的设备</div>
                        <div className="text-xs text-space-500">尝试调整筛选条件</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEquipments.map((eq) => (
                    <tr
                      key={eq.id}
                      className="border-t border-space-700/50 hover:bg-space-800/30 transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs text-brass-300 font-medium">
                          {eq.serialNumber}
                        </div>
                        <div className="text-[10px] text-space-500 mt-0.5 uppercase tracking-wider">
                          {eq.type === "body" ? "机身" : eq.type === "lens" ? "镜头" : "套机"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-space-200">
                          {eq.brand} {eq.model}
                        </div>
                        <div className="text-[11px] text-space-500 mt-0.5">
                          底价 {formatPrice(eq.basePrice)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-space-200">{eq.consignorName}</div>
                        <div className="text-[11px] text-space-500">{eq.consignorPhone}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-semibold text-brass-200">
                          {formatPrice(eq.currentPrice)}
                        </div>
                        {eq.currentPrice !== eq.basePrice && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {eq.currentPrice > eq.basePrice ? (
                              <TrendingUp className="w-3 h-3 text-signal-green" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-signal-orange" />
                            )}
                            <span
                              className={cn(
                                "text-[10px]",
                                eq.currentPrice > eq.basePrice
                                  ? "text-signal-green"
                                  : "text-signal-orange"
                              )}
                            >
                              {eq.currentPrice > eq.basePrice ? "+" : ""}
                              {((eq.currentPrice - eq.basePrice) / eq.basePrice * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusTag status={eq.status} />
                      </td>
                      <td className="px-5 py-3">
                        {eq.defectGrade ? (
                          <GradeBadge grade={eq.defectGrade} size="sm" />
                        ) : (
                          <Badge variant="neutral" dot>
                            未分级
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-space-300 font-mono">
                          {formatDateTime(eq.createdAt)}
                        </div>
                        {eq.soldAt && (
                          <div className="text-[10px] text-signal-green mt-0.5">
                            成交于 {formatDateTime(eq.soldAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/clerk/equipment/${eq.id}`)}
                            className="p-1.5 rounded-md text-space-400 hover:text-signal-blue hover:bg-signal-blue/10 transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {eq.status !== "sold" && eq.status !== "returned" && (
                            <button
                              onClick={() => openPriceChange(eq)}
                              className="p-1.5 rounded-md text-space-400 hover:text-signal-orange hover:bg-signal-orange/10 transition-colors"
                              title="申请调价"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {eq.status === "available" && (
                            <button
                              onClick={() => openSold(eq)}
                              className="p-1.5 rounded-md text-space-400 hover:text-signal-green hover:bg-signal-green/10 transition-colors"
                              title="标记成交"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <Modal
        open={!!priceChangeTarget}
        onClose={() => !priceSubmitting && setPriceChangeTarget(null)}
        size="md"
        title="申请调价"
        subtitle={priceChangeTarget ? `设备：${priceChangeTarget.brand} ${priceChangeTarget.model}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPriceChangeTarget(null)} disabled={priceSubmitting}>
              取消
            </Button>
            <Button
              variant="primary"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={submitPriceChange}
              loading={priceSubmitting}
              disabled={
                !newPrice.trim() ||
                !priceReason.trim() ||
                parseFloat(newPrice) === priceChangeTarget?.currentPrice ||
                parseFloat(newPrice) <= 0
              }
            >
              提交调价申请
            </Button>
          </>
        }
      >
        {priceChangeTarget && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-space-800/60 border border-space-700">
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  序列号
                </div>
                <div className="font-mono text-sm text-brass-300">
                  {priceChangeTarget.serialNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  当前状态
                </div>
                <StatusTag status={priceChangeTarget.status} dot={false} />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  当前售价
                </div>
                <div className="text-lg font-bold text-space-100">
                  {formatPrice(priceChangeTarget.currentPrice)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  寄卖底价
                </div>
                <div className="text-sm text-space-400 mt-1">
                  {formatPrice(priceChangeTarget.basePrice)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="新价格 (元)"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                leftIcon={<span className="text-sm font-semibold text-space-400">¥</span>}
                error={
                  parseFloat(newPrice) <= 0 && newPrice.trim()
                    ? "价格必须大于0"
                    : parseFloat(newPrice) === priceChangeTarget.currentPrice && newPrice.trim()
                    ? "新价格与当前价格相同"
                    : undefined
                }
              />
              <div className="flex items-end">
                {parseFloat(newPrice) > 0 &&
                  parseFloat(newPrice) !== priceChangeTarget.currentPrice && (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md border",
                        parseFloat(newPrice) > priceChangeTarget.currentPrice
                          ? "bg-signal-green/8 border-signal-green/25 text-signal-green"
                          : "bg-signal-orange/8 border-signal-orange/25 text-signal-orange"
                      )}
                    >
                      {parseFloat(newPrice) > priceChangeTarget.currentPrice ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">
                        {parseFloat(newPrice) > priceChangeTarget.currentPrice ? "涨价" : "降价"}
                        {" "}
                        {formatPrice(Math.abs(parseFloat(newPrice) - priceChangeTarget.currentPrice))}
                        {" ("}
                        {(((parseFloat(newPrice) - priceChangeTarget.currentPrice) / priceChangeTarget.currentPrice) * 100).toFixed(1)}
                        %)
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div>
              <label className="label-field">调价原因</label>
              <textarea
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                rows={3}
                placeholder="请详细说明调价原因（如：市场行情变化、咨询客户多、检测报告建议等）"
                className="w-full input-field resize-none"
              />
              <div className="mt-1 flex justify-between items-center">
                <span className="text-[11px] text-space-500">
                  {priceReason.length}/200
                </span>
                {!priceReason.trim() && (
                  <span className="text-[11px] text-signal-red flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    请填写调价原因
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-md bg-brass/8 border border-brass/20">
              <div className="flex items-start gap-2 text-xs text-brass-200/80">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  调价申请提交后需店长审批，审批通过后价格自动更新并写入价格历史。
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!soldTarget}
        onClose={() => !soldSubmitting && setSoldTarget(null)}
        size="sm"
        title="标记成交"
        subtitle={soldTarget ? `${soldTarget.brand} ${soldTarget.model}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSoldTarget(null)} disabled={soldSubmitting}>
              取消
            </Button>
            <Button
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={submitSold}
              loading={soldSubmitting}
              disabled={!soldPrice.trim() || parseFloat(soldPrice) <= 0}
            >
              确认成交
            </Button>
          </>
        }
      >
        {soldTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-signal-green/8 border border-signal-green/25">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-signal-green" />
                <span className="text-sm font-semibold text-signal-green">
                  确认完成此笔交易
                </span>
              </div>
              <div className="text-[11px] text-space-400">
                设备状态将变为「已售出」，成交价格将写入价格历史并触发起始结算流程。
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-space-500">序列号</span>
                <span className="font-mono text-space-300">{soldTarget.serialNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-space-500">寄卖人</span>
                <span className="text-space-300">
                  {soldTarget.consignorName} ({soldTarget.consignorPhone})
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-space-500">当前售价</span>
                <span className="text-brass-300 font-semibold">
                  {formatPrice(soldTarget.currentPrice)}
                </span>
              </div>
            </div>

            <Input
              label="实际成交价 (元)"
              type="number"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              leftIcon={<span className="text-sm font-semibold text-space-400">¥</span>}
              error={parseFloat(soldPrice) <= 0 && soldPrice.trim() ? "成交价必须大于0" : undefined}
              hint="如有议价，请输入最终成交金额"
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
