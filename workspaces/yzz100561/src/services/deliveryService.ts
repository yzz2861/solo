import prisma from '../prisma'
import { Prisma } from '@prisma/client'

export interface CreateDeliveryDto {
  supplierId: string
  deliveryNo: string
  deliveryDate: string
  items: {
    orderId: string
    textbookId: string
    qty: number
  }[]
  operator: string
  remark?: string
}

export class DeliveryService {
  async createDelivery(dto: CreateDeliveryDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const delivery = await tx.delivery.create({
        data: {
          supplierId: dto.supplierId,
          deliveryNo: dto.deliveryNo,
          deliveryDate: new Date(dto.deliveryDate),
          remark: dto.remark,
        },
      })

      for (const item of dto.items) {
        const order = await tx.order.findUnique({
          where: { id: item.orderId },
        })
        if (!order) throw new Error(`订单 ${item.orderId} 不存在`)

        await tx.deliveryItem.create({
          data: {
            deliveryId: delivery.id,
            orderId: item.orderId,
            textbookId: item.textbookId,
            qty: item.qty,
            confirmed: true,
            confirmedBy: dto.operator,
            confirmedAt: new Date(),
          },
        })

        const newDeliveredQty = order.deliveredQty + item.qty
        let status = order.status
        if (newDeliveredQty >= order.finalQty) {
          status = 'DELIVERED' as any
        } else if (newDeliveredQty > 0) {
          status = 'PARTIAL_DELIVERED' as any
        }

        await tx.order.update({
          where: { id: item.orderId },
          data: {
            deliveredQty: newDeliveredQty,
            status,
          },
        })
      }

      return tx.delivery.findUnique({
        where: { id: delivery.id },
        include: {
          supplier: true,
          items: {
            include: {
              textbook: { include: { course: true } },
              order: { include: { class: { include: { grade: true } } } },
            },
          },
        },
      })
    })
  }

  async getPendingDeliveries() {
    const orders = await prisma.order.findMany({
      where: {
        NOT: {
          status: { in: ['DELIVERED', 'CLOSED'] as any },
        },
      },
      include: {
        textbook: { include: { course: true, supplier: true } },
        class: { include: { grade: true } },
      },
      orderBy: [{ classId: 'asc' }],
    })

    const result = new Map<string, any[]>()
    for (const order of orders) {
      const shortage = order.finalQty - order.deliveredQty
      if (shortage <= 0) continue
      const className = `${order.class.grade.name}${order.class.name}`
      if (!result.has(className)) result.set(className, [])
      result.get(className)!.push({
        orderId: order.id,
        course: order.textbook.course.name,
        edition: order.textbook.edition,
        supplier: order.textbook.supplier?.name,
        finalQty: order.finalQty,
        deliveredQty: order.deliveredQty,
        shortageQty: shortage,
      })
    }
    return Object.fromEntries(result)
  }

  async getWarehouseToShip() {
    const orders = await prisma.order.findMany({
      where: {
        deliveredQty: { gt: 0 },
        receivedQty: { lt: prisma.order.fields.deliveredQty },
      },
      include: {
        textbook: { include: { course: true } },
        class: { include: { grade: true } },
      },
      orderBy: [{ classId: 'asc' }],
    })

    const grouped: Record<string, any[]> = {}
    for (const o of orders) {
      const toShip = o.deliveredQty - o.receivedQty
      if (toShip <= 0) continue
      const classKey = `${o.class.grade.name}${o.class.name}`
      if (!grouped[classKey]) grouped[classKey] = []
      grouped[classKey].push({
        orderId: o.id,
        course: o.textbook.course.name,
        edition: o.textbook.edition,
        toShip,
        alreadyDelivered: o.deliveredQty,
        alreadyReceived: o.receivedQty,
      })
    }
    return grouped
  }

  async printShortageList(date: string) {
    const targetDate = new Date(date)
    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: new Date(targetDate.toDateString()),
          lt: new Date(targetDate.getTime() + 86400000),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            order: {
              include: {
                class: { include: { grade: true } },
                textbook: { include: { course: true } },
              },
            },
          },
        },
      },
    })

    const classShortages: Record<string, any[]> = {}

    for (const delivery of deliveries) {
      for (const item of delivery.items) {
        const order = item.order
        const ordered = order.finalQty
        const arrived = order.deliveredQty
        const shortage = ordered - arrived
        if (shortage <= 0) continue

        const classKey = `${order.class.grade.name}${order.class.name}`
        if (!classShortages[classKey]) {
          classShortages[classKey] = []
        }

        const transferStudents = await prisma.transferStudent.findMany({
          where: {
            classId: order.classId,
            transferType: 'IN',
          },
        })

        classShortages[classKey].push({
          course: order.textbook.course.name,
          edition: order.textbook.edition,
          isbn: order.textbook.isbn,
          ordered,
          arrived,
          shortage,
          supplier: delivery.supplier.name,
          isTransfer: transferStudents.length > 0,
          transferCount: transferStudents.length,
        })
      }
    }

    return {
      printDate: date,
      classCount: Object.keys(classShortages).length,
      shortages: classShortages,
    }
  }

  async getSupplierDeliveryDiff(supplierId?: string) {
    const where = supplierId ? { supplierId } : {}
    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            textbook: { include: { course: true } },
            order: true,
          },
        },
      },
    })

    const diffMap = new Map<string, any>()
    for (const delivery of deliveries) {
      for (const item of delivery.items) {
        const key = `${delivery.supplierId}-${item.textbookId}`
        if (!diffMap.has(key)) {
          diffMap.set(key, {
            supplier: delivery.supplier.name,
            course: item.textbook.course.name,
            edition: item.textbook.edition,
            ordered: 0,
            delivered: 0,
            diff: 0,
          })
        }
        const entry = diffMap.get(key)!
        entry.ordered += item.order.finalQty
        entry.delivered += item.qty
        entry.diff = entry.ordered - entry.delivered
      }
    }
    return Array.from(diffMap.values())
  }
}
