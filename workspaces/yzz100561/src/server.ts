import express from 'express'
import cors from 'cors'
import baseRoutes from './routes/base'
import adminRoutes from './routes/admin'
import warehouseRoutes from './routes/warehouse'
import teacherRoutes from './routes/teacher'
import principalRoutes from './routes/principal'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ code: 0, message: '教材征订补订服务 API 运行正常', timestamp: new Date().toISOString() })
})

app.use('/api/base', baseRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/principal', principalRoutes)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err)
  res.status(500).json({ code: 1, message: err.message || '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           教材征订补订服务 API 已启动                          ║
╠══════════════════════════════════════════════════════════════╣
║  服务地址:  http://localhost:${PORT}                            ║
║  健康检查:  GET  /health                                      ║
╠══════════════════════════════════════════════════════════════╣
║  基础数据:  /api/base/*      (grades/classes/courses/...)     ║
║  教务端:    /api/admin/*     (报订/补订/退订/进度)              ║
║  库房端:    /api/warehouse/* (到货/待发/缺书清单/供应商差异)    ║
║  班主任:    /api/teacher/*   (签收/转学生)                     ║
║  校长端:    /api/principal/* (汇总/导出Excel)                  ║
╚══════════════════════════════════════════════════════════════╝
  `)
})
