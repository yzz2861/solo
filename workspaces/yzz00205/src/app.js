const express = require('express')
const subsidyRoutes = require('./routes/subsidy')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

app.use('/api/subsidy', subsidyRoutes)

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'legal-aid-subsidy-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  })
})

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '法援案件补贴核算API',
      description: '规则判断、异常解释与处理留痕一体化接口',
      version: '1.0.0',
      endpoints: [
        { method: 'POST', path: '/api/subsidy/calculate', description: '补贴核算主接口' },
        { method: 'GET', path: '/api/subsidy/audit/:auditNo', description: '查询审计详情' },
        { method: 'GET', path: '/api/subsidy/audit/:auditNo/replay', description: '数据回放' },
        { method: 'GET', path: '/api/subsidy/business/:businessNo/history', description: '业务历史记录' },
        { method: 'GET', path: '/api/subsidy/audits', description: '审计列表' },
        { method: 'POST', path: '/api/subsidy/audit/:auditNo/review', description: '人工复核' },
        { method: 'GET', path: '/health', description: '健康检查' }
      ]
    }
  })
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: '接口不存在',
    path: req.path
  })
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: '系统内部错误'
  })
})

app.listen(PORT, () => {
  console.log(`====================================`)
  console.log(`  法援案件补贴核算API 已启动`)
  console.log(`  服务地址: http://localhost:${PORT}`)
  console.log(`  启动时间: ${new Date().toISOString()}`)
  console.log(`====================================`)
})

module.exports = app
