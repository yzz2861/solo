/**
 * 商家差评申诉助手 - API 服务器
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDb } from './db/index.js'

import projectRoutes from './routes/project.routes.js'
import materialRoutes from './routes/material.routes.js'
import evidenceRoutes from './routes/evidence.routes.js'
import summaryRoutes from './routes/summary.routes.js'
import exportRoutes from './routes/export.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

initDb().catch(err => console.error('Failed to initialize database:', err))

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/projects', projectRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/evidence', evidenceRoutes)
app.use('/api/summaries', summaryRoutes)
app.use('/api/export', exportRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: error.message || '服务器内部错误',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API 接口不存在',
  })
})

export default app
