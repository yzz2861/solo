import prisma from '../prisma'
import { ReceiptStatus, Prisma } from '@prisma/client'

export interface CreateReceiptDto {
  classId: string
  receiptDate: string
  items: {
    orderId: string
    textbookId: string
    actualQty: number
    isTransfer?: boolean
    remark?: string
  }[]
  operator: string
  remark?: string
}

export interface SignReceiptDto {
  receiptId: string
  signedBy: string
  signedAt?: string
}

export class ReceiptService {
  async createReceipt(dto: CreateReceiptDto) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const receiptNo = `REC-${Date.now()}`

      const receipt = await tx.receipt.create({
        data: {
          classId: dto.classId,
          receiptNo,
          receiptDate: new Date(dto.receiptDate),
          remark: dto.remark,
        },
      })

      const receiptItems = []
      for (const item of dto.items) {
        const order = await tx.order.findUnique({
          where: { id: item.orderId },
        })
        if (!order) throw new Error(`订单 ${item.orderId} 不存在`)

        const availableToReceive = order.deliveredQty - order.receivedQty
        if (item.actualQty > availableToReceive) {
          throw new Error(
            `教材 ${item.textbookId} 已到货 ${order.deliveredQty}，已签收 ${order.receivedQty}，本次签收 ${item.actualQty} 超过可签收数量 ${availableToReceive}，未到书不能算已发！`
          )
        }

        const expectedQty = Math.min(order.finalQty - order.receivedQty, availableToReceive)
        const shortageQty = expectedQty - item.actualQty

        const receiptItem = await tx.receiptItem.create({
          data: {
            receiptId: receipt.id,
            orderId: item.orderId,
            textbookId: item.textbookId,
            expectedQty,
            actualQty: item.actualQty,
            shortageQty: shortageQty < 0 ? 0 : shortageQty,
            isTransfer: item.isTransfer || false,
            remark: item.remark,
          },
        })
        receiptItems.push(receiptItem)

        await tx.order.update({
          where: { id: item.orderId },
          data: {
            receivedQty: order.receivedQty + item.actualQty,
          },
        })
      }

      const allItems = await tx.receiptItem.findMany({
        where: { receiptId: receipt.id },
      })
      const allShortageZero = allItems.every((i) => i.shortageQty === 0)
      const anyPartial = allItems.some(
        (i) => i.actualQty > 0 && i.actualQty < i.expectedQty
      )

      let status: ReceiptStatus = ReceiptStatus.PENDING
      if (allShortageZero && allItems.length > 0) {
        status = ReceiptStatus.COMPLETED
      } else if (anyPartial) {
        status = ReceiptStatus.PARTIAL
      }

      const transferMarked = allItems.some((i) => i.isTransfer)

      return tx.receipt.update({
        where: { id: receipt.id },
        data: { status, transferMarked },
        include: {
          class: { include: { grade: true } },
          items: {
            include: {
              textbook: { include: { course: true } },
              order: true,
            },
          },
        },
      })
    })
  }

  async signReceipt(dto: SignReceiptDto) {
    const receipt = await prisma.receipt.findUnique({
      where: { id: dto.receiptId },
    })
    if (!receipt) throw new Error('签收单不存在')

    return prisma.receipt.update({
      where: { id: dto.receiptId },
      data: {
        signedBy: dto.signedBy,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : new Date(),
        status: ReceiptStatus.COMPLETED,
      },
      include: {
        class: { include: { grade: true } },
        items: {
          include: {
            textbook: { include: { course: true } },
          },
        },
      },
    })
  }

  async getReceipt(receiptId: string) {
    return prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        class: { include: { grade: true, transfers: true } },
        items: {
          include: {
            textbook: { include: { course: true } },
            order: true,
          },
        },
      },
    })
  }

  async listReceipts(classId?: string, startDate?: string, endDate?: string) {
    const where: any = {}
    if (classId) where.classId = classId
    if (startDate || endDate) {
      where.receiptDate = {}
      if (startDate) where.receiptDate.gte = new Date(startDate)
      if (endDate) where.receiptDate.lte = new Date(endDate)
    }

    return prisma.receipt.findMany({
      where,
      include: {
        class: { include: { grade: true } },
        items: {
          include: {
            textbook: { include: { course: true } },
          },
        },
      },
      orderBy: { receiptDate: 'desc' },
    })
  }
}
