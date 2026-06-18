export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateOrderNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")
  return `HJ${y}${m}${d}${seq}`
}

export function generateConfirmCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function formatDate(iso: string): string {
  if (!iso) return "-"
  return iso.slice(0, 10)
}

export function formatDateTime(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString("zh-CN")}`
}

export function getDifficultyLevel(floor: number, hasElevator: boolean): "easy" | "medium" | "hard" {
  if (hasElevator) return "easy"
  if (floor <= 3) return "medium"
  return "hard"
}

export function getDifficultyLabel(level: "easy" | "medium" | "hard"): string {
  return { easy: "轻松", medium: "一般", hard: "困难" }[level]
}

export function getDifficultyColor(level: "easy" | "medium" | "hard"): string {
  return { easy: "text-success-500", medium: "text-warning-500", hard: "text-danger-500" }[level]
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    refrigerator: "🧊",
    washer: "🫧",
    ac: "❄️",
    tv: "📺",
    other: "🔌",
  }
  return map[category] || "🔌"
}
