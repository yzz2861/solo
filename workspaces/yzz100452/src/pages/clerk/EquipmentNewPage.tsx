import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Save,
  Plus,
  X,
  Camera,
  Crosshair,
  Boxes,
  User,
  Phone,
  Tag,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useCameraStore } from "@/store/cameraStore";
import { useAuthStore } from "@/store/authStore";
import type { Equipment, EquipmentType } from "@/types";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

const BRASS_GRADIENT = "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)";

const DEFAULT_ACCESSORIES = [
  "原装电池",
  "充电器",
  "肩带",
  "说明书",
  "包装盒",
  "镜头盖",
  "遮光罩",
  "镜头袋",
  "脚架环",
  "闪光灯",
  "相机包",
  "HDMI线",
];

const typeOptions = [
  { value: "body", label: "机身 (Body)" },
  { value: "lens", label: "镜头 (Lens)" },
  { value: "kit", label: "套机 (Kit)" },
];

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

type SerialCheckState = "idle" | "checking" | "available" | "duplicate";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function EquipmentNewPage() {
  const navigate = useNavigate();
  const findBySerialNumber = useCameraStore((s) => s.findBySerialNumber);
  const addEquipment = useCameraStore((s) => s.addEquipment);
  const { currentUser } = useAuthStore();

  const [type, setType] = useState<EquipmentType>("body");
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [consignorName, setConsignorName] = useState("");
  const [consignorPhone, setConsignorPhone] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [customAccessory, setCustomAccessory] = useState("");

  const [serialState, setSerialState] = useState<SerialCheckState>("idle");
  const [duplicateInfo, setDuplicateInfo] = useState<Equipment | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!serialNumber.trim()) {
      setSerialState("idle");
      return;
    }

    setSerialState("checking");
    const timer = setTimeout(() => {
      const found = findBySerialNumber(serialNumber.trim());
      if (found) {
        setSerialState("duplicate");
        setDuplicateInfo(found);
        setShowDuplicateModal(true);
        setForceSubmit(false);
      } else {
        setSerialState("available");
        setDuplicateInfo(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [serialNumber, findBySerialNumber]);

  const inputStatus = useMemo(() => {
    switch (serialState) {
      case "checking":
        return "loading";
      case "available":
        return "success";
      case "duplicate":
        return "error";
      default:
        return "idle";
    }
  }, [serialState]);

  const toggleAccessory = useCallback((acc: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  }, []);

  const addCustomAccessory = useCallback(() => {
    const trimmed = customAccessory.trim();
    if (trimmed && !selectedAccessories.includes(trimmed)) {
      setSelectedAccessories((prev) => [...prev, trimmed]);
      setCustomAccessory("");
    }
  }, [customAccessory, selectedAccessories]);

  const removeAccessory = useCallback((acc: string) => {
    setSelectedAccessories((prev) => prev.filter((a) => a !== acc));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!serialNumber.trim()) newErrors.serialNumber = "请输入序列号";
    else if (serialState === "duplicate" && !forceSubmit)
      newErrors.serialNumber = "序列号已存在，请确认后再提交";
    if (!brand.trim()) newErrors.brand = "请输入品牌";
    if (!model.trim()) newErrors.model = "请输入型号";
    if (!consignorName.trim()) newErrors.consignorName = "请输入寄卖人姓名";
    if (!consignorPhone.trim()) newErrors.consignorPhone = "请输入手机号";
    else if (!/^1\d{10}$/.test(consignorPhone))
      newErrors.consignorPhone = "请输入正确的11位手机号";
    if (!basePrice.trim()) newErrors.basePrice = "请输入寄卖底价";
    else if (parseFloat(basePrice) <= 0) newErrors.basePrice = "底价必须大于0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    serialNumber,
    serialState,
    forceSubmit,
    brand,
    model,
    consignorName,
    consignorPhone,
    basePrice,
  ]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    if (!currentUser) return;

    setSubmitLoading(true);
    setTimeout(() => {
      const basePriceNum = parseFloat(basePrice);
      addEquipment({
        type,
        serialNumber: serialNumber.trim(),
        brand: brand.trim(),
        model: model.trim(),
        consignorId: "u_consignor_new",
        consignorName: consignorName.trim(),
        consignorPhone: consignorPhone.trim(),
        basePrice: basePriceNum,
        currentPrice: basePriceNum,
        accessories: [...selectedAccessories],
        status: "pending_inspect",
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      });
      setSubmitLoading(false);
      navigate("/clerk/dashboard");
    }, 600);
  }, [
    validate,
    currentUser,
    basePrice,
    addEquipment,
    type,
    serialNumber,
    brand,
    model,
    consignorName,
    consignorPhone,
    selectedAccessories,
    navigate,
  ]);

  const TypeIcon = typeIcons[type];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-5xl mx-auto"
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
              CLERK · EQUIPMENT INTAKE
            </div>
            <h1 className="text-2xl font-bold text-space-100 tracking-wide">
              设备入库登记
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            取消
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={submitLoading}
            onClick={handleSubmit}
          >
            提交入库
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title="设备基本信息"
            subtitle="EQUIPMENT PROFILE"
            action={
              <div
                className="flex items-center justify-center w-9 h-9 rounded-md"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(224,185,110,0.15) 0%, rgba(147,112,61,0.15) 100%)",
                  border: "1px solid rgba(201,169,110,0.25)",
                }}
              >
                <Package className="w-4.5 h-4.5 w-[18px] h-[18px] text-brass-300" />
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {typeOptions.map((opt) => {
                const OptIcon = typeIcons[opt.value as EquipmentType];
                const isActive = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value as EquipmentType)}
                    className={cn(
                      "relative p-4 rounded-md border text-left transition-all duration-200 overflow-hidden group",
                      isActive
                        ? "border-brass/40 bg-space-800/80"
                        : "border-space-700 bg-space-800/40 hover:border-space-600 hover:bg-space-800/60"
                    )}
                  >
                    {isActive && (
                      <div
                        className="absolute top-0 left-0 h-[2px] w-full"
                        style={{ background: BRASS_GRADIENT }}
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-md transition-all",
                          isActive
                            ? "bg-brass/15 text-brass-300"
                            : "bg-space-700/50 text-space-400 group-hover:text-space-300"
                        )}
                      >
                        <OptIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            isActive ? "text-brass-200" : "text-space-200"
                          )}
                        >
                          {typeLabels[opt.value as EquipmentType]}
                        </div>
                        <div className="text-[10px] font-mono tracking-wider text-space-500 mt-0.5 uppercase">
                          {opt.value}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="序列号 / 设备编号"
                  placeholder="请输入设备机身序列号或镜头编号"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  status={inputStatus as "idle" | "loading" | "success" | "warning" | "error"}
                  error={errors.serialNumber}
                  hint={
                    serialState === "available"
                      ? "✓ 序列号可用，未检测到重复入库记录"
                      : serialState === "duplicate"
                      ? "⚠ 序列号已存在，请确认是否为同一设备"
                      : serialState === "checking"
                      ? "正在查重..."
                      : "用于唯一标识设备，请准确填写"
                  }
                  leftIcon={
                    <TypeIcon className="w-4 h-4" />
                  }
                />
              </div>

              <Input
                label="品牌"
                placeholder="如 Sony / Canon / Nikon / Fujifilm"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                error={errors.brand}
                leftIcon={<Tag className="w-4 h-4" />}
              />
              <Input
                label="型号"
                placeholder="如 A7 IV / RF 24-70mm F2.8"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                error={errors.model}
                leftIcon={<Camera className="w-4 h-4" />}
              />
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title="寄卖人信息"
            subtitle="CONSIGNOR INFORMATION"
            action={
              <div
                className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-blue/10 border border-signal-blue/25"
              >
                <User className="w-[18px] h-[18px] text-signal-blue" />
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="寄卖人姓名"
                placeholder="请输入寄卖人姓名"
                value={consignorName}
                onChange={(e) => setConsignorName(e.target.value)}
                error={errors.consignorName}
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="联系电话"
                placeholder="请输入11位手机号码"
                value={consignorPhone}
                onChange={(e) => setConsignorPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                error={errors.consignorPhone}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title="寄卖价格与配件"
            subtitle="PRICING & ACCESSORIES"
            action={
              <div
                className="flex items-center justify-center w-9 h-9 rounded-md bg-signal-green/10 border border-signal-green/25"
              >
                <ListChecks className="w-[18px] h-[18px] text-signal-green" />
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="寄卖底价 (元)"
                  placeholder="请输入寄卖人期望底价"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  error={errors.basePrice}
                  leftIcon={
                    <span className="text-sm font-semibold text-space-400">¥</span>
                  }
                  hint="此价格为寄卖底价，实际售价将由系统根据检测结果建议"
                />
              </div>
              <div className="hidden md:flex items-end justify-center">
                <div className="w-full p-4 rounded-md bg-space-800/40 border border-space-700">
                  <div className="text-[10px] font-mono tracking-wider text-space-500 mb-2">
                    STATUS PREVIEW
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-signal-orange/15 text-signal-orange border-signal-orange/35">
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-orange" />
                      待检测
                    </span>
                    <span className="text-xs text-space-500">
                      入库后将自动进入检测流程
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="label-field !mb-0">配件清单</label>
                <span className="text-[11px] text-space-500 font-mono">
                  {selectedAccessories.length} / 已选
                </span>
              </div>

              <div className="p-4 rounded-md bg-space-800/40 border border-space-700">
                <div className="flex flex-wrap gap-2 mb-4">
                  {DEFAULT_ACCESSORIES.map((acc) => {
                    const checked = selectedAccessories.includes(acc);
                    return (
                      <button
                        key={acc}
                        onClick={() => toggleAccessory(acc)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                          checked
                            ? "bg-brass/15 text-brass-200 border-brass/40"
                            : "bg-space-700/40 text-space-400 border-space-600 hover:border-space-500 hover:text-space-300"
                        )}
                      >
                        {checked && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />}
                        {acc}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="自定义添加配件..."
                    value={customAccessory}
                    onChange={(e) => setCustomAccessory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAccessory();
                      }
                    }}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    variant="ghost"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={addCustomAccessory}
                  >
                    添加
                  </Button>
                </div>

                {selectedAccessories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-space-700">
                    <div className="text-[11px] font-mono tracking-wider text-space-500 mb-2">
                      已选配件
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAccessories.map((acc) => (
                        <span
                          key={acc}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-brass/10 text-brass-200 border border-brass/30"
                        >
                          {acc}
                          <button
                            onClick={() => removeAccessory(acc)}
                            className="text-brass-300/60 hover:text-signal-red transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={item} className="flex justify-end gap-2 pb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          取消
        </Button>
        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          loading={submitLoading}
          onClick={handleSubmit}
          size="lg"
        >
          提交入库登记
        </Button>
      </motion.div>

      <Modal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        size="md"
        title="⚠ 序列号重复警告"
        subtitle="DUPLICATE SERIAL NUMBER DETECTED"
        closeOnOverlay={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDuplicateModal(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => {
                setForceSubmit(true);
                setShowDuplicateModal(false);
              }}
            >
              我已知晓，仍继续入库
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-md bg-signal-red/8 border border-signal-red/30">
            <div className="flex-shrink-0 w-10 h-10 rounded-md bg-signal-red/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-signal-red" />
            </div>
            <div>
              <div className="text-sm font-semibold text-signal-red mb-1">
                该序列号已存在入库记录
              </div>
              <div className="text-xs text-space-400">
                请仔细核实是否为同一设备重复入库，以下为上次入库信息：
              </div>
            </div>
          </div>

          {duplicateInfo && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-md bg-space-800/60 border border-space-700">
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  设备
                </div>
                <div className="text-sm font-medium text-space-200">
                  {duplicateInfo.brand} {duplicateInfo.model}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  序列号
                </div>
                <div className="text-sm font-mono text-brass-300">
                  {duplicateInfo.serialNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  寄卖人
                </div>
                <div className="text-sm text-space-200">
                  {duplicateInfo.consignorName}
                  <span className="text-xs text-space-500 ml-2">
                    {duplicateInfo.consignorPhone}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  当前价格
                </div>
                <div className="text-sm font-semibold text-brass-300">
                  ¥{duplicateInfo.currentPrice.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  入库时间
                </div>
                <div className="text-sm text-space-200">
                  {formatDateTime(duplicateInfo.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-space-500 mb-1">
                  当前状态
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border",
                    duplicateInfo.status === "available" &&
                      "bg-signal-green/15 text-signal-green border-signal-green/35",
                    duplicateInfo.status === "sold" &&
                      "bg-space-600/40 text-space-300 border-space-500/35",
                    duplicateInfo.status === "pending_inspect" &&
                      "bg-signal-orange/15 text-signal-orange border-signal-orange/35",
                    duplicateInfo.status === "reserved" &&
                      "bg-signal-blue/15 text-signal-blue border-signal-blue/35",
                    duplicateInfo.status === "returned" &&
                      "bg-signal-red/15 text-signal-red border-signal-red/35"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      duplicateInfo.status === "available" && "bg-signal-green",
                      duplicateInfo.status === "sold" && "bg-space-400",
                      duplicateInfo.status === "pending_inspect" && "bg-signal-orange",
                      duplicateInfo.status === "reserved" && "bg-signal-blue",
                      duplicateInfo.status === "returned" && "bg-signal-red"
                    )}
                  />
                  {duplicateInfo.status === "available" && "在售中"}
                  {duplicateInfo.status === "sold" && "已售出"}
                  {duplicateInfo.status === "pending_inspect" && "待检测"}
                  {duplicateInfo.status === "reserved" && "已预留"}
                  {duplicateInfo.status === "returned" && "已退回"}
                </span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-md bg-brass/8 border border-brass/20">
            <div className="flex items-start gap-2 text-xs text-brass-200/80">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                如果确认为同一设备，请联系原寄卖人确认情况。强行入库可能导致库存混乱。
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
