import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit3,
  CheckCircle2,
  CalendarPlus,
  FileText,
  TrendingUp,
  TrendingDown,
  History,
  Clock,
  CalendarClock,
  Camera,
  Crosshair,
  Boxes,
  User,
  Phone,
  Tag,
  Package,
  Search,
  Eye,
  ListChecks,
  AlertCircle,
  ScanLine,
  Check,
  X,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusTag } from "@/components/ui/StatusTag";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { Input } from "@/components/ui/Input";
import { useCameraStore } from "@/store/cameraStore";
import { useAuthStore } from "@/store/authStore";
import type { Equipment, AppointmentStatus, EquipmentType } from "@/types";
import { formatDate, formatDateTime, formatPrice, formatShutter } from "@/utils/format";
import { cn } from "@/utils/cn";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

type DetailTab = "inspection" | "price" | "appointments";

const statusBadgeVariant: Record<AppointmentStatus, "warning" | "info" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  confirmed: "info",
  completed: "success",
  no_show: "danger",
  cancelled: "neutral",
};

const statusLabel: Record<AppointmentStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  completed: "已完成",
  no_show: "爽约",
  cancelled: "已取消",
};

const typeIcons: Record<EquipmentType, LucideIcon> = {
  body: Camera,
  lens: Crosshair,
  kit: Boxes,
};

const typeLabels: Record<EquipmentType, string> = {
  body: "机身",
  lens: "镜头",
  kit: "套机",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}

