import { useState, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Search, Filter, ListChecks, ChevronRight } from "lucide-react"
import { useStore } from "@/store/useStore"
import StatusBadge from "@/components/StatusBadge"
import { getCategoryIcon, formatDate, formatMoney } from "@/utils/helpers"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/types"
import type { OrderStatus } from "@/types"

type TabKey = "all" | "assessing" | "reviewing" | "recycling" | "completed" | "rejected"

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "assessing", label: "待评估" },
  { key: "reviewing", label: "待审核" },
  { key: "recycling", label: "待回收" },
  { key: "completed", label: "已结案" },
  { key: "rejected", label: "已驳回" },
]

function filterByTab(status: OrderStatus, tab: TabKey): boolean {
  if (tab === "all") return true
  if (tab === "recycling") return status === "approved" || status === "recycling"
  return status === tab
}

export default function Orders() {
  const orders = useStore((s) => s.orders)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get("tab") as TabKey) || "all"
  const [keyword, setKeyword] = useState("")

  const setTab = (key: TabKey) => {
    setSearchParams(key === "all" ? {} : { tab: key })
  }

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [orders]
  )

  const filtered = useMemo(() => {
    return sorted.filter((o) => {
      if (!filterByTab(o.status, tab)) return false
      if (keyword) {
        const q = keyword.toLowerCase()
        return (
          o.orderNo.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [sorted, tab, keyword])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: orders.length,
      assessing: 0,
      reviewing: 0,
      recycling: 0,
      completed: 0,
      rejected: 0,
    }
    for (const o of orders) {
      if (o.status === "assessing") c.assessing++
      else if (o.status === "reviewing") c.reviewing++
      else if (o.status === "approved" || o.status === "recycling") c.recycling++
      else if (o.status === "completed") c.completed++
      else if (o.status === "rejected") c.rejected++
    }
    return c
  }, [orders])

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">工单跟踪</h1>
        <Link to="/register" className="btn-primary">
          新建登记
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜索工单号或客户姓名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs text-gray-400">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ListChecks className="mb-2 h-10 w-10" />
          <span>暂无工单</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card flex items-center gap-4 transition-all hover:shadow-md hover:translate-x-0.5"
            >
              <span className="text-2xl">{getCategoryIcon(order.oldAppliance.category)}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{order.orderNo}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="text-sm text-gray-600">
                  {order.customer.name} {order.customer.phone}
                </div>
                <div className="text-sm text-gray-500">
                  {CATEGORY_LABELS[order.oldAppliance.category]} {order.oldAppliance.brand} {order.oldAppliance.model}
                </div>
                <div className="text-sm font-medium text-brand-600">
                  {formatMoney(order.oldAppliance.tradeInValue)} 折抵
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
