import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Building2,
  ArrowUpDown,
  Check,
  X,
  AlertTriangle,
  Clock,
  Camera,
  FileText,
  Edit,
} from "lucide-react"
import { useStore } from "@/store/useStore"
import StatusBadge from "@/components/StatusBadge"
import StepTimeline from "@/components/StepTimeline"
import {
  getCategoryIcon,
  formatMoney,
  formatDate,
  formatDateTime,
  getDifficultyLevel,
  getDifficultyLabel,
  getDifficultyColor,
} from "@/utils/helpers"
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/types"

const DOC_ITEMS = [
  { key: "idCard" as const, label: "身份证" },
  { key: "purchaseProof" as const, label: "购买凭证" },
  { key: "subsidyQualification" as const, label: "补贴资格证明" },
]

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getOrderById, advanceWorkflow, rejectOrder, confirmRecycling, currentRole } = useStore()

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmCode, setConfirmCode] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [docWarning, setDocWarning] = useState(false)

  const order = getOrderById(id!)

  if (!order) {
    return (
      <div className="animate-fade-up flex flex-col items-center justify-center py-20 text-surface-400">
        <FileText className="h-12 w-12 mb-3" />
        <p>工单不存在</p>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    )
  }

  const canEdit = order.status === "draft" || order.status === "assessing"

  const difficultyLevel = getDifficultyLevel(order.customer.floor, order.customer.hasElevator)

  const handleAdvance = (remark: string) => {
    advanceWorkflow(order.id, remark, currentRole === "clerk" ? "店员" : currentRole === "reviewer" ? "审核员" : currentRole)
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    rejectOrder(order.id, rejectReason, "审核员")
    setShowRejectModal(false)
    setRejectReason("")
  }

  const handleConfirmRecycling = () => {
    if (confirmCode.length !== 6) {
      setConfirmError("请输入6位确认码")
      return
    }
    const ok = confirmRecycling(order.id, confirmCode, "回收师傅")
    if (!ok) {
      setConfirmError("确认码错误，请重新输入")
      return
    }
    setShowConfirmModal(false)
    setConfirmCode("")
    setConfirmError("")
  }

  const handleSubmitAssessing = () => {
    if (!order.subsidyDocs.isComplete) {
      setDocWarning(true)
      return
    }
    handleAdvance("评估完成，提交审核")
    setDocWarning(false)
  }

  return (
    <div className="animate-fade-up pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary !px-3 !py-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <h1 className="text-lg font-semibold text-dark-200">{order.orderNo}</h1>
          <StatusBadge status={order.status} />
        </div>
        {canEdit && (
          <Link to={`/register/${order.id}`} className="btn-secondary">
            <Edit className="h-4 w-4" />
            编辑
          </Link>
        )}
      </div>

      <div className="card mb-6">
        <StepTimeline workflow={order.workflow} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-brand-500" />
              旧机信息
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-surface-400">品类</span>
                <span>
                  {getCategoryIcon(order.oldAppliance.category)} {CATEGORY_LABELS[order.oldAppliance.category]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-400">品牌</span>
                <span>{order.oldAppliance.brand || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-400">型号</span>
                <span>{order.oldAppliance.model || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-400">购买年份</span>
                <span>{order.oldAppliance.purchaseYear || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-400">成色</span>
                <span>{CONDITION_LABELS[order.oldAppliance.condition]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-400">折抵价值</span>
                <span className="text-brand-600 font-semibold">{formatMoney(order.oldAppliance.tradeInValue)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              补贴资料
              {order.subsidyDocs.isComplete ? (
                <span className="badge bg-success-50 text-success-600 ml-auto">资料齐全</span>
              ) : (
                <span className="badge bg-danger-50 text-danger-500 ml-auto">资料不完整</span>
              )}
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              {DOC_ITEMS.map((item) => {
                const doc = order.subsidyDocs[item.key]
                return (
                  <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-surface-100 last:border-0">
                    <span className="text-surface-600">{item.label}</span>
                    {doc ? (
                      <span className="flex items-center gap-1 text-success-500">
                        <Check className="h-4 w-4" />
                        已上传
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger-500">
                        <X className="h-4 w-4" />
                        未上传
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              新机订单
            </h2>
            {order.newAppliance.model ? (
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-surface-400">型号</span>
                  <span>{order.newAppliance.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400">原价</span>
                  <span>{formatMoney(order.newAppliance.price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400">补贴优惠</span>
                  <span className="text-success-500">-{formatMoney(order.newAppliance.discount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400">以旧换新抵扣</span>
                  <span className="text-success-500">-{formatMoney(order.newAppliance.tradeInCredit)}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-surface-200">
                  <span className="text-surface-400">最终价格</span>
                  <span className="text-2xl font-bold text-brand-600">{formatMoney(order.newAppliance.finalPrice)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-400">暂未选择新机</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-500" />
              流程日志
            </h2>
            <div className="flex flex-col gap-0">
              {order.workflow.map((step, i) => (
                <div key={step.stage} className="flex gap-3 relative pb-4 last:pb-0">
                  {i < order.workflow.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-surface-200" />
                  )}
                  <div
                    className={`mt-1 h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${
                      step.status === "done"
                        ? "bg-success-400 border-success-400"
                        : step.status === "in_progress"
                        ? "bg-brand-500 border-brand-500 animate-pulse-dot"
                        : step.status === "rejected"
                        ? "bg-danger-500 border-danger-500"
                        : "bg-white border-surface-300"
                    }`}
                  />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-200">
                        {step.stage === "assessing" ? "评估" : step.stage === "reviewing" ? "审核" : step.stage === "recycling" ? "回收" : "结案"}
                      </span>
                      {step.operator && (
                        <span className="text-surface-400">· {step.operator}</span>
                      )}
                    </div>
                    {step.operatedAt && (
                      <p className="text-xs text-surface-400 mt-0.5">{formatDateTime(step.operatedAt)}</p>
                    )}
                    {step.remark && (
                      <p className="text-surface-600 mt-1">{step.remark}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-500" />
              客户信息
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">姓名</span>
                <span>{order.customer.name || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">电话</span>
                <span>{order.customer.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">地址</span>
                <span>{order.customer.address || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">楼层</span>
                <span>{order.customer.floor}楼</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">电梯</span>
                <span>{order.customer.hasElevator ? "有" : "无"}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-surface-400" />
                <span className="text-surface-400 w-12">难度</span>
                <span className={`font-medium ${getDifficultyColor(difficultyLevel)}`}>
                  {getDifficultyLabel(difficultyLevel)}
                </span>
              </div>
              {order.customer.note && (
                <div className="pt-2 mt-2 border-t border-surface-100">
                  <p className="text-surface-400 text-xs mb-1">备注</p>
                  <p className="text-surface-600">{order.customer.note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-500" />
              回收信息
            </h2>
            {order.recycling.scheduledDate ? (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 w-16">预约日期</span>
                  <span>{formatDate(order.recycling.scheduledDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 w-16">时间段</span>
                  <span>{order.recycling.timeSlot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 w-16">回收师傅</span>
                  <span>
                    {useStore.getState().technicians.find((t) => t.id === order.recycling.technicianId)?.name || order.recycling.technicianId || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 w-16">确认码</span>
                  <span className="font-mono font-semibold tracking-widest">{order.recycling.confirmationCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 w-16">确认时间</span>
                  <span>{order.recycling.confirmedAt ? formatDateTime(order.recycling.confirmedAt) : "待确认"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-400">暂未安排回收</p>
            )}
          </div>
        </div>
      </div>

      {(() => {
        if (currentRole === "reviewer" && order.status === "reviewing") {
          return (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-200 px-6 py-4 flex items-center justify-end gap-3 z-40">
              <button className="btn-danger" onClick={() => setShowRejectModal(true)}>
                驳回
              </button>
              <button className="btn-success" onClick={() => handleAdvance("审核通过")}>
                通过审核
              </button>
            </div>
          )
        }
        if (currentRole === "technician" && order.status === "recycling") {
          return (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-200 px-6 py-4 flex items-center justify-end gap-3 z-40">
              <button className="btn-success" onClick={() => setShowConfirmModal(true)}>
                确认回收
              </button>
            </div>
          )
        }
        if (currentRole === "clerk" && order.status === "draft") {
          return (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-200 px-6 py-4 flex items-center justify-end gap-3 z-40">
              <button className="btn-primary" onClick={() => handleAdvance("提交评估")}>
                提交评估
              </button>
            </div>
          )
        }
        if (currentRole === "clerk" && order.status === "assessing") {
          return (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-200 px-6 py-4 flex items-center justify-end gap-3 z-40">
              {docWarning && !order.subsidyDocs.isComplete && (
                <span className="flex items-center gap-1 text-danger-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  补贴资料不完整，无法提交审核
                </span>
              )}
              <button className="btn-primary" onClick={handleSubmitAssessing}>
                提交审核
              </button>
            </div>
          )
        }
        return null
      })()}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-dark-200 mb-4">驳回工单</h3>
            <textarea
              className="input-field min-h-[100px] resize-none"
              placeholder="请输入驳回原因"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn-secondary" onClick={() => { setShowRejectModal(false); setRejectReason("") }}>
                取消
              </button>
              <button className="btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowConfirmModal(false); setConfirmError("") }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-dark-200 mb-4">确认回收</h3>
            <p className="text-sm text-surface-600 mb-3">请输入6位确认码完成回收确认</p>
            <input
              className="input-field font-mono text-center text-lg tracking-[0.5em]"
              maxLength={6}
              placeholder="______"
              value={confirmCode}
              onChange={(e) => { setConfirmCode(e.target.value.replace(/\D/g, "")); setConfirmError("") }}
            />
            {confirmError && (
              <p className="text-danger-500 text-sm mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {confirmError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn-secondary" onClick={() => { setShowConfirmModal(false); setConfirmCode(""); setConfirmError("") }}>
                取消
              </button>
              <button className="btn-success" onClick={handleConfirmRecycling} disabled={confirmCode.length !== 6}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
