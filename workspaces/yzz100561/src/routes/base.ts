import { Router, Request, Response } from 'express'
import prisma from '../prisma'

const router = Router()

router.get('/grades', async (req: Request, res: Response) => {
  try {
    const grades = await prisma.grade.findMany({
      include: { classes: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    res.json({ code: 0, data: grades })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/grades', async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    const grade = await prisma.grade.create({ data: { name } })
    res.json({ code: 0, data: grade })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/classes', async (req: Request, res: Response) => {
  try {
    const { gradeId } = req.query
    const where: any = {}
    if (gradeId) where.gradeId = gradeId
    const classes = await prisma.class.findMany({
      where,
      include: { grade: true, transfers: true },
      orderBy: [{ gradeId: 'asc' }, { name: 'asc' }],
    })
    res.json({ code: 0, data: classes })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/classes', async (req: Request, res: Response) => {
  try {
    const { name, gradeId, headTeacher, studentCount } = req.body
    const cls = await prisma.class.create({
      data: { name, gradeId, headTeacher, studentCount: studentCount || 0 },
      include: { grade: true },
    })
    res.json({ code: 0, data: cls })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/courses', async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { name: 'asc' },
    })
    res.json({ code: 0, data: courses })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/courses', async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    const course = await prisma.course.create({ data: { name } })
    res.json({ code: 0, data: course })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { textbooks: { include: { course: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ code: 0, data: suppliers })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { name, contact, phone } = req.body
    const supplier = await prisma.supplier.create({
      data: { name, contact, phone },
    })
    res.json({ code: 0, data: supplier })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.get('/textbooks', async (req: Request, res: Response) => {
  try {
    const { courseId, supplierId } = req.query
    const where: any = {}
    if (courseId) where.courseId = courseId
    if (supplierId) where.supplierId = supplierId
    const textbooks = await prisma.textbook.findMany({
      where,
      include: { course: true, supplier: true },
      orderBy: [{ courseId: 'asc' }, { edition: 'asc' }],
    })
    res.json({ code: 0, data: textbooks })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

router.post('/textbooks', async (req: Request, res: Response) => {
  try {
    const { courseId, edition, isbn, price, supplierId } = req.body
    const textbook = await prisma.textbook.create({
      data: {
        courseId,
        edition,
        isbn,
        price: price || 0,
        supplierId,
      },
      include: { course: true, supplier: true },
    })
    res.json({ code: 0, data: textbook })
  } catch (e: any) {
    res.status(400).json({ code: 1, message: e.message })
  }
})

export default router
