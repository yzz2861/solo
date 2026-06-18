import { useState, useMemo } from "react"
import { useStore } from "@/store/useStore"
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  Truck,
  Calendar,
  ChevronDown,
} from "lucide-react"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/types"
import {
  exportSubsidySummary,
  exportTradeInDetails,
  exportPendingRecycling,
} from "@/utils/exportUtils"
import { formatMoney, getCategoryIcon, formatDate } from "@/utils/helpers"

type TabType = "subsidy" | "tradein" | "pending"

export default function Finance() {
  const { orders, technicians } = useStore()
  const [activeTab, setActiveTab] = useState<TabType>("subsidy")
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d")

  const filteredOrders = useMemo(() => {
    if (dateRange === "all") return orders
    const days = { "7d": 7, "30d": 30, "90d": 90 }[dateRange]
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    return orders.filter((o) => o.createdAt >= cutoff)
  }, [orders, dateRange])

  const summary = useMemo(() => {
    const eligible = filteredOrders.filter((o) => o.subsidyDocs.isComplete)
    const totalSubsidy = eligible.reduce((s, o) => s + o.newAppliance.discount, 0)
    const totalTradeIn = filteredOrders.reduce(
      (s, o) => s + (o.newAppliance.tradeInCredit || o.oldAppliance.tradeInValue),
      0
    )
    const totalFinal = eligible.reduce((s, o) => s + o.newAppliance.finalPrice, 0)
    const pendingRecycling = filteredOrders.filter(
      (o) => o.status === "approved" || o.status === "recycling"
    ).length
    return { totalSubsidy, totalTradeIn, totalFinal, pendingRecycling, eligible }
  }, [filteredOrders])

  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; tradeIn: number; subsidy: number }>()
    for (const o of filteredOrders) {
      const key = o.oldAppliance.category
      if (!map.has(key)) map.set(key, { count: 0, tradeIn: 0, subsidy: 0 })
      const item = map.get(key)!
      item.count++
      item.tradeIn += o.oldAppliance.tradeInValue
      if (o.subsidyDocs.isComplete) item.subsidy += o.newAppliance.discount
    }
    return Array.from(map.entries())
  }, [filteredOrders])

  const exportSubsidy = () => {
    exportSubsidySummary(
      filteredOrders,
      `补贴汇总_${new Date().toISOString().slice(0, 10)}`
    )
  }
  const exportTradeIn = () => {
    exportTradeInDetails(
      filteredOrders,
      `折抵明细_${new Date().toISOString().slice(0, 10)}`
    )
  }
  const exportPending = () => {
    exportPendingRecycling(
      filteredOrders,
      `待回收清单_${new Date().toISOString().slice(0, 10)}`
    )
  }

  const subsidyRows = filteredOrders
    .filter((o) => o.subsidyDocs.isComplete)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const tradeInRows = filteredOrders.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
  const pendingRows = filteredOrders
    .filter((o) => o.status === "approved" || o.status === "recycling")
    .sort((a, b) =>
      (a.recycling.scheduledDate || "9999").localeCompare(
        b.recycling.scheduledDate || "9999"
      )
    )

  const getTechName = (id: string) =>
    technicians.find((t) => t.id === id)?.name ?? "待分配"

  const tabs: { key: TabType; label: string; icon: typeof FileSpreadsheet; exportFn: () => void; count: number }[] = [
    { key: "subsidy", label: "补贴汇总", icon: TrendingUp, exportFn: exportSubsidy, count: subsidyRows.length },
    { key: "tradein", label: "折抵明细", icon: Wallet, exportFn: exportTradeIn, count: tradeInRows.length },
    { key: "pending", label: "待回收清单", icon: Truck, exportFn: exportPending, count: pendingRows.length },
  ]

  return (
    <div className="animate-fade-up space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-dark-200">财务导出</h1>
          <p className="text-sm text-surface-400 mt-1">
            补贴汇总、折抵明细与待回收清单
          </p>
        </div>
        <div className="relative">
          <select
            className="select-field !w-32 pr-8 appearance-none"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          >
            <option value="7d">近 7 天</option>
            <option value="30d">近 30 天</option>
            <option value="90d">近 90 天</option>
            <option value="all">全部</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-green">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">政府补贴合计</span>
            <TrendingUp className="w-4 h-4 text-success-500" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold font-serif text-dark-200">
            {formatMoney(summary.totalSubsidy)}
          </p>
          <p className="text-xs text-surface-400 mt-1">
            {summary.eligible.length} 条符合补贴
          </p>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">旧机折抵合计</span>
            <Wallet className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold font-serif text-dark-200">
            {formatMoney(summary.totalTradeIn)}
          </p>
          <p className="text-xs text-surface-400 mt-1">{filteredOrders.length} 条工单</p>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">实付金额合计</span>
            <Calendar className="w-4 h-4 text-[#5B8DEF]" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold font-serif text-dark-200">
            {formatMoney(summary.totalFinal)}
          </p>
          <p className="text-xs text-surface-400 mt-1">{summary.eligible.length} 笔交易</p>
        </div>
        <div className="stat-card stat-card-yellow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400">待回收工单</span>
            <Truck className="w-4 h-4 text-warning-500" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold font-serif text-dark-200">
            {summary.pendingRecycling}
          </p>
          <p className="text-xs text-surface-400 mt-1">等待师傅上门</p>
        </div>
      </div>

      {categoryStats.length > 0 && (
        <div className="card">
          <h3 className="font-serif text-lg font-bold text-dark-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded" />
            按品类统计
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryStats.map(([cat, data]) => (
              <div
                key={cat}
                className="p-4 rounded-xl bg-gradient-to-br from-surface-50 to-surface-100 border border-surface-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCategoryIcon(cat)}</span>
                  <div>
                    <p className="text-sm font-semibold text-dark-200">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                    </p>
                    <p className="text-xs text-surface-400">{data.count} 单</p>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-surface-200 text-xs">
                  <div className="flex justify-between">
                    <span className="text-surface-400">折抵</span>
                    <span className="font-medium text-brand-600">
                      {formatMoney(data.tradeIn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">补贴</span>
                    <span className="font-medium text-success-600">
                      {formatMoney(data.subsidy)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 bg-surface-50/50">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-surface-400 hover:text-dark-100"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    activeTab === t.key ? "bg-brand-50" : "bg-surface-200"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={tabs.find((t) => t.key === activeTab)?.exportFn}
            className="btn-success"
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "subsidy" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-left text-xs uppercase text-surface-400 tracking-wider">
                  <th className="px-5 py-3 font-medium">工单号</th>
                  <th className="px-5 py-3 font-medium">客户</th>
                  <th className="px-5 py-3 font-medium">旧机品类</th>
                  <th className="px-5 py-3 font-medium">新机型号</th>
                  <th className="px-5 py-3 font-medium text-right">售价</th>
                  <th className="px-5 py-3 font-medium text-right">补贴</th>
                  <th className="px-5 py-3 font-medium text-right">折抵</th>
                  <th className="px-5 py-3 font-medium text-right">实付</th>
                  <th className="px-5 py-3 font-medium">登记日期</th>
                </tr>
              </thead>
              <tbody>
                {subsidyRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-surface-400">
                      暂无补贴数据
                    </td>
                  </tr>
                ) : (
                  subsidyRows.map((o, i) => (
                    <tr
                      key={o.id}
                      className={`border-t border-surface-100 ${
                        i % 2 === 1 ? "bg-surface-50/30" : ""
                      } hover:bg-brand-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-dark-100">
                        {o.orderNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-dark-200">
                        {o.customer.name}
                      </td>
                      <td className="px-5 py-3">
                        <span className="mr-1.5">
                          {getCategoryIcon(o.oldAppliance.category)}
                        </span>
                        {CATEGORY_LABELS[o.oldAppliance.category]}
                      </td>
                      <td className="px-5 py-3 text-dark-100">
                        {o.newAppliance.model || "-"}
                      </td>
                      <td className="px-5 py-3 text-right text-dark-100 font-mono">
                        {formatMoney(o.newAppliance.price)}
                      </td>
                      <td className="px-5 py-3 text-right text-success-600 font-mono font-medium">
                        -{formatMoney(o.newAppliance.discount)}
                      </td>
                      <td className="px-5 py-3 text-right text-brand-600 font-mono font-medium">
                        -{formatMoney(o.newAppliance.tradeInCredit)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-dark-200 font-mono">
                        {formatMoney(o.newAppliance.finalPrice)}
                      </td>
                      <td className="px-5 py-3 text-surface-400">
                        {formatDate(o.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {subsidyRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-brand-50 to-surface-50 border-t-2 border-surface-200">
                    <td colSpan={4} className="px-5 py-3 font-semibold text-dark-200">
                      合计 ({subsidyRows.length} 笔)
                    </td>
                    <td className="px-5 py-3 text-right font-bold font-mono text-dark-200">
                      {formatMoney(
                        subsidyRows.reduce((s, o) => s + o.newAppliance.price, 0)
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold font-mono text-success-600">
                      -
                      {formatMoney(
                        subsidyRows.reduce((s, o) => s + o.newAppliance.discount, 0)
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold font-mono text-brand-600">
                      -
                      {formatMoney(
                        subsidyRows.reduce((s, o) => s + o.newAppliance.tradeInCredit, 0)
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold font-mono text-success-600">
                      {formatMoney(summary.totalFinal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {activeTab === "tradein" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-left text-xs uppercase text-surface-400 tracking-wider">
                  <th className="px-5 py-3 font-medium">工单号</th>
                  <th className="px-5 py-3 font-medium">客户</th>
                  <th className="px-5 py-3 font-medium">旧机品类</th>
                  <th className="px-5 py-3 font-medium">品牌型号</th>
                  <th className="px-5 py-3 font-medium">成色</th>
                  <th className="px-5 py-3 font-medium text-right">折抵金额</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">登记日期</th>
                </tr>
              </thead>
              <tbody>
                {tradeInRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-surface-400">
                      暂无折抵数据
                    </td>
                  </tr>
                ) : (
                  tradeInRows.map((o, i) => (
                    <tr
                      key={o.id}
                      className={`border-t border-surface-100 ${
                        i % 2 === 1 ? "bg-surface-50/30" : ""
                      } hover:bg-brand-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-dark-100">
                        {o.orderNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-dark-200">
                        {o.customer.name || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="mr-1.5">
                          {getCategoryIcon(o.oldAppliance.category)}
                        </span>
                        {CATEGORY_LABELS[o.oldAppliance.category]}
                      </td>
                      <td className="px-5 py-3 text-dark-100">
                        {o.oldAppliance.brand} {o.oldAppliance.model}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            o.oldAppliance.condition === "excellent"
                              ? "bg-success-50 text-success-600"
                              : o.oldAppliance.condition === "good"
                              ? "bg-brand-50 text-brand-600"
                              : o.oldAppliance.condition === "fair"
                              ? "bg-warning-50 text-warning-600"
                              : "bg-danger-50 text-danger-600"
                          }`}
                        >
                          {o.oldAppliance.condition === "excellent"
                            ? "优"
                            : o.oldAppliance.condition === "good"
                            ? "良"
                            : o.oldAppliance.condition === "fair"
                            ? "中"
                            : "差"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold font-mono text-brand-600">
                        {formatMoney(o.oldAppliance.tradeInValue)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${
                            o.status === "completed"
                              ? "badge-completed"
                              : o.status === "approved"
                              ? "badge-approved"
                              : o.status === "recycling"
                              ? "badge-recycling"
                              : o.status === "reviewing"
                              ? "badge-reviewing"
                              : o.status === "assessing"
                              ? "badge-assessing"
                              : o.status === "rejected"
                              ? "badge-rejected"
                              : "badge-draft"
                          }`}
                        >
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-surface-400">
                        {formatDate(o.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {tradeInRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-brand-50 to-surface-50 border-t-2 border-surface-200">
                    <td colSpan={5} className="px-5 py-3 font-semibold text-dark-200">
                      旧机折抵合计
                    </td>
                    <td className="px-5 py-3 text-right font-bold font-mono text-brand-600">
                      {formatMoney(summary.totalTradeIn)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {activeTab === "pending" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-left text-xs uppercase text-surface-400 tracking-wider">
                  <th className="px-5 py-3 font-medium">工单号</th>
                  <th className="px-5 py-3 font-medium">客户</th>
                  <th className="px-5 py-3 font-medium">电话</th>
                  <th className="px-5 py-3 font-medium">地址</th>
                  <th className="px-5 py-3 font-medium">楼层/电梯</th>
                  <th className="px-5 py-3 font-medium">旧机</th>
                  <th className="px-5 py-3 font-medium">预约</th>
                  <th className="px-5 py-3 font-medium">师傅</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-surface-400">
                      暂无待回收工单，太棒了！
                    </td>
                  </tr>
                ) : (
                  pendingRows.map((o, i) => (
                    <tr
                      key={o.id}
                      className={`border-t border-surface-100 ${
                        i % 2 === 1 ? "bg-surface-50/30" : ""
                      } hover:bg-brand-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-dark-100">
                        {o.orderNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-dark-200">
                        {o.customer.name || "-"}
                      </td>
                      <td className="px-5 py-3 text-dark-100 font-mono text-xs">
                        {o.customer.phone || "-"}
                      </td>
                      <td className="px-5 py-3 text-dark-100 max-w-[200px] truncate">
                        {o.customer.address || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm">
                          {o.customer.floor}F ·{" "}
                          {o.customer.hasElevator ? (
                            <span className="text-success-600">电梯</span>
                          ) : (
                            <span className="text-warning-600">爬楼</span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="mr-1">
                          {getCategoryIcon(o.oldAppliance.category)}
                        </span>
                        {o.oldAppliance.brand || ""}
                      </td>
                      <td className="px-5 py-3 text-dark-100 whitespace-nowrap">
                        {o.recycling.scheduledDate || "待安排"}
                        <br />
                        <span className="text-xs text-surface-400">
                          {o.recycling.timeSlot || ""}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-dark-100">
                        {getTechName(o.recycling.technicianId)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${
                            o.status === "recycling" ? "badge-recycling" : "badge-approved"
                          }`}
                        >
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
