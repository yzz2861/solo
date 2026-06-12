import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import './database/init.js'

import adminRoutes from './routes/admin.js'
import elderlyRoutes from './routes/elderly.js'
import caseRoutes from './routes/cases.js'
import analyticsRoutes from './routes/analytics.js'
import socialWorkerRoutes from './routes/socialWorker.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/admin', adminRoutes)
app.use('/api/elderly', elderlyRoutes)
app.use('/api/cases', caseRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/social-worker', socialWorkerRoutes)

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
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
