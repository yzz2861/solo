import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始插入种子数据...')

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.orderChangeTransfer.deleteMany()
    await tx.receiptItem.deleteMany()
    await tx.receipt.deleteMany()
    await tx.deliveryItem.deleteMany()
    await tx.delivery.deleteMany()
    await tx.orderChange.deleteMany()
    await tx.order.deleteMany()
    await tx.transferStudent.deleteMany()
    await tx.textbook.deleteMany()
    await tx.course.deleteMany()
    await tx.class.deleteMany()
    await tx.grade.deleteMany()
    await tx.supplier.deleteMany()

    const grade1 = await tx.grade.create({ data: { name: '一年级' } })
    const grade2 = await tx.grade.create({ data: { name: '二年级' } })
    const grade3 = await tx.grade.create({ data: { name: '三年级' } })
    console.log('  ✅ 年级数据：一年级、二年级、三年级')

    const class1_1 = await tx.class.create({
      data: { gradeId: grade1.id, name: '(1)班', headTeacher: '张老师', studentCount: 45 },
    })
    const class1_2 = await tx.class.create({
      data: { gradeId: grade1.id, name: '(2)班', headTeacher: '李老师', studentCount: 46 },
    })
    const class2_1 = await tx.class.create({
      data: { gradeId: grade2.id, name: '(1)班', headTeacher: '王老师', studentCount: 44 },
    })
    const class3_1 = await tx.class.create({
      data: { gradeId: grade3.id, name: '(1)班', headTeacher: '赵老师', studentCount: 48 },
    })
    console.log('  ✅ 班级数据：4个班')

    const courseChinese = await tx.course.create({ data: { name: '语文' } })
    const courseMath = await tx.course.create({ data: { name: '数学' } })
    const courseEnglish = await tx.course.create({ data: { name: '英语' } })
    const courseScience = await tx.course.create({ data: { name: '科学' } })
    console.log('  ✅ 课程数据：语文、数学、英语、科学')

    const supplierA = await tx.supplier.create({
      data: { name: '人教社图书发行中心', contact: '陈经理', phone: '13800000001' },
    })
    const supplierB = await tx.supplier.create({
      data: { name: '华东师大教育出版社', contact: '刘经理', phone: '13800000002' },
    })
    const supplierC = await tx.supplier.create({
      data: { name: '外研社教材配送中心', contact: '周经理', phone: '13800000003' },
    })
    console.log('  ✅ 供应商数据：3家')

    const tb_chn_2024 = await tx.textbook.create({
      data: { courseId: courseChinese.id, edition: '人教版2024', isbn: '9787107123456', price: 9.80, supplierId: supplierA.id },
    })
    const tb_chn_2025 = await tx.textbook.create({
      data: { courseId: courseChinese.id, edition: '人教版2025', isbn: '9787107123457', price: 10.50, supplierId: supplierA.id },
    })
    const tb_math_2024 = await tx.textbook.create({
      data: { courseId: courseMath.id, edition: '华师大版2024', isbn: '97875617123456', price: 8.90, supplierId: supplierB.id },
    })
    const tb_eng_2024 = await tx.textbook.create({
      data: { courseId: courseEnglish.id, edition: '外研社2024', isbn: '97875600123456', price: 12.50, supplierId: supplierC.id },
    })
    const tb_sci_2024 = await tx.textbook.create({
      data: { courseId: courseScience.id, edition: '人教版2024', isbn: '9787107987654', price: 11.20, supplierId: supplierA.id },
    })
    console.log('  ✅ 教材版本数据：5种版本')

    const TERM = '2025秋季'

    async function createOrder(
      classId: string, gradeId: string, textbookId: string, qty: number, operator: string
    ) {
      return tx.order.create({
        data: {
          term: TERM,
          gradeId,
          classId,
          textbookId,
          originalQty: qty,
          finalQty: qty,
          status: 'SUBMITTED',
          changes: {
            create: { changeType: 'INITIAL', beforeQty: 0, afterQty: qty, operator, reason: '初始征订' },
          },
        },
      })
    }

    const order1 = await createOrder(class1_1.id, grade1.id, tb_chn_2024.id, 45, '教务-王主任')
    const order2 = await createOrder(class1_1.id, grade1.id, tb_math_2024.id, 45, '教务-王主任')
    const order3 = await createOrder(class1_1.id, grade1.id, tb_eng_2024.id, 45, '教务-王主任')
    const order4 = await createOrder(class1_2.id, grade1.id, tb_chn_2024.id, 46, '教务-王主任')
    const order5 = await createOrder(class1_2.id, grade1.id, tb_math_2024.id, 46, '教务-王主任')
    const order6 = await createOrder(class1_2.id, grade1.id, tb_eng_2024.id, 46, '教务-王主任')
    const order7 = await createOrder(class2_1.id, grade2.id, tb_chn_2024.id, 44, '教务-王主任')
    const order8 = await createOrder(class2_1.id, grade2.id, tb_math_2024.id, 44, '教务-王主任')
    const order9 = await createOrder(class2_1.id, grade2.id, tb_eng_2024.id, 44, '教务-王主任')
    const order10 = await createOrder(class2_1.id, grade2.id, tb_sci_2024.id, 44, '教务-王主任')
    const order11 = await createOrder(class3_1.id, grade3.id, tb_chn_2025.id, 48, '教务-王主任')
    const order12 = await createOrder(class3_1.id, grade3.id, tb_math_2024.id, 48, '教务-王主任')
    const order13 = await createOrder(class3_1.id, grade3.id, tb_eng_2024.id, 48, '教务-王主任')
    const order14 = await createOrder(class3_1.id, grade3.id, tb_sci_2024.id, 48, '教务-王主任')
    console.log('  ✅ 初始订单：14条')

    const transfer1 = await tx.transferStudent.create({
      data: { classId: class1_1.id, name: '新转学生1', studentNo: 'TS2025001', transferType: 'IN', transferDate: new Date('2025-08-25'), remark: '从其他学校转入' },
    })
    const transfer2 = await tx.transferStudent.create({
      data: { classId: class1_1.id, name: '新转学生2', studentNo: 'TS2025002', transferType: 'IN', transferDate: new Date('2025-08-28'), remark: '学区调整转入' },
    })
    const transfer3 = await tx.transferStudent.create({
      data: { classId: class2_1.id, name: '转出学生A', studentNo: 'TS2025003', transferType: 'OUT', transferDate: new Date('2025-08-20'), remark: '移民国外' },
    })
    console.log('  ✅ 转学生：2转入1转出')

    const supplementChange1 = await tx.orderChange.create({
      data: {
        orderId: order1.id,
        changeType: 'SUPPLEMENT',
        beforeQty: 45,
        afterQty: 47,
        operator: '教务-王主任',
        reason: '转学生补订',
        transferIds: `${transfer1.id},${transfer2.id}`,
      },
    })
    await tx.order.update({
      where: { id: order1.id },
      data: { supplementQty: 2, finalQty: 47 },
    })
    await tx.orderChangeTransfer.create({
      data: { orderChangeId: supplementChange1.id, transferStudentId: transfer1.id },
    })
    await tx.orderChangeTransfer.create({
      data: { orderChangeId: supplementChange1.id, transferStudentId: transfer2.id },
    })
    console.log('  ✅ 补订记录：一(1)班语文补2本（关联转学生）')

    const supplementChange2 = await tx.orderChange.create({
      data: {
        orderId: order2.id,
        changeType: 'SUPPLEMENT',
        beforeQty: 45,
        afterQty: 47,
        operator: '教务-王主任',
        reason: '转学生补订',
      },
    })
    await tx.order.update({
      where: { id: order2.id },
      data: { supplementQty: 2, finalQty: 47 },
    })
    console.log('  ✅ 补订记录：一(1)班数学补2本')

    const returnChange = await tx.orderChange.create({
      data: {
        orderId: order7.id,
        changeType: 'RETURN',
        beforeQty: 44,
        afterQty: 43,
        operator: '教务-王主任',
        reason: '临时退课1人',
      },
    })
    await tx.order.update({
      where: { id: order7.id },
      data: { returnQty: 1, finalQty: 43 },
    })
    console.log('  ✅ 退订记录：二(1)班语文退1本（临时退课）')

    const delivery1 = await tx.delivery.create({
      data: { supplierId: supplierA.id, deliveryNo: 'DLV20250830001', deliveryDate: new Date('2025-08-30'), remark: '首批到货' },
    })
    await tx.deliveryItem.createMany({
      data: [
        { deliveryId: delivery1.id, orderId: order1.id, textbookId: tb_chn_2024.id, qty: 45, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery1.id, orderId: order4.id, textbookId: tb_chn_2024.id, qty: 46, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery1.id, orderId: order7.id, textbookId: tb_chn_2024.id, qty: 43, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery1.id, orderId: order10.id, textbookId: tb_sci_2024.id, qty: 40, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery1.id, orderId: order14.id, textbookId: tb_sci_2024.id, qty: 45, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
      ],
    })
    await tx.order.update({ where: { id: order1.id }, data: { deliveredQty: 45, status: 'PARTIAL_DELIVERED' } })
    await tx.order.update({ where: { id: order4.id }, data: { deliveredQty: 46, status: 'DELIVERED' } })
    await tx.order.update({ where: { id: order7.id }, data: { deliveredQty: 43, status: 'DELIVERED' } })
    await tx.order.update({ where: { id: order10.id }, data: { deliveredQty: 40, status: 'PARTIAL_DELIVERED' } })
    await tx.order.update({ where: { id: order14.id }, data: { deliveredQty: 45, status: 'PARTIAL_DELIVERED' } })
    console.log('  ✅ 供应商A到货：语文、科学（含缺书）')

    const delivery2 = await tx.delivery.create({
      data: { supplierId: supplierB.id, deliveryNo: 'DLV20250830002', deliveryDate: new Date('2025-08-30'), remark: '数学教材' },
    })
    await tx.deliveryItem.createMany({
      data: [
        { deliveryId: delivery2.id, orderId: order2.id, textbookId: tb_math_2024.id, qty: 47, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery2.id, orderId: order5.id, textbookId: tb_math_2024.id, qty: 46, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery2.id, orderId: order8.id, textbookId: tb_math_2024.id, qty: 44, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
        { deliveryId: delivery2.id, orderId: order12.id, textbookId: tb_math_2024.id, qty: 48, confirmed: true, confirmedBy: '库房-老孙', confirmedAt: new Date() },
      ],
    })
    await tx.order.update({ where: { id: order2.id }, data: { deliveredQty: 47, status: 'DELIVERED' } })
    await tx.order.update({ where: { id: order5.id }, data: { deliveredQty: 46, status: 'DELIVERED' } })
    await tx.order.update({ where: { id: order8.id }, data: { deliveredQty: 44, status: 'DELIVERED' } })
    await tx.order.update({ where: { id: order12.id }, data: { deliveredQty: 48, status: 'DELIVERED' } })
    console.log('  ✅ 供应商B到货：数学全部到齐')

    const receipt1 = await tx.receipt.create({
      data: {
        classId: class1_2.id, receiptNo: 'REC20250830001', receiptDate: new Date('2025-08-30'),
        status: 'COMPLETED', signedBy: '李老师', signedAt: new Date('2025-08-30T14:30:00'),
      },
    })
    await tx.receiptItem.createMany({
      data: [
        { receiptId: receipt1.id, orderId: order4.id, textbookId: tb_chn_2024.id, expectedQty: 46, actualQty: 46, shortageQty: 0, isTransfer: false },
        { receiptId: receipt1.id, orderId: order5.id, textbookId: tb_math_2024.id, expectedQty: 46, actualQty: 46, shortageQty: 0, isTransfer: false },
      ],
    })
    await tx.order.update({ where: { id: order4.id }, data: { receivedQty: 46 } })
    await tx.order.update({ where: { id: order5.id }, data: { receivedQty: 46 } })
    console.log('  ✅ 签收记录：一(2)班 语文+数学 班主任已签收')

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     🎉 种子数据插入完成                        ║
╠══════════════════════════════════════════════════════════════╣
║  学期: ${TERM}                                                ║
║  年级: 3个 | 班级: 4个 | 课程: 4个                            ║
║  教材版本: 5种 | 供应商: 3家                                  ║
║  订单: 14条 | 补订: 2次 | 退订: 1次                           ║
║  到货批次: 2批 | 签收: 1次 | 转学生: 3人                      ║
╚══════════════════════════════════════════════════════════════╝
    `)
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
