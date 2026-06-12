import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  UserX,
  CalendarX,
  CalendarCheck,
  Phone,
  User,
  ArrowUpRight,
  Camera,
  Crosshair,
  Boxes,
  MessageSquare,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusTag } from "@/components/ui/StatusTag";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { useCameraStore } from "@/store/cameraStore";
import type { Appointment, AppointmentStatus, Equipment, EquipmentType } from "@/types";
import { formatDate, formatDateTime, formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

type TabKey = "pending" | "confirmed" | "completed" | "no_show";

const tabConfig: { key: TabKey; label: string; variant: "warning" | "info" | "success" | "danger"; status: AppointmentStatus }[] = [
  { key: "pending", label: "待确认", variant: "warning", status: "pending" },
  { key: "confirmed", label: "已确认", variant: "info", status: "confirmed" },
  { key: "completed", label: "已完成", variant: "success", status: "completed" },
  { key: "no_show", label: "爽约", variant: "danger", status: "no_show" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

const typeIcons: Record<EquipmentType, LucideIcon> = {
  body: Camera,
  lens: Crosshair,
  kit: Boxes,
};

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

interface EquipmentCardProps {
  equipment: Equipment;
  onClick?: () => void;
}

function EquipmentMiniCard({ equipment, onClick }: EquipmentCardProps) {
  const TypeIcon = typeIcons[equipment.type];
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md bg-space-800/50 border border-space-700 hover:border-brass/30 hover:bg-space-800 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(224,185,110,0.12) 0%, rgba(147,112,61,0.12) 100%)",
            border: "1px solid rgba(201,169,110,0.2)",
          }}
        >
          <TypeIcon className="w-5 h-5 text-brass-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-space-200 truncate group-hover:text-brass-200 transition-colors">
                {equipment.brand} {equipment.model}
              </div>
              <div className="font-mono text-[10px] text-space-500 mt-0.5 tracking-wider uppercase">
                {equipment.serialNumber}
              </div>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-space-500 group-hover:text-brass-300 transition-colors flex-shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold text-brass-300">
              {formatPrice(equipment.currentPrice)}
            </span>
            <StatusTag status={equipment.status} dot={false} />
            {equipment.defectGrade && (
              <GradeBadge grade={equipment.defectGrade} size="sm" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  equipment: Equipment | undefined;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onViewEquipment: () => void;
  index: number;
}

function AppointmentCard({
  appointment,
  equipment,
  onConfirm,
  onComplete,
  onCancel,
  onNoShow,
  onViewEquipment,
  index,
}: AppointmentCardProps) {
  const variant = statusBadgeVariant[appointment.status];

  return (
    <motion.div
      variants={item}
      custom={index}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="card-panel p-5 relative overflow-hidden group"
    >
      <div
        className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
        style={{ background: BRASS_GRADIENT }}
      />
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-md",
              variant === "warning" && "bg-signal-orange/12 border border-signal-orange/25",
              variant === "info" && "bg-signal-blue/12 border border-signal-blue/25",
              variant === "success" && "bg-signal-green/12 border border-signal-green/25",
              variant === "danger" && "bg-signal-red/12 border border-signal-red/25",
              variant === "neutral" && "bg-space-700/50 border border-space-600"
            )}
          >
            <CalendarClock
              className={cn(
                "w-5 h-5",
                variant === "warning" && "text-signal-orange",
                variant === "info" && "text-signal-blue",
                variant === "success" && "text-signal-green",
                variant === "danger" && "text-signal-red",
                variant === "neutral" && "text-space-400"
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant={variant as any} dot>
                {statusLabel[appointment.status]}
              </Badge>
              <span className="font-mono text-[10px] text-space-500 tracking-wider">
                #{appointment.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-space-500">
              预约创建于 {formatDateTime(appointment.createdAt)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end mb-1">
            <CalendarCheck className="w-3.5 h-3.5 text-brass-300" />
            <span className="text-sm font-semibold text-brass-200">
              {formatDate(appointment.appointmentDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Clock className="w-3.5 h-3.5 text-space-400" />
            <span className="text-xs text-space-300 font-mono">
              {appointment.appointmentTimeSlot}
            </span>
          </div>
        </div>
      </div>

      {equipment ? (
        <div className="mb-4">
          <EquipmentMiniCard equipment={equipment} onClick={onViewEquipment} />
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-md bg-space-800/40 border border-dashed border-space-700 text-center">
          <span className="text-xs text-space-500">设备已下架或被删除</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-md bg-space-800/30 border border-space-700/60">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-space-500 mb-1 uppercase">
            <User className="w-3 h-3" />
            买家姓名
          </div>
          <div className="text-sm font-medium text-space-200">
            {appointment.buyerName}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-space-500 mb-1 uppercase">
            <Phone className="w-3 h-3" />
            联系电话
          </div>
          <a
            href={`tel:${appointment.buyerPhone}`}
            className="text-sm font-medium text-brass-300 hover:text-brass-200 transition-colors"
          >
            {appointment.buyerPhone}
          </a>
        </div>
      </div>

      {appointment.note && (
        <div className="mb-4 p-3 rounded-md bg-brass/6 border border-brass/20">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-brass-300/70 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-brass-200/80 leading-relaxed">
              {appointment.note}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {appointment.status === "pending" && (
          <>
            <Button variant="ghost" size="sm" icon={<XCircle className="w-3.5 h-3.5" />} onClick={onCancel}>
              取消
            </Button>
            <Button variant="ghost" size="sm" icon={<UserX className="w-3.5 h-3.5" />} onClick={onNoShow}>
              标记爽约
            </Button>
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={onConfirm}>
              确认预约
            </Button>
          </>
        )}
        {appointment.status === "confirmed" && (
          <>
            <Button variant="ghost" size="sm" icon={<CalendarX className="w-3.5 h-3.5" />} onClick={onCancel}>
              取消
            </Button>
            <Button variant="ghost" size="sm" icon={<UserX className="w-3.5 h-3.5" />} onClick={onNoShow}>
              标记爽约
            </Button>
            <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={onComplete}>
              完成到店
            </Button>
          </>
        )}
        {(appointment.status === "completed" || appointment.status === "no_show" || appointment.status === "cancelled") && (
          <div className="text-[11px] text-space-500">
            {appointment.confirmedAt && `确认于 ${formatDateTime(appointment.confirmedAt)}`}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AppointmentManagePage() {
  const navigate = useNavigate();
  const appointments = useCameraStore((s) => s.appointments);
  const equipments = useCameraStore((s) => s.equipments);
  const confirmAppointment = useCameraStore((s) => s.confirmAppointment);
  const completeAppointment = useCameraStore((s) => s.completeAppointment);
  const cancelAppointment = useCameraStore((s) => s.cancelAppointment);
  const markAppointmentNoShow = useCameraStore((s) => s.markAppointmentNoShow);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [noShowNote, setNoShowNote] = useState("");

  const counts = useMemo(() => {
    return tabConfig.reduce((acc, t) => {
      acc[t.key] = appointments.filter((a) => a.status === t.status).length;
      return acc;
    }, {} as Record<TabKey, number>);
  }, [appointments]);

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    equipments.forEach((e) => map.set(e.id, e));
    return map;
  }, [equipments]);

  const filteredList = useMemo(() => {
    const status = tabConfig.find((t) => t.key === activeTab)?.status;
    if (!status) return [];
    return appointments
      .filter((a) => a.status === status)
      .sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate} ${a.appointmentTimeSlot.split("-")[0]}`);
        const dateB = new Date(`${b.appointmentDate} ${b.appointmentTimeSlot.split("-")[0]}`);
        return dateA.getTime() - dateB.getTime();
      });
  }, [appointments, activeTab]);

  const handleConfirm = (id: string) => confirmAppointment(id);
  const handleComplete = (id: string) => completeAppointment(id);
  const confirmCancel = () => {
    if (cancelTarget) {
      cancelAppointment(cancelTarget.id, cancelNote.trim() || undefined);
      setCancelTarget(null);
      setCancelNote("");
    }
  };
  const confirmNoShow = () => {
    if (noShowTarget) {
      markAppointmentNoShow(noShowTarget.id, noShowNote.trim() || undefined);
      setNoShowTarget(null);
      setNoShowNote("");
    }
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
            CLERK · APPOINTMENTS
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            预约管理
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
            style={{ background: BRASS_GRADIENT }}
          />
          共 {appointments.length} 条预约记录
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardBody noPadding>
            <div className="flex items-stretch border-b border-space-700/60">
              {tabConfig.map((tab, idx) => {
                const isActive = activeTab === tab.key;
                const last = idx === tabConfig.length - 1;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 relative px-4 py-4 text-center transition-all duration-200",
                      !last && "border-r border-space-700/40",
                      isActive
                        ? "bg-space-800/60"
                        : "hover:bg-space-800/30"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="appointment-tab-indicator"
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: BRASS_GRADIENT }}
                      />
                    )}
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Badge variant={tab.variant} dot>
                        {tab.label}
                      </Badge>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold",
                          isActive
                            ? "bg-brass/15 text-brass-300"
                            : "bg-space-700/50 text-space-400"
                        )}
                      >
                        {counts[tab.key]}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] tracking-wider text-space-500 uppercase">
                      {tab.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <AnimatePresence mode="wait">
          {filteredList.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card-panel p-16 text-center"
            >
              <div className="inline-flex flex-col items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(224,185,110,0.1) 0%, rgba(147,112,61,0.1) 100%)",
                    border: "1px solid rgba(201,169,110,0.15)",
                  }}
                >
                  <CalendarClock className="w-7 h-7 text-brass-400/60" />
                </div>
                <div>
                  <div className="text-base font-semibold text-space-300 mb-1">
                    暂无{tabConfig.find((t) => t.key === activeTab)?.label}预约
                  </div>
                  <div className="text-xs text-space-500">
                    {activeTab === "pending" && "新的客户预约将在此处显示"}
                    {activeTab === "confirmed" && "已确认的预约将在此处显示"}
                    {activeTab === "completed" && "已完成的到店记录将在此处显示"}
                    {activeTab === "no_show" && "爽约记录将在此处显示"}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {filteredList.map((app, idx) => (
                  <AppointmentCard
                    key={app.id}
                    index={idx}
                    appointment={app}
                    equipment={equipmentMap.get(app.equipmentId)}
                    onConfirm={() => handleConfirm(app.id)}
                    onComplete={() => handleComplete(app.id)}
                    onCancel={() => setCancelTarget(app)}
                    onNoShow={() => setNoShowTarget(app)}
                    onViewEquipment={() => navigate(`/clerk/equipment/${app.equipmentId}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        size="sm"
        title="取消预约"
        subtitle={cancelTarget ? `取消 ${cancelTarget.buyerName} 的预约` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              返回
            </Button>
            <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={confirmCancel}>
              确认取消
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-signal-orange/8 border border-signal-orange/25">
              <div className="flex items-start gap-2 text-xs text-signal-orange/90">
                <CalendarX className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">确认取消以下预约？</div>
                  <div className="opacity-80">
                    {formatDate(cancelTarget.appointmentDate)} {cancelTarget.appointmentTimeSlot}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="label-field">取消原因 (可选)</label>
              <textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={3}
                placeholder="请输入取消原因，便于后续跟进..."
                className="w-full input-field resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!noShowTarget}
        onClose={() => setNoShowTarget(null)}
        size="sm"
        title="标记为爽约"
        subtitle={noShowTarget ? `${noShowTarget.buyerName} 未按时到店` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoShowTarget(null)}>
              返回
            </Button>
            <Button variant="danger" icon={<UserX className="w-4 h-4" />} onClick={confirmNoShow}>
              确认标记
            </Button>
          </>
        }
      >
        {noShowTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-signal-red/8 border border-signal-red/25">
              <div className="flex items-start gap-2 text-xs text-signal-red/90">
                <UserX className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">将此预约标记为爽约？</div>
                  <div className="opacity-80">
                    买家未按时到店且无法联系，建议标记后不再接受该买家短期预约
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-space-800/50 border border-space-700">
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  买家
                </div>
                <div className="text-sm text-space-200">{noShowTarget.buyerName}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  电话
                </div>
                <div className="text-sm text-space-200">{noShowTarget.buyerPhone}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  预约日期
                </div>
                <div className="text-sm text-space-200">
                  {formatDate(noShowTarget.appointmentDate)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  时间段
                </div>
                <div className="text-sm text-space-200">{noShowTarget.appointmentTimeSlot}</div>
              </div>
            </div>

            <div>
              <label className="label-field">备注说明 (可选)</label>
              <textarea
                value={noShowNote}
                onChange={(e) => setNoShowNote(e.target.value)}
                rows={3}
                placeholder="请备注具体情况，如：电话无人接听、微信未回等..."
                className="w-full input-field resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
