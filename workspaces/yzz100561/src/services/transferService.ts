import prisma from '../prisma'

export interface TransferStudentDto {
  classId: string
  name: string
  studentNo?: string
  transferType: 'IN' | 'OUT'
  transferDate: string
  remark?: string
}

export class TransferStudentService {
  async addTransfer(dto: TransferStudentDto) {
    return prisma.transferStudent.create({
      data: {
        classId: dto.classId,
        name: dto.name,
        studentNo: dto.studentNo,
        transferType: dto.transferType,
        transferDate: new Date(dto.transferDate),
        remark: dto.remark,
      },
      include: { class: { include: { grade: true } } },
    })
  }

  async listTransfers(classId?: string, type?: 'IN' | 'OUT') {
    const where: any = {}
    if (classId) where.classId = classId
    if (type) where.transferType = type
    return prisma.transferStudent.findMany({
      where,
      include: { class: { include: { grade: true } } },
      orderBy: { transferDate: 'desc' },
    })
  }

  async deleteTransfer(id: string) {
    const linked = await prisma.orderChangeTransfer.findMany({
      where: { transferStudentId: id },
    })
    if (linked.length > 0) {
      await prisma.orderChangeTransfer.deleteMany({
        where: { transferStudentId: id },
      })
    }
    return prisma.transferStudent.delete({ where: { id } })
  }

  async getTransfersWithOrders(classId: string) {
    const transfers = await prisma.transferStudent.findMany({
      where: { classId, transferType: 'IN' },
      include: {
        orderChangeLinks: {
          include: {
            orderChange: {
              include: {
                order: {
                  include: {
                    textbook: { include: { course: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    return transfers.map((t) => ({
      id: t.id,
      name: t.name,
      studentNo: t.studentNo,
      transferDate: t.transferDate,
      orders: t.orderChangeLinks
        .filter((l) => l.orderChange.order.classId === classId)
        .map((l) => ({
          course: l.orderChange.order.textbook.course.name,
          edition: l.orderChange.order.textbook.edition,
          qty: l.orderChange.afterQty - l.orderChange.beforeQty,
          orderId: l.orderChange.orderId,
        })),
    }))
  }
}
