import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import RoleSelectPage from '@/pages/RoleSelectPage'
import DashboardPage from '@/pages/DashboardPage'
import SpecimensPage from '@/pages/SpecimensPage'
import BorrowsPage from '@/pages/BorrowsPage'
import StatisticsPage from '@/pages/StatisticsPage'
import { useStore } from '@/store'

function App() {
  const specimens = useStore((s) => s.specimens)
  const addSpecimen = useStore((s) => s.addSpecimen)
  const addBorrowRecord = useStore((s) => s.addBorrowRecord)
  const returnBorrowRecord = useStore((s) => s.returnBorrowRecord)
  const updateOverdueRecords = useStore((s) => s.updateOverdueRecords)
  const borrowRecords = useStore((s) => s.borrowRecords)
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    if (specimens.length > 0 && borrowRecords.length > 0) {
      seeded.current = true
      return
    }
    if (specimens.length > 0) {
      seeded.current = true
      return
    }
    seeded.current = true

    const now = new Date()
    const daysAgo = (days: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - days)
      return d.toISOString().split('T')[0]
    }
    const daysAfter = (days: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() + days)
      return d.toISOString().split('T')[0]
    }

    const seedData = [
      { code: 'PE-0001', family: '菊科', genus: '蒲公英属', collectionSite: '北京香山', collector: '李明', collectionDate: '2024-05-12', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '常见药用植物标本' },
      { code: 'PE-0002', family: '兰科', genus: '杓兰属', collectionSite: '云南西双版纳', collector: '王芳', collectionDate: '2023-08-20', preciousLevel: '珍贵' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '国家二级保护植物' },
      { code: 'PE-0003', family: '蔷薇科', genus: '蔷薇属', collectionSite: '四川峨眉山', collector: '张伟', collectionDate: '2024-06-15', preciousLevel: '普通' as const, pressingStatus: '受潮' as const, status: '待修复' as const, notes: '压片受潮变形，需重新压制' },
      { code: 'PE-0004', family: '豆科', genus: '含羞草属', collectionSite: '广东广州', collector: '赵刚', collectionDate: '2024-09-03', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '教学常用标本' },
      { code: 'PE-0005', family: '禾本科', genus: '竹属', collectionSite: '浙江莫干山', collector: '孙丽', collectionDate: '2023-11-28', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '毛竹叶片标本' },
      { code: 'PE-0006', family: '木兰科', genus: '木兰属', collectionSite: '云南西双版纳', collector: '王芳', collectionDate: '2022-04-10', preciousLevel: '极珍贵' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '濒危物种，模式标本' },
      { code: 'PE-0007', family: '菊科', genus: '向日葵属', collectionSite: '北京香山', collector: '李明', collectionDate: '2024-07-22', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '栽培观赏品种' },
      { code: 'PE-0008', family: '唇形科', genus: '薄荷属', collectionSite: '四川峨眉山', collector: '张伟', collectionDate: '2024-05-30', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '芳香植物标本' },
      { code: 'PE-0009', family: '蔷薇科', genus: '苹果属', collectionSite: '陕西秦岭', collector: '陈静', collectionDate: '2023-10-15', preciousLevel: '普通' as const, pressingStatus: '受潮' as const, status: '待修复' as const, notes: '野苹果标本，压片受潮' },
      { code: 'PE-0010', family: '豆科', genus: '大豆属', collectionSite: '黑龙江哈尔滨', collector: '刘强', collectionDate: '2024-08-10', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '栽培大豆标本' },
      { code: 'PE-0011', family: '禾本科', genus: '稻属', collectionSite: '云南西双版纳', collector: '王芳', collectionDate: '2023-09-05', preciousLevel: '普通' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '野生稻标本' },
      { code: 'PE-0012', family: '兰科', genus: '石斛属', collectionSite: '广西桂林', collector: '赵刚', collectionDate: '2022-06-18', preciousLevel: '珍贵' as const, pressingStatus: '正常' as const, status: '在馆' as const, notes: '药用石斛标本' },
    ]

    const created: { id: string; code: string }[] = []
    seedData.forEach((d) => {
      const sp = addSpecimen(d)
      created.push({ id: sp.id, code: sp.code })
    })

    const borrowConfigs = [
      { code: 'PE-0001', borrower: '张老师', purpose: '课程' as const, photoRequest: false, borrowAgo: 30, returnAgo: 23, returned: true, labelOk: true, pressingOk: true, specimenOk: true },
      { code: 'PE-0001', borrower: '李老师', purpose: '课程' as const, photoRequest: true, borrowAgo: 20, returnAgo: 13, returned: true, labelOk: true, pressingOk: true, specimenOk: true },
      { code: 'PE-0001', borrower: '王老师', purpose: '科研' as const, photoRequest: false, borrowAgo: 10, returnAgo: 3, returned: true, labelOk: false, pressingOk: true, specimenOk: true },
      { code: 'PE-0004', borrower: '张老师', purpose: '课程' as const, photoRequest: false, borrowAgo: 5, expectedAfter: 7, returned: false },
      { code: 'PE-0005', borrower: '李老师', purpose: '拍照' as const, photoRequest: true, borrowAgo: 2, expectedAfter: 14, returned: false },
      { code: 'PE-0007', borrower: '陈老师', purpose: '课程' as const, photoRequest: false, borrowAgo: 15, expectedAfter: 10, returned: false },
      { code: 'PE-0008', borrower: '张老师', purpose: '课程' as const, photoRequest: true, borrowAgo: 25, expectedAfter: 20, returned: false },
    ]

    const createdRecords: { id: string; code: string }[] = []
    borrowConfigs.forEach((cfg) => {
      const sp = created.find((s) => s.code === cfg.code)
      if (!sp) return
      const borrowDate = daysAgo(cfg.borrowAgo)
      const expectedReturnDate = cfg.returned
        ? daysAgo(cfg.returnAgo! + 1)
        : daysAfter(cfg.expectedAfter!)

      const record = addBorrowRecord({
        specimenId: sp.id,
        specimenCode: sp.code,
        borrower: cfg.borrower,
        purpose: cfg.purpose,
        photoRequest: cfg.photoRequest,
        borrowDate,
        expectedReturnDate,
      })
      if (record) {
        createdRecords.push({ id: record.id, code: cfg.code })
      }
    })

    borrowConfigs.forEach((cfg, idx) => {
      if (cfg.returned) {
        const rec = createdRecords[idx]
        if (rec) {
          returnBorrowRecord(
            rec.id,
            { labelOk: cfg.labelOk!, pressingOk: cfg.pressingOk!, specimenOk: cfg.specimenOk! },
            cfg.labelOk && cfg.pressingOk && cfg.specimenOk ? '' : '归还时发现标签松动'
          )
        }
      }
    })

    updateOverdueRecords()
  }, [specimens.length, borrowRecords.length, addSpecimen, addBorrowRecord, returnBorrowRecord, updateOverdueRecords])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/specimens" element={<SpecimensPage />} />
          <Route path="/borrows" element={<BorrowsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