function InfoRow({ icon: Icon, label, value, accent }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5",
          accent
            ? "bg-brass/12 border border-brass/25"
            : "bg-space-700/40 border border-space-600/60"
        )}
      >
        <Icon className={cn("w-4 h-4", accent ? "text-brass-300" : "text-space-400")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono tracking-wider text-space-500 uppercase mb-0.5">
          {label}
        </div>
        <div className="text-sm text-space-200">{value}</div>
      </div>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipments = useCameraStore((s) => s.equipments);
  const inspections = useCameraStore((s) => s.inspections);
  const priceChangeLogs = useCameraStore((s) => s.priceChangeLogs);
  const appointments = useCameraStore((s) => s.appointments);
  const addPriceChangeRequest = useCameraStore((s) => s.addPriceChangeRequest);
  const markEquipmentSold = useCameraStore((s) => s.markEquipmentSold);
  const { currentUser } = useAuthStore();

  const equipment = useMemo(() => equipments.find((e) => e.id === id), [equipments, id]);
  const inspection = useMemo(
    () => inspections.find((i) => i.equipmentId === id),
    [inspections, id]
  );
  const priceLogs = useMemo(
    () =>
      priceChangeLogs
        .filter((l) => l.equipmentId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [priceChangeLogs, id]
  );
  const relatedAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.equipmentId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [appointments, id]
  );

  const [activeTab, setActiveTab] = useState<DetailTab>("inspection");

  const [priceChangeTarget, setPriceChangeTarget] = useState<Equipment | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  const [soldTarget, setSoldTarget] = useState<Equipment | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [soldSubmitting, setSoldSubmitting] = useState(false);

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

  if (!equipment) {
    return (
      <div className="card-panel p-16 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-signal-red/10 border border-signal-red/25 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-signal-red" />
          </div>
          <div>
            <div className="text-base font-semibold text-space-200 mb-1">设备不存在</div>
            <div className="text-xs text-space-500 mb-4">该设备可能已被删除或ID无效</div>
            <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
              返回上一页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[equipment.type];

  const tabList: { key: DetailTab; label: string; icon: LucideIcon; count?: number }[] = [
    { key: "inspection", label: "检测报告", icon: Search, count: inspection ? 1 : 0 },
    { key: "price", label: "价格历史", icon: History, count: priceLogs.length },
    { key: "appointments", label: "预约记录", icon: CalendarClock, count: relatedAppointments.length },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-space-800/60 border border-space-700 text-space-400 hover:text-brass-300 hover:border-brass/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1">
              EQUIPMENT · DETAIL
            </div>
            <h1 className="text-2xl font-bold text-space-100 tracking-wide">
              设备详情
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusTag status={equipment.status} />
          <span className="font-mono text-xs text-space-500 px-2 py-1 rounded bg-space-800/60 border border-space-700">
            #{equipment.id.slice(-8).toUpperCase()}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <motion.div variants={item} className="xl:col-span-4 space-y-5">
          <Card>
            <CardHeader
              title="设备概览"
              subtitle="EQUIPMENT OVERVIEW"
              action={
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-md"
                  style={{
                    background: "linear-gradient(135deg, rgba(224,185,110,0.15) 0%, rgba(147,112,61,0.15) 100%)",
                    border: "1px solid rgba(201,169,110,0.25)",
                  }}
                >
                  <TypeIcon className="w-[18px] h-[18px] text-brass-300" />
                </div>
              }
            />
            <CardBody>
              <div className="aspect-[4/3] rounded-md bg-space-800/60 border border-space-700 flex items-center justify-center mb-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{
                  background: "radial-gradient(circle at 30% 40%, rgba(201,169,110,0.15) 0%, transparent 60%)"
                }} />
                <div className="relative text-center">
                  <div
                    className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(224,185,110,0.2) 0%, rgba(147,112,61,0.2) 100%)",
                      border: "1px solid rgba(201,169,110,0.3)",
                    }}
                  >
                    <TypeIcon className="w-9 h-9 text-brass-300" />
                  </div>
                  <div className="text-xs font-mono tracking-wider text-space-500">
                    {typeLabels[equipment.type].toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <InfoRow icon={Tag} label="品牌 / 型号" value={
                  <div>
                    <div className="font-semibold text-brass-200">
                      {equipment.brand} {equipment.model}
                    </div>
                  </div>
                } accent />

                <InfoRow icon={Package} label="序列号" value={
                  <span className="font-mono text-brass-300">{equipment.serialNumber}</span>
                } accent />

                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={Sparkles} label="成色等级" value={
                    equipment.defectGrade
                      ? <GradeBadge grade={equipment.defectGrade} showLabel size="sm" />
                      : <Badge variant="neutral" dot>未分级</Badge>
                  } />
                  <InfoRow icon={FileText} label="检测状态" value={
                    inspection
                      ? <Badge variant="success" dot><Check className="w-3 h-3 inline mr-1" />已检测</Badge>
                      : <Badge variant="warning" dot>待检测</Badge>
                  } />
                </div>

                <div className="pt-3 mt-1 divider-brass">
                  <div className="mb-1">
                    <div className="text-[10px] font-mono tracking-wider text-space-500 uppercase mb-1">
                      当前售价
                    </div>
                    <div className="text-2xl font-bold tracking-tight" style={{
                      background: BRASS_GRADIENT,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>
                      {formatPrice(equipment.currentPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-space-500">
                    <span>底价 {formatPrice(equipment.basePrice)}</span>
                    {equipment.soldPrice && (
                      <span className="text-signal-green">成交价 {formatPrice(equipment.soldPrice)}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="寄卖人信息"
              subtitle="CONSIGNOR INFO"
              action={
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-blue/10 border border-signal-blue/25">
                  <User className="w-[18px] h-[18px] text-signal-blue" />
                </div>
              }
            />
            <CardBody>
              <div className="space-y-4">
                <InfoRow icon={User} label="姓名" value={<span className="font-medium">{equipment.consignorName}</span>} />
                <InfoRow icon={Phone} label="联系电话" value={
                  <a href={`tel:${equipment.consignorPhone}`} className="text-brass-300 hover:text-brass-200 transition-colors">
                    {equipment.consignorPhone}
                  </a>
                } />
                <InfoRow icon={Clock} label="入库时间" value={formatDateTime(equipment.createdAt)} />
                <InfoRow icon={Eye} label="登记人" value={equipment.createdByName} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`配件清单 (${equipment.accessories.length})`}
              subtitle="ACCESSORIES"
              action={
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-green/10 border border-signal-green/25">
                  <ListChecks className="w-[18px] h-[18px] text-signal-green" />
                </div>
              }
            />
            <CardBody>
              {equipment.accessories.length === 0 ? (
                <div className="text-sm text-space-500 text-center py-4">无配件记录</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {equipment.accessories.map((acc) => (
                    <span
                      key={acc}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brass/8 text-brass-200 border border-brass/25"
                    >
                      <Check className="w-3 h-3" />
                      {acc}
                    </span>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {inspection && (
            <Card>
              <CardHeader
                title="检测报告摘要"
                subtitle="INSPECTION SUMMARY"
                action={
                  <Badge variant="success" dot>
                    {inspection.defectGrade}级
                  </Badge>
                }
              />
              <CardBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-space-800/50 border border-space-700">
                      <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                        快门次数
                      </div>
                      <div className="font-mono text-lg font-semibold text-space-100">
                        {formatShutter(inspection.shutterCount)}
                      </div>
                    </div>
                    <div className="p-3 rounded-md bg-space-800/50 border border-space-700">
                      <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                        霉斑数量
                      </div>
                      <div className={cn(
                        "font-mono text-lg font-semibold",
                        inspection.moldSpotsCount === 0 ? "text-signal-green" : "text-signal-orange"
                      )}>
                        {inspection.moldSpotsCount}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-space-800/50 border border-space-700">
                    <div className="text-[10px] font-mono tracking-wider text-space-500 mb-2">
                      对焦测试
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        inspection.focusTest.passed
                          ? "bg-signal-green/10 text-signal-green"
                          : "bg-signal-red/10 text-signal-red"
                      )}>
                        {inspection.focusTest.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        整体
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        inspection.focusTest.centerSharp
                          ? "bg-signal-green/10 text-signal-green"
                          : "bg-signal-red/10 text-signal-red"
                      )}>中心锐度</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        inspection.focusTest.edgeSharp
                          ? "bg-signal-green/10 text-signal-green"
                          : "bg-signal-red/10 text-signal-red"
                      )}>边缘锐度</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        inspection.focusTest.infinityFocus
                          ? "bg-signal-green/10 text-signal-green"
                          : "bg-signal-red/10 text-signal-red"
                      )}>无限远</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-brass/6 border border-brass/20">
                    <div className="text-[10px] font-mono tracking-wider text-brass-300/70 mb-1.5">
                      验机结论
                    </div>
                    <div className="text-xs text-brass-200/90 leading-relaxed">
                      {inspection.conclusion}
                    </div>
                  </div>

                  <div className="text-[11px] text-space-500 text-center pt-1">
                    <ScanLine className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    验机师 {inspection.inspectorName} · {formatDateTime(inspection.createdAt)}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </motion.div>

        <motion.div variants={item} className="xl:col-span-5 space-y-5">
          <Card>
            <CardBody noPadding>
              <div className="flex items-stretch border-b border-space-700/60">
                {tabList.map((tab, idx) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const last = idx === tabList.length - 1;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex-1 relative px-4 py-4 text-center transition-all duration-200",
                        !last && "border-r border-space-700/40",
                        isActive ? "bg-space-800/60" : "hover:bg-space-800/30"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="detail-tab-indicator"
                          className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: BRASS_GRADIENT }}
                        />
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <TabIcon className={cn("w-4 h-4", isActive ? "text-brass-300" : "text-space-400")} />
                        <span className={cn(
                          "text-sm font-medium",
                          isActive ? "text-brass-200" : "text-space-300"
                        )}>
                          {tab.label}
                        </span>
                        {tab.count !== undefined && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold",
                            isActive ? "bg-brass/15 text-brass-300" : "bg-space-700/50 text-space-500"
                          )}>
                            {tab.count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <AnimatePresence mode="wait">
                {activeTab === "inspection" && (
                  <motion.div
                    key="inspection"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {!inspection ? (
                      <div className="py-12 text-center">
                        <div className="inline-flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-space-700/40 border border-space-600 flex items-center justify-center">
                            <Search className="w-6 h-6 text-space-500" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-space-300 mb-1">
                              暂无检测报告
                            </div>
                            <div className="text-xs text-space-500">
                              设备当前状态：{equipment.status === "pending_inspect" ? "等待验机师检测" : "请等待检测完成"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full" style={{ background: BRASS_GRADIENT }} />
                            检测基本信息
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-md bg-space-800/40 border border-space-700">
                              <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                                设备序列号
                              </div>
                              <div className="font-mono text-xs text-brass-300">
                                {inspection.equipmentSerialNumber}
                              </div>
                            </div>
                            <div className="p-3 rounded-md bg-space-800/40 border border-space-700">
                              <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                                成色等级
                              </div>
                              <GradeBadge grade={inspection.defectGrade} showLabel size="sm" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-signal-blue" />
                            快门 & 霉斑检测
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-md bg-space-800/40 border border-space-700">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-signal-blue" />
                                <span className="text-[11px] text-space-400">快门次数</span>
                              </div>
                              <div className="font-mono text-2xl font-bold text-space-100">
                                {formatShutter(inspection.shutterCount)}
                              </div>
                            </div>
                            <div className={cn(
                              "p-4 rounded-md border",
                              inspection.moldSpotsCount === 0
                                ? "bg-signal-green/5 border-signal-green/20"
                                : "bg-signal-orange/5 border-signal-orange/20"
                            )}>
                              <div className="flex items-center gap-2 mb-1">
                                <Eye className={cn("w-4 h-4", inspection.moldSpotsCount === 0 ? "text-signal-green" : "text-signal-orange")} />
                                <span className="text-[11px] text-space-400">霉斑数量</span>
                              </div>
                              <div className={cn(
                                "font-mono text-2xl font-bold",
                                inspection.moldSpotsCount === 0 ? "text-signal-green" : "text-signal-orange"
                              )}>
                                {inspection.moldSpotsCount}
                                <span className="text-sm ml-1 font-normal">处</span>
                              </div>
                              {inspection.moldSpotsCount > 0 && inspection.moldPhotos[0]?.moldSpots?.[0]?.note && (
                                <div className="mt-2 text-[10px] text-signal-orange/80 border-t border-signal-orange/15 pt-2">
                                  {inspection.moldPhotos[0].moldSpots[0].note}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 rounded-full bg-signal-green" />
                            对焦测试详情
                          </h4>
                          <div className="p-4 rounded-md bg-space-800/40 border border-space-700 space-y-3">
                            {[
                              { label: "整体通过", value: inspection.focusTest.passed },
                              { label: "中心锐度", value: inspection.focusTest.centerSharp },
                              { label: "边缘锐度", value: inspection.focusTest.edgeSharp },
                              { label: "无限远对焦", value: inspection.focusTest.infinityFocus },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center justify-between">
                                <span className="text-sm text-space-300">{item.label}</span>
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                                  item.value
                                    ? "bg-signal-green/12 text-signal-green border-signal-green/30"
                                    : "bg-signal-red/12 text-signal-red border-signal-red/30"
                                )}>
                                  {item.value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  {item.value ? "通过" : "异常"}
                                </span>
                              </div>
                            ))}
                            {inspection.focusTest.note && (
                              <div className="pt-2 mt-2 border-t border-space-700 text-[11px] text-space-400 italic">
                                "{inspection.focusTest.note}"
                              </div>
                            )}
                          </div>
                        </div>

                        {inspection.accessoryCheck.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2">
                              <span className="w-1 h-4 rounded-full bg-brass-400" />
                              配件验收
                            </h4>
                            <div className="p-4 rounded-md bg-space-800/40 border border-space-700 space-y-2">
                              {inspection.accessoryCheck.map((acc) => (
                                <div key={acc.item} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "w-5 h-5 rounded flex items-center justify-center",
                                      acc.present
                                        ? "bg-signal-green/15 text-signal-green"
                                        : "bg-signal-red/15 text-signal-red"
                                    )}>
                                      {acc.present ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    </span>
                                    <span className="text-sm text-space-300">{acc.item}</span>
                                  </div>
                                  {acc.condition && (
                                    <span className="text-xs text-space-500">{acc.condition}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {inspection.appearanceNote && (
                          <div>
                            <h4 className="text-sm font-semibold text-space-200 mb-3 flex items-center gap-2">
                              <span className="w-1 h-4 rounded-full bg-signal-orange" />
                              外观描述
                            </h4>
                            <div className="p-4 rounded-md bg-space-800/40 border border-space-700 text-sm text-space-300 leading-relaxed">
                              {inspection.appearanceNote}
                            </div>
                          </div>
                        )}

                        <div className="p-4 rounded-md bg-brass/6 border border-brass/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-brass-300" />
                            <span className="text-xs font-semibold text-brass-200">验机师结论</span>
                          </div>
                          <div className="text-sm text-brass-200/90 leading-relaxed">
                            {inspection.conclusion}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "price" && (
                  <motion.div
                    key="price"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {priceLogs.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="inline-flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-space-700/40 border border-space-600 flex items-center justify-center">
                            <History className="w-6 h-6 text-space-500" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-space-300 mb-1">暂无价格变更</div>
                            <div className="text-xs text-space-500">价格历史将在价格调整后显示</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative pl-4">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-brass/50 via-space-600 to-transparent" />
                        <div className="space-y-6">
                          {priceLogs.map((log, idx) => {
                            const isUp = log.newPrice > log.oldPrice;
                            const isSale = log.changeType === "sale";
                            const isCreate = log.changeType === "create";
                            return (
                              <div key={log.id} className="relative">
                                <div
                                  className={cn(
                                    "absolute -left-[21px] top-1 w-[10px] h-[10px] rounded-full border-2",
                                    isSale && "bg-signal-green border-space-950",
                                    isCreate && "bg-brass border-space-950",
                                    !isSale && !isCreate && (isUp ? "bg-signal-green border-space-950" : "bg-signal-orange border-space-950")
                                  )}
                                />
                                <div className="p-4 rounded-md bg-space-800/40 border border-space-700 ml-3 group hover:border-brass/30 transition-colors">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                      {isSale ? (
                                        <Badge variant="success" dot>成交结算</Badge>
                                      ) : isCreate ? (
                                        <Badge variant="info" dot>初始定价</Badge>
                                      ) : (
                                        <Badge variant={isUp ? "success" : "warning"} dot>
                                          {isUp ? "提价" : "降价"}
                                        </Badge>
                                      )}
                                      <span className="text-[10px] font-mono text-space-500">
                                        #{log.id.slice(-6).toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-space-500 shrink-0">
                                      {formatDateTime(log.createdAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 mb-2">
                                    {!isCreate && (
                                      <>
                                        <span className={cn(
                                          "font-mono text-sm",
                                          isSale ? "text-signal-green/60 line-through" : "text-space-500 line-through"
                                        )}>
                                          {formatPrice(log.oldPrice)}
                                        </span>
                                        <ChevronRight className={cn(
                                          "w-4 h-4",
                                          isUp ? "text-signal-green" : isSale ? "text-signal-green" : "text-signal-orange"
                                        )} />
                                      </>
                                    )}
                                    <span className={cn(
                                      "font-mono text-lg font-bold",
                                      isSale ? "text-signal-green" : isCreate ? "text-brass-300" : isUp ? "text-signal-green" : "text-signal-orange"
                                    )}>
                                      {formatPrice(log.newPrice)}
                                    </span>
                                    {!isCreate && (
                                      <span className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
                                        isSale
                                          ? "bg-signal-green/10 text-signal-green"
                                          : isUp
                                          ? "bg-signal-green/10 text-signal-green"
                                          : "bg-signal-orange/10 text-signal-orange"
                                      )}>
                                        {isUp ? <TrendingUp className="w-3 h-3" /> : isSale ? null : <TrendingDown className="w-3 h-3" />}
                                        {!isSale && `${isUp ? "+" : ""}${log.newPrice - log.oldPrice}`}
                                        {!isSale && !isCreate && (
                                          <span className="opacity-60 ml-0.5">
                                            ({(((log.newPrice - log.oldPrice) / (log.oldPrice || 1)) * 100).toFixed(1)}%)
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {log.remark && (
                                    <div className="text-xs text-space-400 mb-2 italic">
                                      "{log.remark}"
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-2 border-t border-space-700/50">
                                    <span className="text-[11px] text-space-500">
                                      操作人：<span className="text-space-400">{log.operatorName}</span>
                                    </span>
                                    <span className="text-[10px] font-mono tracking-wider text-space-600 uppercase">
                                      {log.changeType}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "appointments" && (
                  <motion.div
                    key="appointments"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {relatedAppointments.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="inline-flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-space-700/40 border border-space-600 flex items-center justify-center">
                            <CalendarClock className="w-6 h-6 text-space-500" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-space-300 mb-1">暂无预约记录</div>
                            <div className="text-xs text-space-500">客户预约将在此处显示</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {relatedAppointments.map((app) => {
                          const variant = statusBadgeVariant[app.status];
                          return (
                            <div
                              key={app.id}
                              className="p-4 rounded-md bg-space-800/40 border border-space-700 hover:border-brass/30 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant={variant as any} dot>
                                    {statusLabel[app.status]}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-space-500">
                                    #{app.id.slice(-6).toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold text-brass-200">
                                    {formatDate(app.appointmentDate)}
                                  </div>
                                  <div className="text-[11px] font-mono text-space-500">
                                    {app.appointmentTimeSlot}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <div className="text-[10px] font-mono tracking-wider text-space-500 mb-0.5 uppercase">
                                    买家
                                  </div>
                                  <div className="text-sm text-space-200">{app.buyerName}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-mono tracking-wider text-space-500 mb-0.5 uppercase">
                                    电话
                                  </div>
                                  <a
                                    href={`tel:${app.buyerPhone}`}
                                    className="text-sm text-brass-300 hover:text-brass-200 transition-colors"
                                  >
                                    {app.buyerPhone}
                                  </a>
                                </div>
                              </div>

                              {app.note && (
                                <div className="text-[11px] text-space-400 p-2 rounded bg-space-900/50 border border-space-700/50">
                                  💬 {app.note}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-space-700/50 text-[11px] text-space-500">
                                <span>创建于 {formatDateTime(app.createdAt)}</span>
                                {app.confirmedAt && (
                                  <span className="text-signal-blue">确认于 {formatDateTime(app.confirmedAt)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={item} className="xl:col-span-3 space-y-5">
          <Card>
            <CardHeader
              title="快捷操作"
              subtitle="QUICK ACTIONS"
            />
            <CardBody>
              <div className="space-y-2.5">
                {equipment.status !== "sold" && equipment.status !== "returned" && (
                  <button
                    onClick={() => openPriceChange(equipment)}
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-space-800/60 border border-transparent hover:border-signal-orange/30 hover:bg-space-800 transition-all group"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-orange/10 text-signal-orange group-hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-space-100 group-hover:text-signal-orange transition-colors">
                        申请调价
                      </div>
                      <div className="text-[11px] text-space-500">
                        提交价格调整申请
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-space-500 group-hover:text-signal-orange group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}

                {equipment.status === "available" && (
                  <button
                    onClick={() => openSold(equipment)}
                    className="w-full flex items-center gap-3 p-3 rounded-md bg-space-800/60 border border-transparent hover:border-signal-green/30 hover:bg-space-800 transition-all group"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-green/10 text-signal-green group-hover:shadow-[0_0_12px_rgba(34,197,94,0.2)] transition-all">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-space-100 group-hover:text-signal-green transition-colors">
                        标记成交
                      </div>
                      <div className="text-[11px] text-space-500">
                        记录成交价并结算
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-space-500 group-hover:text-signal-green group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}

                <button
                  onClick={() => navigate("/clerk/appointments")}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-space-800/60 border border-transparent hover:border-signal-blue/30 hover:bg-space-800 transition-all group"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-blue/10 text-signal-blue group-hover:shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-all">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-space-100 group-hover:text-signal-blue transition-colors">
                      预约管理
                    </div>
                    <div className="text-[11px] text-space-500">
                      查看相关预约记录
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-space-500 group-hover:text-signal-blue group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="价格信息"
              subtitle="PRICING INFO"
            />
            <CardBody>
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-space-800/50 border border-space-700">
                  <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1.5">
                    当前售价
                  </div>
                  <div
                    className="text-3xl font-bold tracking-tight mb-1"
                    style={{
                      background: BRASS_GRADIENT,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {formatPrice(equipment.currentPrice)}
                  </div>
                  <div className="text-[11px] text-space-500">
                    共调整过 {Math.max(0, priceLogs.length - 1)} 次
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-space-800/40 border border-space-700">
                    <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                      寄卖底价
                    </div>
                    <div className="font-mono text-sm font-semibold text-space-200">
                      {formatPrice(equipment.basePrice)}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-space-800/40 border border-space-700">
                    <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                      溢价空间
                    </div>
                    <div className={cn(
                      "font-mono text-sm font-semibold",
                      equipment.currentPrice >= equipment.basePrice ? "text-signal-green" : "text-signal-orange"
                    )}>
                      {equipment.currentPrice >= equipment.basePrice ? "+" : ""}
                      {(((equipment.currentPrice - equipment.basePrice) / equipment.basePrice) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {equipment.soldPrice && (
                  <div className="p-4 rounded-md bg-signal-green/8 border border-signal-green/25">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-signal-green" />
                      <span className="text-xs font-semibold text-signal-green">已成交</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-signal-green">
                      {formatPrice(equipment.soldPrice)}
                    </div>
                    <div className="text-[11px] text-space-500 mt-0.5">
                      成交于 {formatDateTime(equipment.soldAt || "")}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="系统信息"
              subtitle="SYSTEM META"
            />
            <CardBody>
              <div className="space-y-3 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-space-500">设备 ID</span>
                  <span className="font-mono text-space-400">{equipment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-500">入库时间</span>
                  <span className="text-space-400">{formatDateTime(equipment.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-500">登记人 ID</span>
                  <span className="font-mono text-space-400">{equipment.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-space-500">检测报告 ID</span>
                  <span className="font-mono text-space-400">
                    {inspection ? inspection.id : "—"}
                  </span>
                </div>
                {equipment.soldAt && (
                  <div className="flex justify-between">
                    <span className="text-space-500">成交时间</span>
                    <span className="text-space-400">{formatDateTime(equipment.soldAt)}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

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
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">序列号</div>
                <div className="font-mono text-sm text-brass-300">{priceChangeTarget.serialNumber}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">当前状态</div>
                <StatusTag status={priceChangeTarget.status} dot={false} />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">当前售价</div>
                <div className="text-lg font-bold text-space-100">{formatPrice(priceChangeTarget.currentPrice)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">寄卖底价</div>
                <div className="text-sm text-space-400 mt-1">{formatPrice(priceChangeTarget.basePrice)}</div>
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
                {parseFloat(newPrice) > 0 && parseFloat(newPrice) !== priceChangeTarget.currentPrice && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border",
                    parseFloat(newPrice) > priceChangeTarget.currentPrice
                      ? "bg-signal-green/8 border-signal-green/25 text-signal-green"
                      : "bg-signal-orange/8 border-signal-orange/25 text-signal-orange"
                  )}>
                    {parseFloat(newPrice) > priceChangeTarget.currentPrice
                      ? <TrendingUp className="w-4 h-4" />
                      : <TrendingDown className="w-4 h-4" />}
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
                placeholder="请详细说明调价原因..."
                className="w-full input-field resize-none"
              />
              <div className="mt-1 flex justify-between items-center">
                <span className="text-[11px] text-space-500">{priceReason.length}/200</span>
                {!priceReason.trim() && (
                  <span className="text-[11px] text-signal-red flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 请填写调价原因
                  </span>
                )}
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
                <span className="text-sm font-semibold text-signal-green">确认完成此笔交易</span>
              </div>
              <div className="text-[11px] text-space-400">
                设备状态将变为「已售出」，成交价格将写入价格历史。
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-space-500">序列号</span>
                <span className="font-mono text-space-300">{soldTarget.serialNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-space-500">当前售价</span>
                <span className="text-brass-300 font-semibold">{formatPrice(soldTarget.currentPrice)}</span>
              </div>
            </div>

            <Input
              label="实际成交价 (元)"
              type="number"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              leftIcon={<span className="text-sm font-semibold text-space-400">¥</span>}
              error={parseFloat(soldPrice) <= 0 && soldPrice.trim() ? "成交价必须大于0" : undefined}
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
