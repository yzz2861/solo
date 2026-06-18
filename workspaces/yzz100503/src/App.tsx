import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import Layout from '@/components/Layout'
import ReceptionView from '@/views/ReceptionView'
import EditorView from '@/views/EditorView'
import CustomerView from '@/views/CustomerView'
import AlertToast from '@/components/AlertToast'

export default function App() {
  const { currentRole, init, isLoading, tapes, addAlert, alerts } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    init().finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    const checkFilePaths = async () => {
      for (const tape of tapes) {
        if (!tape.videoFilePath) continue
        const exists = await window.electronAPI.checkFileExists(tape.videoFilePath)
        if (!exists) {
          const existingAlert = alerts.find(
            (a) => a.type === 'path_invalid' && a.tapeId === tape.id && !a.read
          )
          if (!existingAlert) {
            addAlert({
              type: 'path_invalid',
              level: 'error',
              title: '文件路径失效',
              message: `磁带「${tape.title}」(${tape.tapeNumber})的转录文件路径已失效，请检查文件是否被移动或删除。`,
              tapeId: tape.id,
              customerId: tape.customerId
            })
          }
        }
      }
    }
    checkFilePaths()
  }, [ready, tapes.length])

  if (!ready || isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-warm-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">家庭影像转录柜</h2>
          <p className="text-gray-500 mt-1">正在加载数据...</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentRole) {
      case 'reception':
        return <ReceptionView />
      case 'editor':
        return <EditorView />
      case 'customer':
        return <CustomerView />
      default:
        return <ReceptionView />
    }
  }

  return (
    <Layout>
      {renderView()}
      <AlertToast />
    </Layout>
  )
}
