import { Link } from "react-router-dom"
import { Plus, ClipboardCheck, Truck, CheckCircle2, AlertTriangle, AlertCircle, Clock, ListChecks } from "lucide-react"
import { useStore } from "@/store/useStore"
import StatusBadge from "@/components/StatusBadge"
import { formatMoney, getCategoryIcon, formatDate, formatDateTime } from "@/utils/helpers"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/types"

export default function Dashboard() {
  const orders = useStore((s) => s.orders)

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = orders.filter((o) => o.createdAt.slice(0, 10) === today).length
  const reviewingCount = orders.filter((o) => o.status === "reviewing").length
  const recyclingCount = orders.filter((o) => o.status === "approved" || o.status === "recycling").length
  const completedCount = orders.filter((o) => o.status === "completed").length

  const alerts: { id: string; orderNo: string; message: string }[] = []

  orders.forEach((o) => {
    if (o.status === "reviewing" && !o.subsidyDocs.isComplete) {
      alerts.push({ id: o.id, orderNo: o.orderNo, message: `工单 ${o.orderNo} 补贴资料不完整` })
    }
    if (o.status === "recycling" && o.recycling.confirmedAt === null && o.recycling.scheduledDate) {
      const scheduled = new Date(o.recycling.scheduledDate)
      if (scheduled < new Date()) {
        alerts.push({ id: o.id, orderNo: o.orderNo, message: `工单 ${o.orderNo} 回收超时未确认` })
      }
    }
  })

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="animate-fade-up space-y-6">
      <h1 className="font-serif text-2xl font-bold">工作台</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="stat-card stat-card-orange">
          <Plus size={20} className="text-brand-500" />
          <div className="mt-3 text-3xl font-bold">{todayCount}</div>
          <div className="text-sm text-gray-500">今日新增</div>
        </div>
        <div className="stat-card stat-card-yellow">
          <ClipboardCheck size={20} className="text-brand-500" />
          <div className="mt-3 text-3xl font-bold">{reviewingCount}</div>
          <div className="text-sm text-gray-500">待审核</div>
        </div>
        <div className="stat-card stat-card-blue">
          <Truck size={20} className="text-brand-500" />
          <div className="mt-3 text-3xl font-bold">{recyclingCount}</div>
          <div className="text-sm text-gray-500">待回收</div>
        </div>
        <div className="stat-card stat-card-green">
          <CheckCircle2 size={20} className="text-brand-500" />
          <div className="mt-3 text-3xl font-bold">{completedCount}</div>
          <div className="text-sm text-gray-500">已结案</div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2 text-warning-500">
          <AlertTriangle size={18} />
          <span className="font-medium">预警提醒</span>
        </div>
        {alerts.length === 0 ? (
          <div className="text-surface-400">暂无预警</div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  to={`/orders/${alert.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface-50"
                >
                  <AlertCircle size={16} className="text-danger-400" />
                  <span className="text-sm">{alert.message}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/register" className="btn-primary">
          <Plus size={16} />
          新建登记
        </Link>
        <Link to="/orders?status=reviewing" className="btn-secondary">
          <ClipboardCheck size={16} />
          我的待审
        </Link>
        <Link to="/recycling" className="btn-secondary">
          <Truck size={16} />
          我的回收
        </Link>
        <Link to="/orders" className="btn-secondary">
          <ListChecks size={16} />
          全部工单
        </Link>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <Clock size={18} className="text-brand-500" />
          <span className="font-medium">最近工单</span>
        </div>
        <ul className="divide-y divide-surface-200">
          {recentOrders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-50"
              >
                <span className="text-lg">{getCategoryIcon(order.oldAppliance.category)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{order.orderNo}</span>
                  <span className="ml-2 text-sm text-gray-500">{order.customer.name}</span>
                </span>
                <span className="text-sm text-gray-500">{CATEGORY_LABELS[order.oldAppliance.category]}</span>
                <StatusBadge status={order.status} />
                <span className="text-xs text-surface-400">{formatDateTime(order.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
