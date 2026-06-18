import { OrderStatus, STATUS_LABELS } from "@/types"

const STATUS_CLASS: Record<OrderStatus, string> = {
  draft: "badge-draft",
  assessing: "badge-assessing",
  reviewing: "badge-reviewing",
  approved: "badge-approved",
  recycling: "badge-recycling",
  completed: "badge-completed",
  rejected: "badge-rejected",
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>
}
