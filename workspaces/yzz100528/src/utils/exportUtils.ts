import * as XLSX from "xlsx"
import type { TradeInOrder } from "@/types"
import { CATEGORY_LABELS, STATUS_LABELS, CONDITION_LABELS } from "@/types"

export function exportSubsidySummary(orders: TradeInOrder[], fileName: string) {
  const data = orders
    .filter((o) => o.subsidyDocs.isComplete)
    .map((o) => ({
      工单号: o.orderNo,
      客户姓名: o.customer.name,
      旧机品类: CATEGORY_LABELS[o.oldAppliance.category],
      旧机品牌: o.oldAppliance.brand,
      新机型号: o.newAppliance.model,
      新机售价: o.newAppliance.price,
      政府补贴: o.newAppliance.discount,
      折抵金额: o.newAppliance.tradeInCredit,
      实付金额: o.newAppliance.finalPrice,
      状态: STATUS_LABELS[o.status],
      登记日期: o.createdAt.slice(0, 10),
    }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "补贴汇总")
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export function exportTradeInDetails(orders: TradeInOrder[], fileName: string) {
  const data = orders.map((o) => ({
    工单号: o.orderNo,
    客户姓名: o.customer.name,
    旧机品类: CATEGORY_LABELS[o.oldAppliance.category],
    旧机品牌: o.oldAppliance.brand,
    旧机型号: o.oldAppliance.model,
    购买年份: o.oldAppliance.purchaseYear || "-",
    成色: CONDITION_LABELS[o.oldAppliance.condition],
    折抵金额: o.oldAppliance.tradeInValue,
    新机型号: o.newAppliance.model || "-",
    新机售价: o.newAppliance.price || "-",
    补贴: o.newAppliance.discount || "-",
    折抵: o.newAppliance.tradeInCredit || "-",
    实付: o.newAppliance.finalPrice || "-",
    状态: STATUS_LABELS[o.status],
    登记日期: o.createdAt.slice(0, 10),
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "折抵明细")
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export function exportPendingRecycling(orders: TradeInOrder[], fileName: string) {
  const data = orders
    .filter((o) => o.status === "approved" || o.status === "recycling")
    .map((o) => ({
      工单号: o.orderNo,
      客户姓名: o.customer.name,
      联系电话: o.customer.phone,
      地址: o.customer.address,
      楼层: o.customer.floor,
      有电梯: o.customer.hasElevator ? "是" : "否",
      旧机品类: CATEGORY_LABELS[o.oldAppliance.category],
      旧机品牌: o.oldAppliance.brand,
      预约日期: o.recycling.scheduledDate || "待定",
      时间段: o.recycling.timeSlot || "待定",
      回收师傅: o.recycling.technicianId ? getTechName(orders, o.recycling.technicianId) : "待分配",
      确认码: o.recycling.confirmationCode,
      状态: o.status === "approved" ? "待上门" : "回收中",
    }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "待回收清单")
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

function getTechName(_orders: TradeInOrder[], techId: string): string {
  const techMap: Record<string, string> = {
    "tech-1": "张师傅",
    "tech-2": "李师傅",
    "tech-3": "王师傅",
  }
  return techMap[techId] || techId
}
