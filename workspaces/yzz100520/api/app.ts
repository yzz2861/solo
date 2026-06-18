/**
 * 校园用水漏损图 - API Server
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
import { initStore } from './data/store.js'
import buildings from './routes/buildings.js'
import waterReadings from './routes/waterReadings.js'
import occupancy from './routes/occupancy.js'
import repairs from './routes/repairs.js'
import holidays from './routes/holidays.js'
import anomaly from './routes/anomaly.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
initStore()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/buildings', buildings)
app.use('/api/water-readings', waterReadings)
app.use('/api/occupancy', occupancy)
app.use('/api/repairs', repairs)
app.use('/api/holidays', holidays)
app.use('/api/anomaly', anomaly)

app.use(
  '/api/health',
  (req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message,
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
