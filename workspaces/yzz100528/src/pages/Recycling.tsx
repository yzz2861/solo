import { useMemo, useState } from "react"
import { useStore } from "@/store/useStore"
import {
  Building2,
  ArrowUpDown,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Check,
  User,
  Camera,
} from "lucide-react"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/types"
import {
  getCategoryIcon,
  formatDate,
  getDifficultyLevel,
  getDifficultyLabel,
  getDifficultyColor,
} from "@/utils/helpers"

type DateGroup = {
  date: string
  label: string
  orders: ReturnType<typeof useStore.getState>["orders"]
}

export default function Recycling() {
  const { orders, technicians, confirmRecycling, currentRole } = useStore()
  const [selectedTechId, setSelectedTechId] = useState<string>(
    currentRole === "technician" ? technicians[0]?.id ?? "" : ""
  )
  const [confirmModalOrderId, setConfirmModalOrderId] = useState<string | null>(null)
  const [confirmCode, setConfirmCode] = useState("")
  const [confirmError, setConfirmError] = useState("")

  const recyclingOrders = useMemo(() => {
    let list = orders.filter(
      (o) => o.status === "approved" || o.status === "recycling"
    )
    if (selectedTechId) {
      list = list.filter((o) => o.recycling.technicianId === selectedTechId)
    }
    return list.sort((a, b) => {
      const da = a.recycling.scheduledDate || "9999"
      const db = b.recycling.scheduledDate || "9999"
      return da.localeCompare(db)
    })
  }, [orders, selectedTechId])

  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, DateGroup>()
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    for (const order of recyclingOrders) {
      const date = order.recycling.scheduledDate || "待安排"
      let label = date
      if (date === today) label = "📅 今天"
      else if (date === tomorrow) label = "📅 明天"
      else if (date === "待安排") label = "⏳ 待安排"
      else label = `📅 ${date}`

      if (!map.has(date)) {
        map.set(date, { date, label, orders: [] })
      }
      map.get(date)!.orders.push(order)
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.date === "待安排") return 1
      if (b.date === "待安排") return -1
      return a.date.localeCompare(b.date)
    })
  }, [recyclingOrders])

  const unassignedCount = recyclingOrders.filter(
    (o) => !o.recycling.technicianId
  ).length
  const unconfirmedCount = recyclingOrders.filter(
    (o) => !o.recycling.confirmedAt
  ).length

  function getTechName(id: string): string {
    return technicians.find((t) => t.id === id)?.name ?? "待分配"
  }

  function openConfirmModal(orderId: string) {
    setConfirmModalOrderId(orderId)
    setConfirmCode("")
    setConfirmError("")
  }

  function submitConfirm() {
    if (!confirmModalOrderId) return
    const order = orders.find((o) => o.id === confirmModalOrderId)
    if (!order) return
    const ok = confirmRecycling(confirmModalOrderId, confirmCode, getTechName(order.recycling.technicianId) || "师傅")
    if (ok) {
      setConfirmModalOrderId(null)
      setConfirmCode("")
    } else {
      setConfirmError("确认码不正确，请检查后重试")
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark-200">回收调度</h1>
          <p className="text-sm text-surface-400 mt-1">
            师傅查看今日回收任务，确认上门情况
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="select-field !w-48"
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value)}
          >
            <option value="">全部师傅</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-orange">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">今日回收</span>
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-3xl font-bold font-serif text-dark-200">
            {recyclingOrders.filter((o) => {
              const today = new Date().toISOString().slice(0, 10)
              return o.recycling.scheduledDate === today
            }).length}
          </p>
        </div>
        <div className="stat-card stat-card-yellow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">待确认</span>
            <AlertTriangle className="w-4 h-4 text-warning-500" />
          </div>
          <p className="text-3xl font-bold font-serif text-dark-200">
            {unconfirmedCount}
          </p>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">待分配</span>
            <User className="w-4 h-4 text-[#5B8DEF]" />
          </div>
          <p className="text-3xl font-bold font-serif text-dark-200">
            {unassignedCount}
          </p>
        </div>
        <div className="stat-card stat-card-green">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">已完成</span>
            <CheckCircle2 className="w-4 h-4 text-success-500" />
          </div>
          <p className="text-3xl font-bold font-serif text-dark-200">
            {orders.filter((o) => o.status === "completed").length}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {dateGroups.length === 0 && (
          <div className="card text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-success-400 mx-auto mb-3" />
            <p className="text-surface-400 font-medium">暂无回收任务</p>
          </div>
        )}

        {dateGroups.map((group) => (
          <div key={group.date} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg font-bold text-dark-200">
                {group.label}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-200 text-surface-400">
                {group.orders.length} 单
              </span>
              <div className="flex-1 h-px bg-surface-200" />
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.orders.map((order) => {
                const difficulty = getDifficultyLevel(
                  order.customer.floor,
                  order.customer.hasElevator
                )
                const isConfirmed = !!order.recycling.confirmedAt
                const isToday =
                  order.recycling.scheduledDate ===
                  new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={order.id}
                    className={`card transition-all hover:shadow-md ${
                      isConfirmed
                        ? "border-success-200 bg-success-50/50"
                        : isToday
                        ? "border-brand-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getCategoryIcon(order.oldAppliance.category)}
                        </span>
                        <div>
                          <p className="font-mono text-xs text-surface-400">
                            {order.orderNo}
                          </p>
                          <p className="font-semibold text-dark-200">
                            {order.oldAppliance.brand}{" "}
                            {CATEGORY_LABELS[order.oldAppliance.category]}
                          </p>
                        </div>
                      </div>
                      {isConfirmed ? (
                        <span className="badge bg-success-100 text-success-600">
                          <Check className="w-3 h-3 mr-1" />
                          已确认
                        </span>
                      ) : (
                        <span className="badge bg-brand-100 text-brand-700">
                          待上门
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-surface-200 pt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-surface-400" />
                        <span className="font-medium text-dark-100">
                          {order.customer.name || "未填写"}
                        </span>
                        <span className="text-surface-400">·</span>
                        <Phone className="w-3.5 h-3.5 text-surface-400" />
                        <span className="text-dark-100">
                          {order.customer.phone || "-"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-surface-400 mt-0.5 flex-shrink-0" />
                        <span className="text-dark-100 line-clamp-2">
                          {order.customer.address || "未填写地址"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 bg-surface-50 px-2.5 py-1.5 rounded-lg">
                          <Building2 className="w-4 h-4 text-surface-400" />
                          <span className="text-sm font-medium text-dark-100">
                            {order.customer.floor}F
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 bg-surface-50 px-2.5 py-1.5 rounded-lg ${
                            order.customer.hasElevator ? "" : ""
                          }`}
                        >
                          <ArrowUpDown className="w-4 h-4 text-surface-400" />
                          <span
                            className={`text-sm font-medium ${
                              order.customer.hasElevator
                                ? "text-success-600"
                                : "text-warning-600"
                            }`}
                          >
                            {order.customer.hasElevator ? "有电梯" : "无电梯"}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                            difficulty === "easy"
                              ? "bg-success-50"
                              : difficulty === "medium"
                              ? "bg-warning-50"
                              : "bg-danger-50"
                          }`}
                        >
                          <span
                            className={`text-xs font-bold ${getDifficultyColor(difficulty)}`}
                          >
                            搬运{getDifficultyLabel(difficulty)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-surface-400 pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {order.recycling.timeSlot || "时间待定"}
                        <span className="mx-1">·</span>
                        <Camera className="w-3.5 h-3.5" />
                        {getTechName(order.recycling.technicianId)}
                      </div>

                      {order.customer.note && (
                        <div className="p-2.5 bg-warning-50 rounded-lg border border-warning-100">
                          <p className="text-xs text-warning-600">
                            <span className="font-semibold">备注：</span>
                            {order.customer.note}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isConfirmed && (
                      <div className="mt-4 pt-3 border-t border-surface-200">
                        <button
                          onClick={() => openConfirmModal(order.id)}
                          className="w-full btn-success"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          确认回收
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {confirmModalOrderId && (
        <div className="fixed inset-0 bg-dark-200/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-brand-500 to-brand-600 text-white">
              <h3 className="font-serif text-xl font-bold">确认回收完成</h3>
              <p className="text-sm text-white/80 mt-1">
                请输入工单确认码完成回收
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-1.5">
                  6 位回收确认码
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="请输入确认码"
                  className="input-field text-center text-xl font-mono tracking-widest"
                  value={confirmCode}
                  onChange={(e) => {
                    setConfirmCode(e.target.value.replace(/\D/g, ""))
                    setConfirmError("")
                  }}
                />
                {confirmError && (
                  <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {confirmError}
                  </p>
                )}
              </div>
              <div className="p-3 bg-surface-50 rounded-lg text-xs text-surface-400 space-y-1">
                <div className="flex justify-between">
                  <span>工单号</span>
                  <span className="font-mono font-medium text-dark-100">
                    {orders.find((o) => o.id === confirmModalOrderId)?.orderNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>确认码</span>
                  <span className="font-mono text-brand-600 font-bold">
                    {orders.find((o) => o.id === confirmModalOrderId)?.recycling.confirmationCode}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmModalOrderId(null)}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={submitConfirm}
                  disabled={confirmCode.length !== 6}
                  className="flex-1 btn-success"
                >
                  <Check className="w-4 h-4" />
                  确认回收
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
