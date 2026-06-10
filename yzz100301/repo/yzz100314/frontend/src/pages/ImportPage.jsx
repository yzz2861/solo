import React, { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'

function UploadCard({ title, description, icon, accept, onUpload, result, type }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    
    setUploading(true)
    try {
      const res = await onUpload(file)
    } catch (err) {
      // 错误由父组件处理
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    handleFile(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={`upload-card ${dragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="upload-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <p style={{ marginTop: '8px', fontSize: '11px' }}>
        支持格式：{accept}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
      />
      {uploading && <div className="upload-result">上传中...</div>}
      {result && !uploading && (
        <div className={`upload-result ${result.error ? 'error' : ''}`}>
          {result.error ? result.error : result.message}
        </div>
      )}
    </div>
  )
}

function ImportPage() {
  const [results, setResults] = useState({})
  const [batches, setBatches] = useState([])

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      const data = await api.getBatches()
      setBatches(data)
    } catch (err) {
      console.error('加载批次失败:', err)
    }
  }

  const handleImportTickets = async (file) => {
    try {
      const res = await api.importTicketsCsv(file)
      setResults(prev => ({
        ...prev,
        tickets: {
          message: `成功导入 ${res.inserted} 条，跳过 ${res.skipped} 条`,
          error: null,
        },
      }))
      loadBatches()
      return res
    } catch (err) {
      setResults(prev => ({
        ...prev,
        tickets: { message: '', error: err.message },
      }))
      throw err
    }
  }

  const handleImportEscalations = async (file) => {
    try {
      const res = await api.importEscalationsJson(file)
      setResults(prev => ({
        ...prev,
        escalations: {
          message: `成功导入 ${res.inserted} 条，跳过 ${res.skipped} 条`,
          error: null,
        },
      }))
      loadBatches()
      return res
    } catch (err) {
      setResults(prev => ({
        ...prev,
        escalations: { message: '', error: err.message },
      }))
      throw err
    }
  }

  const handleImportSupplements = async (file) => {
    try {
      const res = await api.importSupplements(file)
      setResults(prev => ({
        ...prev,
        supplements: {
          message: `回复记录 ${res.reply_inserted} 条，工单新增 ${res.ticket_inserted} 条`,
          error: null,
        },
      }))
      loadBatches()
      return res
    } catch (err) {
      setResults(prev => ({
        ...prev,
        supplements: { message: '', error: err.message },
      }))
      throw err
    }
  }

  const getBatchTypeLabel = (type) => {
    const map = {
      tickets: '系统工单CSV',
      escalations: '升级记录JSON',
      supplements: '人工补录表',
    }
    return map[type] || type
  }

  return (
    <div>
      <div className="page-header">
        <h1>数据导入</h1>
        <p>支持导入系统工单CSV、升级记录JSON、人工补录表，同一批数据重复导入不会产生重复记录</p>
      </div>

      <div className="card">
        <div className="card-title">上传数据文件</div>
        <div className="upload-section">
          <UploadCard
            title="系统工单 CSV"
            description="从客服系统导出的工单列表文件"
            icon="📋"
            accept=".csv"
            onUpload={handleImportTickets}
            result={results.tickets}
            type="tickets"
          />
          <UploadCard
            title="升级记录 JSON"
            description="工单升级流转记录文件"
            icon="🔄"
            accept=".json"
            onUpload={handleImportEscalations}
            result={results.escalations}
            type="escalations"
          />
          <UploadCard
            title="人工补录表"
            description="人工补录的回复/处理记录"
            icon="📝"
            accept=".csv,.json"
            onUpload={handleImportSupplements}
            result={results.supplements}
            type="supplements"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>导入批次记录</span>
          <button className="btn btn-small btn-default" onClick={loadBatches}>
            刷新
          </button>
        </div>
        {batches.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>批次ID</th>
                <th>类型</th>
                <th>文件名</th>
                <th>导入时间</th>
                <th>记录数</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id}>
                  <td style={{ fontSize: '12px', color: '#909399' }}>{batch.id}</td>
                  <td>
                    <span className="tag tag-info">{getBatchTypeLabel(batch.batch_type)}</span>
                  </td>
                  <td>{batch.file_name}</td>
                  <td>{new Date(batch.import_time).toLocaleString('zh-CN')}</td>
                  <td>{batch.record_count}</td>
                  <td>
                    <span className="tag tag-success">{batch.status === 'completed' ? '已完成' : batch.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">暂无导入记录</div>
        )}
      </div>

      <div className="card">
        <div className="card-title">字段说明</div>
        <div style={{ fontSize: '13px', color: '#606266', lineHeight: '1.8' }}>
          <p><strong>系统工单CSV必需字段：</strong>工单号、创建时间、标题、优先级</p>
          <p><strong>升级记录JSON必需字段：</strong>ticket_no / 工单号、escalation_time / 升级时间</p>
          <p><strong>人工补录表必需字段：</strong>工单号、回复时间（可同时含创建时间等）</p>
          <p style={{ marginTop: '8px', color: '#909399' }}>
            💡 提示：系统会自动根据工单号去重，同一批数据重复导入不会产生重复记录。
            时间格式支持：YYYY-MM-DD HH:mm:ss、YYYY/MM/DD 等多种格式。
          </p>
        </div>
      </div>
    </div>
  )
}

export default ImportPage
