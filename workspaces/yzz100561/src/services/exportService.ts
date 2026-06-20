import prisma from '../prisma'
import * as ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export class ExportService {
  async exportShortage(term: string): Promise<Buffer> {
    const orders = await prisma.order.findMany({
      where: {
        term,
        AND: [
          {
            NOT: {
              deliveredQty: { gte: prisma.order.fields.finalQty },
            },
          },
        ],
      },
      include: {
        textbook: { include: { course: true, supplier: true } },
        class: { include: { grade: true, transfers: true } },
      },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('缺书清单')

    sheet.columns = [
      { header: '年级班级', key: 'class', width: 15 },
      { header: '课程', key: 'course', width: 15 },
      { header: '教材版本', key: 'edition', width: 20 },
      { header: 'ISBN', key: 'isbn', width: 18 },
      { header: '供应商', key: 'supplier', width: 20 },
      { header: '订数', key: 'ordered', width: 8 },
      { header: '已到货', key: 'arrived', width: 8 },
      { header: '缺数', key: 'shortage', width: 8 },
      { header: '班主任', key: 'teacher', width: 12 },
      { header: '是否含转学生', key: 'hasTransfer', width: 12 },
      { header: '转学生人数', key: 'transferCount', width: 10 },
      { header: '状态', key: 'status', width: 12 },
    ]

    for (const o of orders) {
      const transferIns = o.class.transfers.filter((t) => t.transferType === 'IN')
      sheet.addRow({
        class: `${o.class.grade.name}${o.class.name}`,
        course: o.textbook.course.name,
        edition: o.textbook.edition,
        isbn: o.textbook.isbn || '',
        supplier: o.textbook.supplier?.name || '',
        ordered: o.finalQty,
        arrived: o.deliveredQty,
        shortage: o.finalQty - o.deliveredQty,
        teacher: o.class.headTeacher,
        hasTransfer: transferIns.length > 0 ? '是' : '否',
        transferCount: transferIns.length,
        status: this.translateStatus(o.status),
      })
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
  }

  async exportReturns(term: string): Promise<Buffer> {
    const changes = await prisma.orderChange.findMany({
      where: {
        changeType: 'RETURN',
        order: { term },
      },
      include: {
        order: {
          include: {
            textbook: { include: { course: true, supplier: true } },
            class: { include: { grade: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('退订明细')

    sheet.columns = [
      { header: '退订日期', key: 'date', width: 12 },
      { header: '年级班级', key: 'class', width: 15 },
      { header: '课程', key: 'course', width: 15 },
      { header: '教材版本', key: 'edition', width: 20 },
      { header: '退订前数量', key: 'before', width: 10 },
      { header: '退订后数量', key: 'after', width: 10 },
      { header: '退订数量', key: 'returned', width: 10 },
      { header: '操作人', key: 'operator', width: 12 },
      { header: '退订原因', key: 'reason', width: 30 },
    ]

    for (const c of changes) {
      sheet.addRow({
        date: format(c.createdAt, 'yyyy-MM-dd', { locale: zhCN }),
        class: `${c.order.class.grade.name}${c.order.class.name}`,
        course: c.order.textbook.course.name,
        edition: c.order.textbook.edition,
        before: c.beforeQty,
        after: c.afterQty,
        returned: c.beforeQty - c.afterQty,
        operator: c.operator,
        reason: c.reason || '',
      })
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
  }

  async exportSupplierDiff(term: string): Promise<Buffer> {
    const deliveries = await prisma.delivery.findMany({
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

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('供应商到货差异')

    sheet.columns = [
      { header: '供应商', key: 'supplier', width: 20 },
      { header: '送货单号', key: 'deliveryNo', width: 18 },
      { header: '送货日期', key: 'date', width: 12 },
      { header: '课程', key: 'course', width: 15 },
      { header: '教材版本', key: 'edition', width: 20 },
      { header: '订单要求', key: 'ordered', width: 10 },
      { header: '实际到货', key: 'delivered', width: 10 },
      { header: '差异', key: 'diff', width: 10 },
    ]

    for (const d of deliveries) {
      for (const item of d.items) {
        if (!item.order || item.order.term !== term) continue
        sheet.addRow({
          supplier: d.supplier.name,
          deliveryNo: d.deliveryNo,
          date: format(d.deliveryDate, 'yyyy-MM-dd', { locale: zhCN }),
          course: item.textbook.course.name,
          edition: item.textbook.edition,
          ordered: item.order.finalQty,
          delivered: item.qty,
          diff: item.order.finalQty - item.qty,
        })
      }
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
  }

  async exportTransfers(term: string): Promise<Buffer> {
    const transfers = await prisma.transferStudent.findMany({
      include: { class: { include: { grade: true } } },
      orderBy: { transferDate: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('转学生名单')

    sheet.columns = [
      { header: '转入/转出日期', key: 'date', width: 12 },
      { header: '类型', key: 'type', width: 8 },
      { header: '年级班级', key: 'class', width: 15 },
      { header: '姓名', key: 'name', width: 10 },
      { header: '学号', key: 'studentNo', width: 15 },
      { header: '备注', key: 'remark', width: 30 },
    ]

    for (const t of transfers) {
      sheet.addRow({
        date: format(t.transferDate, 'yyyy-MM-dd', { locale: zhCN }),
        type: t.transferType === 'IN' ? '转入' : '转出',
        class: `${t.class.grade.name}${t.class.name}`,
        name: t.name,
        studentNo: t.studentNo || '',
        remark: t.remark || '',
      })
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      DRAFT: '草稿',
      SUBMITTED: '已提交',
      CONFIRMED: '已确认',
      PARTIAL_DELIVERED: '部分到货',
      DELIVERED: '全部到货',
      CLOSED: '已关闭',
    }
    return map[status] || status
  }
}
