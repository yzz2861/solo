import app from './app.js'
import { initDb } from './db/database.js'

const PORT = 5174

const startServer = async (): Promise<void> => {
  try {
    console.log('Initializing database...')
    await initDb()
    console.log('Database initialized successfully.')

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
