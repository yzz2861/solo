import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  AlertTriangle,
  Camera,
} from "lucide-react"
import { useStore } from "@/store/useStore"
import type {
  ApplianceCategory,
  Condition,
  TradeInOrder,
  OldAppliancePhoto,
  DocUpload,
} from "@/types"
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  BRAND_OPTIONS,
  TIME_SLOTS,
} from "@/types"
import { computeImageHash, fileToDataUrl } from "@/utils/photoHash"
import { generateId, generateOrderNo, generateConfirmCode } from "@/utils/helpers"

const CATEGORY_EMOJI: Record<ApplianceCategory, string> = {
  refrigerator: "🧊",
  washer: "🫧",
  ac: "❄️",
  tv: "📺",
  other: "🔌",
}

const STEP_NAMES = ["旧机信息", "照片与资料", "订单与客户", "回收安排"]

export default function Register() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { orders, technicians, addOrder, updateOrder, checkPhotoDuplicate } =
    useStore()

  const existingOrder = id ? orders.find((o) => o.id === id) : undefined
  const isEdit = !!existingOrder

  const [currentStep, setCurrentStep] = useState(0)

  const [category, setCategory] = useState<ApplianceCategory>(
    existingOrder?.oldAppliance.category ?? "refrigerator"
  )
  const [brand, setBrand] = useState(existingOrder?.oldAppliance.brand ?? "")
  const [model, setModel] = useState(existingOrder?.oldAppliance.model ?? "")
  const [purchaseYear, setPurchaseYear] = useState<number>(
    existingOrder?.oldAppliance.purchaseYear ?? 2020
  )
  const [condition, setCondition] = useState<Condition>(
    existingOrder?.oldAppliance.condition ?? "good"
  )
  const [tradeInValue, setTradeInValue] = useState<number>(
    existingOrder?.oldAppliance.tradeInValue ?? 0
  )

  const [photos, setPhotos] = useState<OldAppliancePhoto[]>(
    existingOrder?.oldAppliance.photos ?? []
  )
  const [idCard, setIdCard] = useState<DocUpload | null>(
    existingOrder?.subsidyDocs.idCard ?? null
  )
  const [purchaseProof, setPurchaseProof] = useState<DocUpload | null>(
    existingOrder?.subsidyDocs.purchaseProof ?? null
  )
  const [subsidyQualification, setSubsidyQualification] = useState<DocUpload | null>(
    existingOrder?.subsidyDocs.subsidyQualification ?? null
  )

  const [newModel, setNewModel] = useState(
    existingOrder?.newAppliance.model ?? ""
  )
  const [price, setPrice] = useState<number>(existingOrder?.newAppliance.price ?? 0)
  const [discount, setDiscount] = useState<number>(
    existingOrder?.newAppliance.discount ?? 0
  )
  const [tradeInCredit, setTradeInCredit] = useState<number>(
    existingOrder?.newAppliance.tradeInCredit ?? tradeInValue
  )

  useEffect(() => {
    setTradeInCredit(tradeInValue)
  }, [tradeInValue])

  const finalPrice = useMemo(
    () => Math.max(0, price - discount - tradeInCredit),
    [price, discount, tradeInCredit]
  )

  const [customerName, setCustomerName] = useState(
    existingOrder?.customer.name ?? ""
  )
  const [customerPhone, setCustomerPhone] = useState(
    existingOrder?.customer.phone ?? ""
  )
  const [customerAddress, setCustomerAddress] = useState(
    existingOrder?.customer.address ?? ""
  )
  const [floor, setFloor] = useState<number>(existingOrder?.customer.floor ?? 1)
  const [hasElevator, setHasElevator] = useState<boolean>(
    existingOrder?.customer.hasElevator ?? false
  )
  const [note, setNote] = useState(existingOrder?.customer.note ?? "")

  const [scheduledDate, setScheduledDate] = useState(
    existingOrder?.recycling.scheduledDate ?? ""
  )
  const [timeSlot, setTimeSlot] = useState(
    existingOrder?.recycling.timeSlot ?? ""
  )
  const [technicianId, setTechnicianId] = useState(
    existingOrder?.recycling.technicianId ?? (technicians[0]?.id ?? "")
  )

  const [duplicateWarning, setDuplicateWarning] = useState<{
    orderNo: string
    confirmed: boolean
  } | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    type: string
    file: File
  } | null>(null)

  const isSubsidyComplete = !!(idCard && purchaseProof && subsidyQualification)
  const subsidyProgress = [idCard, purchaseProof, subsidyQualification].filter(
    Boolean
  ).length

  const brandOptions = BRAND_OPTIONS[category]

  async function handlePhotoUpload(
    file: File,
    photoType: "front" | "side" | "nameplate"
  ) {
    const hash = await computeImageHash(file)
    const dup = checkPhotoDuplicate(hash, id)
    if (dup) {
      setDuplicateWarning({ orderNo: dup.orderNo, confirmed: false })
      setPendingUpload({ type: `photo-${photoType}`, file })
      return
    }
    const dataUrl = await fileToDataUrl(file)
    const newPhoto: OldAppliancePhoto = {
      id: generateId(),
      type: photoType,
      dataUrl,
      hash,
      uploadedAt: new Date().toISOString(),
    }
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.type !== photoType)
      return [...filtered, newPhoto]
    })
  }

  async function handleDocUpload(file: File, docType: "idCard" | "purchaseProof" | "subsidyQualification") {
    const hash = await computeImageHash(file)
    const dup = checkPhotoDuplicate(hash, id)
    if (dup) {
      setDuplicateWarning({ orderNo: dup.orderNo, confirmed: false })
      setPendingUpload({ type: `doc-${docType}`, file })
      return
    }
    const dataUrl = await fileToDataUrl(file)
    const doc: DocUpload = {
      id: generateId(),
      fileName: file.name,
      dataUrl,
      hash,
      uploadedAt: new Date().toISOString(),
    }
    const setter = { idCard: setIdCard, purchaseProof: setPurchaseProof, subsidyQualification: setSubsidyQualification }[docType]
    setter(doc)
  }

  async function confirmDuplicate() {
    if (!pendingUpload) return
    const { type, file } = pendingUpload
    const hash = await computeImageHash(file)
    const dataUrl = await fileToDataUrl(file)

    if (type.startsWith("photo-")) {
      const photoType = type.replace("photo-", "") as "front" | "side" | "nameplate"
      const newPhoto: OldAppliancePhoto = {
        id: generateId(),
        type: photoType,
        dataUrl,
        hash,
        uploadedAt: new Date().toISOString(),
      }
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.type !== photoType)
        return [...filtered, newPhoto]
      })
    } else if (type.startsWith("doc-")) {
      const docType = type.replace("doc-", "") as "idCard" | "purchaseProof" | "subsidyQualification"
      const doc: DocUpload = {
        id: generateId(),
        fileName: file.name,
        dataUrl,
        hash,
        uploadedAt: new Date().toISOString(),
      }
      const setter = { idCard: setIdCard, purchaseProof: setPurchaseProof, subsidyQualification: setSubsidyQualification }[docType]
      setter(doc)
    }

    setDuplicateWarning(null)
    setPendingUpload(null)
  }

  function cancelDuplicate() {
    setDuplicateWarning(null)
    setPendingUpload(null)
  }

  function triggerFileInput(type: string) {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (type.startsWith("photo-")) {
        const pType = type.replace("photo-", "") as "front" | "side" | "nameplate"
        handlePhotoUpload(file, pType)
      } else if (type.startsWith("doc-")) {
        const dType = type.replace("doc-", "") as "idCard" | "purchaseProof" | "subsidyQualification"
        handleDocUpload(file, dType)
      }
    }
    input.click()
  }

  function canGoNext(): boolean {
    switch (currentStep) {
      case 0:
        return !!category && !!brand
      case 1:
        return true
      case 2:
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  function handleSubmit() {
    if (!isSubsidyComplete) {
      alert("补贴资料不齐，无法提交审核！请补齐身份证、购买凭证和补贴资格证明。")
      return
    }

    const now = new Date().toISOString()
    const orderNo = existingOrder?.orderNo ?? generateOrderNo()
    const confirmCode = existingOrder?.recycling.confirmationCode ?? generateConfirmCode()

    const workflow = existingOrder?.workflow ?? [
      { stage: "assessing", status: "in_progress" as const, operator: "店员", operatedAt: now, remark: "登记完成，待评估" },
      { stage: "reviewing", status: "pending" as const, operator: "", operatedAt: "", remark: "" },
      { stage: "recycling", status: "pending" as const, operator: "", operatedAt: "", remark: "" },
      { stage: "completed", status: "pending" as const, operator: "", operatedAt: "", remark: "" },
    ]

    const order: TradeInOrder = {
      id: existingOrder?.id ?? generateId(),
      orderNo,
      status: existingOrder?.status ?? "assessing",
      createdAt: existingOrder?.createdAt ?? now,
      updatedAt: now,
      oldAppliance: {
        category,
        brand,
        model,
        purchaseYear,
        condition,
        tradeInValue,
        photos,
      },
      subsidyDocs: {
        idCard,
        purchaseProof,
        subsidyQualification,
        isComplete: isSubsidyComplete,
      },
      newAppliance: {
        model: newModel,
        price,
        discount,
        tradeInCredit,
        finalPrice,
      },
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        floor,
        hasElevator,
        note,
      },
      recycling: {
        scheduledDate,
        timeSlot,
        technicianId,
        confirmedAt: existingOrder?.recycling.confirmedAt ?? null,
        confirmationCode: confirmCode,
        photos: existingOrder?.recycling.photos ?? [],
      },
      workflow,
    }

    if (isEdit) {
      updateOrder(order.id, order)
    } else {
      addOrder(order)
    }

    navigate("/orders")
  }

  return (
    <div className="animate-fade-up space-y-6 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary !px-3 !py-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark-200">
            {isEdit ? "编辑登记" : "以旧换新登记"}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            完整填写以下信息，完成旧机登记
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          {STEP_NAMES.map((name, idx) => (
            <div key={name} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    idx < currentStep
                      ? "bg-success-400 text-white"
                      : idx === currentStep
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/30 animate-pulse-dot"
                      : "bg-surface-200 text-surface-400"
                  }`}
                >
                  {idx < currentStep ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    idx <= currentStep ? "text-dark-200" : "text-surface-400"
                  }`}
                >
                  {name}
                </span>
              </div>
              {idx < STEP_NAMES.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    idx < currentStep ? "bg-brand-500" : "bg-surface-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {duplicateWarning && (
        <div className="card border-danger-300 bg-danger-50 animate-slide-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-danger-600">
                ⚠️ 照片重复提醒
              </p>
              <p className="text-sm text-dark-100 mt-1">
                该照片与工单 <span className="font-mono font-semibold">{duplicateWarning.orderNo}</span>{" "}
                中的照片重复，确认是否继续使用？
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={confirmDuplicate} className="btn-secondary">
                  确认继续使用
                </button>
                <button onClick={cancelDuplicate} className="btn-danger">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card space-y-5">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-500 rounded" />
              旧机品类
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {(Object.keys(CATEGORY_LABELS) as ApplianceCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    category === cat
                      ? "border-brand-500 bg-brand-50 shadow-md"
                      : "border-surface-200 bg-white hover:border-surface-300"
                  }`}
                >
                  <span className="text-3xl mb-2">{CATEGORY_EMOJI[cat]}</span>
                  <span
                    className={`text-xs font-medium ${
                      category === cat ? "text-brand-600" : "text-surface-400"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">品牌</label>
                <select
                  className="select-field"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                >
                  <option value="">请选择品牌</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">型号</label>
                <input
                  className="input-field"
                  placeholder="例：BCD-215"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  购买年份
                </label>
                <input
                  type="number"
                  min={2000}
                  max={new Date().getFullYear()}
                  className="input-field"
                  value={purchaseYear || ""}
                  onChange={(e) => setPurchaseYear(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  折抵估价（元）
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={tradeInValue || ""}
                  onChange={(e) => setTradeInValue(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="card space-y-5">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-500 rounded" />
              成色评级
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => {
                const colors: Record<Condition, string> = {
                  excellent: "border-success-400 bg-success-50 text-success-600 hover:bg-success-100",
                  good: "border-brand-500 bg-brand-50 text-brand-600 hover:bg-brand-100",
                  fair: "border-warning-400 bg-warning-50 text-warning-600 hover:bg-warning-100",
                  poor: "border-danger-400 bg-danger-50 text-danger-600 hover:bg-danger-100",
                }
                const defaultColors: Record<Condition, string> = {
                  excellent: "border-surface-200 bg-white text-dark-100 hover:bg-surface-50",
                  good: "border-surface-200 bg-white text-dark-100 hover:bg-surface-50",
                  fair: "border-surface-200 bg-white text-dark-100 hover:bg-surface-50",
                  poor: "border-surface-200 bg-white text-dark-100 hover:bg-surface-50",
                }
                const labelDesc: Record<Condition, string> = {
                  excellent: "外观完好，功能正常",
                  good: "轻微使用痕迹，功能正常",
                  fair: "明显使用痕迹，功能正常",
                  poor: "外观磨损，功能待检修",
                }
                return (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={`flex flex-col p-4 rounded-xl border-2 transition-all ${
                      condition === c ? colors[c] : defaultColors[c]
                    }`}
                  >
                    <span className="text-xl font-bold">{CONDITION_LABELS[c]}</span>
                    <span
                      className={`text-[10px] mt-1.5 leading-tight ${
                        condition === c ? "opacity-90" : "text-surface-400"
                      }`}
                    >
                      {labelDesc[c]}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="p-5 bg-gradient-to-br from-brand-50 to-warning-50 rounded-xl border border-brand-100">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-dark-100">预估折抵金额</span>
                <span className="text-3xl font-bold text-brand-600 font-serif">
                  ¥{tradeInValue.toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="text-xs text-surface-400 mt-2">
                * 最终折抵金额以现场实物评估为准
              </p>
            </div>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-500 rounded" />
              旧机照片
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(["front", "side", "nameplate"] as const).map((ptype) => {
                const labels: Record<string, string> = {
                  front: "正面照",
                  side: "侧面照",
                  nameplate: "铭牌照",
                }
                const existing = photos.find((p) => p.type === ptype)
                return (
                  <div key={ptype}>
                    <label className="block text-xs font-medium text-dark-100 mb-1.5">
                      {labels[ptype]}
                    </label>
                    {existing ? (
                      <div className="relative group">
                        <img
                          src={existing.dataUrl}
                          alt={labels[ptype]}
                          className="w-full aspect-square object-cover rounded-lg border border-surface-200"
                        />
                        <button
                          onClick={() =>
                            setPhotos((prev) => prev.filter((p) => p.type !== ptype))
                          }
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-danger-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFileInput(`photo-${ptype}`)}
                        className="w-full aspect-square rounded-lg border-2 border-dashed border-surface-300 bg-surface-50 hover:border-brand-400 hover:bg-brand-50/40 transition-all flex flex-col items-center justify-center gap-1.5"
                      >
                        <Camera className="w-6 h-6 text-surface-400" />
                        <Upload className="w-4 h-4 text-brand-400" />
                        <span className="text-xs text-surface-400">点击上传</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
                <span className="w-1 h-5 bg-brand-500 rounded" />
                补贴资料
              </h2>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isSubsidyComplete
                    ? "bg-success-100 text-success-600"
                    : "bg-danger-50 text-danger-500"
                }`}
              >
                {subsidyProgress}/3 项
              </span>
            </div>

            <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-success-400 transition-all duration-500"
                style={{ width: `${(subsidyProgress / 3) * 100}%` }}
              />
            </div>

            {[
              { key: "idCard", label: "身份证照片", desc: "正反面清晰可辨" },
              { key: "purchaseProof", label: "旧机购买凭证", desc: "发票或收据扫描件" },
              { key: "subsidyQualification", label: "补贴资格证明", desc: "政府补贴审核通过截图" },
            ].map(({ key, label, desc }) => {
              const data = { idCard, purchaseProof, subsidyQualification }[
                key as "idCard" | "purchaseProof" | "subsidyQualification"
              ]
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    data
                      ? "bg-success-50 border-success-200"
                      : "bg-white border-surface-200"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      data ? "bg-success-400" : "bg-surface-200"
                    }`}
                  >
                    {data ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <X className="w-5 h-5 text-danger-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-200">{label}</p>
                    <p className="text-xs text-surface-400 truncate">
                      {data ? data.fileName : desc}
                    </p>
                  </div>
                  <button
                    onClick={() => triggerFileInput(`doc-${key}`)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                      data
                        ? "bg-white border border-surface-300 text-dark-100 hover:bg-surface-50"
                        : "bg-brand-500 text-white hover:bg-brand-600"
                    }`}
                  >
                    {data ? "重新上传" : "上传"}
                  </button>
                </div>
              )
            })}

            {!isSubsidyComplete && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 rounded-lg border border-danger-200">
                <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                <p className="text-xs text-danger-600">
                  ⚠️ 补贴资料不齐无法下发优惠，请补齐全部资料后再提交
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-success-400 rounded" />
              新机订单
            </h2>
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-1.5">
                新机型号
              </label>
              <input
                className="input-field"
                placeholder="例：海尔 BCD-510WDPG"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  售价（元）
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  政府补贴（元）
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  旧机折抵（元）
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  value={tradeInCredit || ""}
                  onChange={(e) => setTradeInCredit(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end pb-2.5">
                <div className="w-full p-3 bg-gradient-to-br from-success-50 to-brand-50 rounded-lg border border-success-200">
                  <p className="text-xs text-surface-400">实付金额</p>
                  <p className="text-2xl font-bold font-serif text-success-600">
                    ¥{finalPrice.toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-surface-50 rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-surface-400">售价</span>
                <span className="text-dark-100">¥{price.toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">政府补贴</span>
                <span className="text-success-600">-¥{discount.toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">旧机折抵</span>
                <span className="text-brand-600">-¥{tradeInCredit.toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex justify-between border-t border-surface-200 pt-1">
                <span className="font-medium text-dark-200">实付</span>
                <span className="font-bold text-success-600">
                  ¥{finalPrice.toLocaleString("zh-CN")}
                </span>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-500 rounded" />
              客户信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  客户姓名
                </label>
                <input
                  className="input-field"
                  placeholder="请输入姓名"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  联系电话
                </label>
                <input
                  className="input-field"
                  placeholder="请输入手机号"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-1.5">
                回收地址
              </label>
              <input
                className="input-field"
                placeholder="请输入详细地址"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  楼层
                </label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={floor || ""}
                  onChange={(e) => setFloor(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  电梯情况
                </label>
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => setHasElevator(!hasElevator)}
                    className={`relative w-12 h-7 rounded-full transition-all ${
                      hasElevator ? "bg-success-400" : "bg-surface-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                        hasElevator ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      hasElevator ? "text-success-600" : "text-surface-400"
                    }`}
                  >
                    {hasElevator ? "✓ 有电梯" : "无电梯（爬楼）"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-1.5">
                备注
              </label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="搬运注意事项等..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-serif text-lg font-bold text-dark-200 flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-500 rounded" />
              回收安排
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  预约日期
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  时间段
                </label>
                <select
                  className="select-field"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                >
                  <option value="">请选择时间段</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-1.5">
                回收师傅
              </label>
              <select
                className="select-field"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">请选择师傅</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.phone}
                  </option>
                ))}
              </select>
            </div>
            {!isSubsidyComplete && (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl">
                <p className="text-sm font-semibold text-danger-600">
                  ⚠️ 提交前请确认补贴资料齐全
                </p>
                <p className="text-xs text-danger-500 mt-1">
                  当前缺少资料，提交将被拒绝
                </p>
              </div>
            )}
          </div>

          <div className="card space-y-4 bg-gradient-to-br from-dark-200 to-dark-100 text-white">
            <h2 className="font-serif text-lg font-bold flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-400 rounded" />
              登记摘要
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">旧机品类</span>
                <span className="font-medium">
                  {CATEGORY_EMOJI[category]} {CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">品牌型号</span>
                <span className="font-medium">
                  {brand || "-"} {model || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">成色</span>
                <span className="font-medium">
                  {CONDITION_LABELS[condition]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">折抵金额</span>
                <span className="font-semibold text-brand-300">
                  ¥{tradeInValue.toLocaleString("zh-CN")}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white/60">补贴资料</span>
                <span
                  className={`font-medium ${
                    isSubsidyComplete ? "text-success-300" : "text-danger-300"
                  }`}
                >
                  {isSubsidyComplete ? "✓ 齐全" : `✗ ${subsidyProgress}/3 项`}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white/60">实付金额</span>
                <span className="text-2xl font-bold font-serif text-success-300">
                  ¥{finalPrice.toLocaleString("zh-CN")}
                </span>
              </div>
              {customerAddress && (
                <div className="border-t border-white/10 pt-3">
                  <span className="text-white/60 text-xs">回收地址</span>
                  <p className="font-medium mt-1">
                    {customerName} {customerPhone}
                  </p>
                  <p className="text-white/80 mt-0.5">
                    {customerAddress}，{floor}楼，
                    {hasElevator ? "有电梯" : "无电梯"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-surface-200 px-8 py-4 flex items-center justify-between z-30">
        <div className="text-sm text-surface-400">
          步骤 {currentStep + 1} / {STEP_NAMES.length}
        </div>
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>
          )}
          {currentStep < STEP_NAMES.length - 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canGoNext()}
              className="btn-primary"
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary">
              <Check className="w-4 h-4" />
              提交登记
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
