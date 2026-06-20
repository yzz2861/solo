import prisma from '../prisma'
import { Prisma } from '@prisma/client'

export interface CreateOrderDto {
  term: string
  gradeId: string
  classId: string
  items: {
    textbookId: string
    qty: number
  }[]
  operator: string
  remark?: string
}

export interface SupplementOrderDto {
  orderId: string
  qty: number
  operator: string
  reason?: string
  transferStudentIds?: string[]
}

export interface ReturnOrderDto {
  orderId: string
  qty: number
  operator: string
  reason?: string
}

export interface ChangeEditionDto {
  orderId: string
  newTextbookId: string
  operator: string
  reason?: string
}

export class OrderService {
  async createOrders(dto: CreateOrderDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const results = []
      for (const item of dto.items) {
        const existing = await tx.order.findUnique({
          where: {
            term_classId_textbookId: {
              term: dto.term,
              classId: dto.classId,
              textbookId: item.textbookId,
            },
          },
        })

        if (existing) {
          throw new Error(
            `班级 ${dto.classId} 的教材 ${item.textbookId} 在学期 ${dto.term} 已有征订记录，请勿重复创建`
          )
        }

        const order = await tx.order.create({
          data: {
            term: dto.term,
            gradeId: dto.gradeId,
            classId: dto.classId,
            textbookId: item.textbookId,
            originalQty: item.qty,
            finalQty: item.qty,
            status: 'SUBMITTED',
            remark: dto.remark,
            changes: {
              create: {
                changeType: 'INITIAL',
                beforeQty: 0,
                afterQty: item.qty,
                operator: dto.operator,
                reason: dto.remark || '初始征订',
              },
            },
          },
          include: {
            textbook: {
              include: { course: true, supplier: true },
            },
            changes: true,
          },
        })
        results.push(order)
      }
      return results
    })
  }

  async supplementOrder(dto: SupplementOrderDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { changes: { orderBy: { createdAt: 'desc' }, take: 10 } },
      })
      if (!order) throw new Error('订单不存在')

      if (dto.qty <= 0) throw new Error('补订数量必须大于0')

      const lastSupplement = order.changes.find(
        (c) => c.changeType === 'SUPPLEMENT'
      )
      if (lastSupplement && dto.reason === '合并补订') {
        const newAfterQty = lastSupplement.afterQty + dto.qty
        await tx.orderChange.update({
          where: { id: lastSupplement.id },
          data: {
            afterQty: newAfterQty,
            reason: dto.reason || '补订合并',
          },
        })
        const newFinalQty = order.originalQty + newAfterQty - order.returnQty
        return tx.order.update({
          where: { id: dto.orderId },
          data: {
            supplementQty: order.supplementQty + dto.qty,
            finalQty: newFinalQty,
          },
          include: { textbook: { include: { course: true } }, changes: true },
        })
      }

      const beforeFinalQty = order.finalQty
      const newFinalQty = beforeFinalQty + dto.qty

      const change = await tx.orderChange.create({
        data: {
          orderId: dto.orderId,
          changeType: 'SUPPLEMENT',
          beforeQty: beforeFinalQty,
          afterQty: newFinalQty,
          operator: dto.operator,
          reason: dto.reason,
          transferIds: dto.transferStudentIds?.join(','),
        },
      })

      if (dto.transferStudentIds && dto.transferStudentIds.length > 0) {
        for (const tid of dto.transferStudentIds) {
          await tx.orderChangeTransfer.create({
            data: {
              orderChangeId: change.id,
              transferStudentId: tid,
            },
          })
        }
      }

      return tx.order.update({
        where: { id: dto.orderId },
        data: {
          supplementQty: order.supplementQty + dto.qty,
          finalQty: newFinalQty,
        },
        include: { textbook: { include: { course: true } }, changes: true },
      })
    })
  }

  async returnOrder(dto: ReturnOrderDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
      })
      if (!order) throw new Error('订单不存在')

      if (order.deliveredQty > 0 && order.deliveredQty >= order.receivedQty) {
        const alreadyIssued = order.receivedQty
        const maxReturnable = order.finalQty - alreadyIssued
        if (dto.qty > maxReturnable) {
          throw new Error(
            `已发书 ${alreadyIssued} 册，最多只能退订 ${maxReturnable} 册`
          )
        }
      }

      if (dto.qty <= 0) throw new Error('退订数量必须大于0')
      if (dto.qty > order.finalQty - order.returnQty) {
        throw new Error('退订数量超过可退订范围')
      }

      const beforeFinalQty = order.finalQty
      const newFinalQty = beforeFinalQty - dto.qty

      await tx.orderChange.create({
        data: {
          orderId: dto.orderId,
          changeType: 'RETURN',
          beforeQty: beforeFinalQty,
          afterQty: newFinalQty,
          operator: dto.operator,
          reason: dto.reason,
        },
      })

      return tx.order.update({
        where: { id: dto.orderId },
        data: {
          returnQty: order.returnQty + dto.qty,
          finalQty: newFinalQty,
        },
        include: { textbook: { include: { course: true } }, changes: true },
      })
    })
  }

  async changeEdition(dto: ChangeEditionDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
      })
      if (!order) throw new Error('订单不存在')

      if (order.deliveredQty > 0) {
        throw new Error('已到货的订单不能变更版本')
      }

      const newTextbook = await tx.textbook.findUnique({
        where: { id: dto.newTextbookId },
        include: { course: true },
      })
      if (!newTextbook) throw new Error('新版本教材不存在')

      if (newTextbook.courseId !== order.textbookId) {
        const oldTextbook = await tx.textbook.findUnique({
          where: { id: order.textbookId },
        })
        if (oldTextbook && oldTextbook.courseId !== newTextbook.courseId) {
          throw new Error('版本变更只能在同一课程内进行')
        }
      }

      const existing = await tx.order.findUnique({
        where: {
          term_classId_textbookId: {
            term: order.term,
            classId: order.classId,
            textbookId: dto.newTextbookId,
          },
        },
      })
      if (existing && existing.id !== order.id) {
        throw new Error('该班级新版本教材已有订单，请使用合并补订功能')
      }

      const oldEditionId = order.textbookId
      const oldFinalQty = order.finalQty

      const versionChange = await tx.orderChange.create({
        data: {
          orderId: dto.orderId,
          changeType: 'EDITION_CHANGE',
          beforeQty: oldFinalQty,
          afterQty: oldFinalQty,
          beforeEditionId: oldEditionId,
          afterEditionId: dto.newTextbookId,
          operator: dto.operator,
          reason: dto.reason || '版本变更',
        },
      })

      return tx.order.update({
        where: { id: dto.orderId },
        data: {
          textbookId: dto.newTextbookId,
          changes: {
            create: {
              changeType: ChangeType.INITIAL,
              beforeQty: 0,
              afterQty: oldFinalQty,
              operator: dto.operator,
              reason: `版本变更自 ${oldEditionId}`,
              linkedChangeId: versionChange.id,
            },
          },
        },
        include: { textbook: { include: { course: true } }, changes: true },
      })
    })
  }

  async getEditionTrace(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        changes: {
          include: {
            beforeEdition: { include: { course: true } },
            afterEdition: { include: { course: true } },
            linkedChange: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!order) throw new Error('订单不存在')

    const traces: any[] = []
    for (const change of order.changes) {
      if (change.changeType === 'EDITION_CHANGE') {
        traces.push({
          type: '版本变更',
          from: change.beforeEdition,
          to: change.afterEdition,
          operator: change.operator,
          reason: change.reason,
          time: change.createdAt,
        })
      }
    }
    return { order, traces }
  }

  async getClassProgress(classId: string, term: string) {
    const orders = await prisma.order.findMany({
      where: { classId, term },
      include: {
        textbook: { include: { course: true, supplier: true } },
        changes: true,
      },
    })

    const total = orders.length
    const delivered = orders.filter((o) => o.deliveredQty >= o.finalQty).length
    const partial = orders.filter(
      (o) => o.deliveredQty > 0 && o.deliveredQty < o.finalQty
    ).length
    const pending = total - delivered - partial

    const items = orders.map((o) => ({
      orderId: o.id,
      course: o.textbook.course.name,
      edition: o.textbook.edition,
      supplier: o.textbook.supplier?.name,
      finalQty: o.finalQty,
      supplementQty: o.supplementQty,
      returnQty: o.returnQty,
      deliveredQty: o.deliveredQty,
      receivedQty: o.receivedQty,
      shortageQty: o.finalQty - o.deliveredQty,
      status: o.status,
    }))

    return {
      classId,
      term,
      summary: { total, delivered, partial, pending },
      items,
    }
  }
}
