import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import type { Specimen, BorrowRecord, BorrowPurpose, BorrowValidation } from '@/types'
import {
  BookOpen,
  Plus,
  Search,
  Printer,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  ChevronDown,
  FileText,
} from 'lucide-react'

type TabKey = 'register' | 'records'

const PURPOSES: BorrowPurpose[] = ['课程', '科研', '拍照']

function BorrowRegistration() {
  const specimens = useStore((s) => s.specimens)
  const validateBorrow = useStore((s) => s.validateBorrow)
  const addBorrowRecord = useStore((s) => s.addBorrowRecord)
  const role = useStore((s) => s.role)

  const [specimenSearch, setSpecimenSearch] = useState('')
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null)
  const [validation, setValidation] = useState<BorrowValidation | null>(null)
  const [borrower, setBorrower] = useState('')
  const [purpose, setPurpose] = useState<BorrowPurpose>('课程')
  const [photoRequest, setPhotoRequest] = useState(false)
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [showConfirmWarning, setShowConfirmWarning] = useState(false)
  const [successRecord, setSuccessRecord] = useState<BorrowRecord | null>(null)

  const availableSpecimens = useMemo(
    () =>
      specimens.filter(
        (s) => s.status === '在馆' && s.pressingStatus === '正常' && s.preciousLevel === '普通'
      ),
    [specimens]
  )

  const filteredSpecimens = useMemo(() => {
    const q = specimenSearch.trim().toLowerCase()
    if (!q) return availableSpecimens
    return availableSpecimens.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.family.toLowerCase().includes(q) ||
        s.genus.toLowerCase().includes(q) ||
        s.collectionSite.toLowerCase().includes(q)
    )
  }, [availableSpecimens, specimenSearch])

  const handleSelectSpecimen = (specimen: Specimen) => {
    setSelectedSpecimen(specimen)
    const v = validateBorrow(specimen.id)
    setValidation(v)
  }

  const hasErrors = validation ? validation.errors.length > 0 : false
  const hasWarnings = validation ? validation.warnings.length > 0 : false
  const formValid = borrower.trim() !== '' && expectedReturnDate !== '' && !hasErrors

  const handleSubmit = () => {
    if (!selectedSpecimen || !formValid) return
    if (hasWarnings && !showConfirmWarning) {
      setShowConfirmWarning(true)
      return
    }
    const record = addBorrowRecord({
      specimenId: selectedSpecimen.id,
      specimenCode: selectedSpecimen.code,
      borrower: borrower.trim(),
      purpose,
      photoRequest,
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate,
    })
    if (record) {
      setSuccessRecord(record)
      setBorrower('')
      setPurpose('课程')
      setPhotoRequest(false)
      setExpectedReturnDate('')
      setSelectedSpecimen(null)
      setValidation(null)
      setShowConfirmWarning(false)
    }
  }

  const handlePrintSlip = () => {
    if (!successRecord) return
    const specimen = specimens.find((s) => s.id === successRecord.specimenId)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>借阅单</title>
<style>
  body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
  h1{text-align:center;font-size:20px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  td,th{border:1px solid #333;padding:8px 12px;text-align:left;font-size:14px}
  th{width:120px;background:#f5f5f5;font-weight:600}
  .sign-area{margin-top:40px;display:flex;justify-content:space-between}
  .sign-line{border-top:1px solid #333;width:180px;text-align:center;padding-top:4px;font-size:13px}
</style></head><body>
<h1>植物标本借阅单</h1>
<table>
<tr><th>标本编号</th><td>${successRecord.specimenCode}</td></tr>
<tr><th>科/属</th><td>${specimen ? specimen.family + ' / ' + specimen.genus : ''}</td></tr>
<tr><th>借阅人</th><td>${successRecord.borrower}</td></tr>
<tr><th>用途</th><td>${successRecord.purpose}</td></tr>
<tr><th>拍照申请</th><td>${successRecord.photoRequest ? '是' : '否'}</td></tr>
<tr><th>借出日期</th><td>${successRecord.borrowDate}</td></tr>
<tr><th>预计归还</th><td>${successRecord.expectedReturnDate}</td></tr>
</table>
<div class="sign-area">
<div class="sign-line">借阅人签名</div>
<div class="sign-line">管理员签名</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    w.document.close()
  }

  if (role === '修复师') {
    return (
      <div className="text-center py-16 text-forest-600">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
        <p className="text-lg font-medium">修复师无借阅登记权限</p>
        <p className="text-sm text-sand-500 mt-1">请切换至借阅记录查看</p>
      </div>
    )
  }

  if (successRecord) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
        <h3 className="text-lg font-semibold text-forest-800 mb-2">借阅登记成功</h3>
        <p className="text-sm text-sand-600 mb-1">标本编号：{successRecord.specimenCode}</p>
        <p className="text-sm text-sand-600 mb-1">借阅人：{successRecord.borrower}</p>
        <p className="text-sm text-sand-600 mb-6">预计归还：{successRecord.expectedReturnDate}</p>
        <div className="flex gap-3 justify-center">
          <button className="btn-secondary" onClick={() => setSuccessRecord(null)}>
            继续借阅
          </button>
          <button className="btn-primary" onClick={handlePrintSlip}>
            <Printer className="w-4 h-4 inline mr-1" />
            打印借阅单
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-forest-700 mb-3">选择标本</h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
          <input
            className="input-field pl-9"
            placeholder="搜索编号、科、属、采集地..."
            value={specimenSearch}
            onChange={(e) => setSpecimenSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto space-y-2">
          {filteredSpecimens.length === 0 && (
            <p className="text-sm text-sand-400 text-center py-8">暂无可借阅标本</p>
          )}
          {filteredSpecimens.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedSpecimen?.id === s.id
                  ? 'border-forest-400 bg-forest-50'
                  : 'border-sand-200 hover:border-sand-300 hover:bg-sand-50'
              }`}
              onClick={() => handleSelectSpecimen(s)}
            >
              <p className="text-sm font-mono font-semibold text-forest-800">{s.code}</p>
              <p className="text-xs text-sand-600 mt-0.5">
                {s.family} / {s.genus}
              </p>
              <p className="text-xs text-sand-500">{s.collectionSite}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-forest-700 mb-3">借阅信息</h3>
        {!selectedSpecimen ? (
          <div className="text-center py-16 text-sand-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">请先在左侧选择标本</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-sand-50 border border-sand-200">
              <p className="text-sm font-mono font-semibold text-forest-800">
                {selectedSpecimen.code}
              </p>
              <p className="text-xs text-sand-600">
                {selectedSpecimen.family} / {selectedSpecimen.genus}
              </p>
              <p className="text-xs text-sand-500">{selectedSpecimen.collectionSite}</p>
            </div>

            {validation && validation.errors.length > 0 && (
              <div className="space-y-1">
                {validation.errors.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}

            {validation && validation.warnings.length > 0 && (
              <div className="space-y-1">
                {validation.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="label-text">借阅人 *</label>
              <input
                className="input-field"
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                placeholder="请输入借阅人姓名"
              />
            </div>

            <div>
              <label className="label-text">用途</label>
              <div className="relative">
                <select
                  className="select-field"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as BorrowPurpose)}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="photo-request"
                type="checkbox"
                className="w-4 h-4 rounded border-sand-300 text-forest-500 focus:ring-forest-400"
                checked={photoRequest}
                onChange={(e) => setPhotoRequest(e.target.checked)}
              />
              <label htmlFor="photo-request" className="text-sm text-forest-700">
                申请拍照
              </label>
            </div>

            <div>
              <label className="label-text">预计归还日期 *</label>
              <input
                type="date"
                className="input-field"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
              />
            </div>

            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={!formValid}
              onClick={handleSubmit}
            >
              <Plus className="w-4 h-4" />
              提交借阅
            </button>
          </div>
        )}

        {showConfirmWarning && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-forest-800 mb-2">确认借阅</h3>
              <p className="text-sm text-amber-600 mb-4">
                该标本存在以下警告，是否确认借阅？
              </p>
              <ul className="text-sm text-sand-600 mb-4 list-disc pl-4">
                {validation?.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setShowConfirmWarning(false)}
                >
                  取消
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    setShowConfirmWarning(false)
                    handleSubmit()
                  }}
                >
                  确认借阅
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReturnModal({
  record,
  onClose,
}: {
  record: BorrowRecord
  onClose: () => void
}) {
  const returnBorrowRecord = useStore((s) => s.returnBorrowRecord)
  const specimens = useStore((s) => s.specimens)
  const [labelOk, setLabelOk] = useState(true)
  const [pressingOk, setPressingOk] = useState(true)
  const [specimenOk, setSpecimenOk] = useState(true)
  const [returnNotes, setReturnNotes] = useState('')

  const specimen = specimens.find((s) => s.id === record.specimenId)
  const hasDamage = !labelOk || !pressingOk || !specimenOk

  const handleSubmit = () => {
    if (hasDamage && !returnNotes.trim()) return
    returnBorrowRecord(record.id, { labelOk, pressingOk, specimenOk }, returnNotes.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-forest-800">归还标本</h3>
          <button onClick={onClose} className="text-sand-400 hover:text-sand-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-sand-50 border border-sand-200 mb-4">
          <p className="text-sm font-mono font-semibold text-forest-800">{record.specimenCode}</p>
          {specimen && (
            <p className="text-xs text-sand-600">
              {specimen.family} / {specimen.genus}
            </p>
          )}
          <p className="text-xs text-sand-500">
            借阅人：{record.borrower} | 借出日期：{record.borrowDate}
          </p>
        </div>

        <p className="label-text mb-2">归还检查</p>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-forest-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-sand-300 text-forest-500 focus:ring-forest-400"
              checked={labelOk}
              onChange={(e) => setLabelOk(e.target.checked)}
            />
            标签完好
          </label>
          <label className="flex items-center gap-2 text-sm text-forest-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-sand-300 text-forest-500 focus:ring-forest-400"
              checked={pressingOk}
              onChange={(e) => setPressingOk(e.target.checked)}
            />
            压片完好
          </label>
          <label className="flex items-center gap-2 text-sm text-forest-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-sand-300 text-forest-500 focus:ring-forest-400"
              checked={specimenOk}
              onChange={(e) => setSpecimenOk(e.target.checked)}
            />
            标本完好
          </label>
        </div>

        {hasDamage && (
          <div className="mb-4">
            <label className="label-text">损坏说明 *</label>
            <textarea
              className="input-field min-h-[80px]"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="请描述损坏情况..."
            />
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary flex-1"
            onClick={handleSubmit}
            disabled={hasDamage && !returnNotes.trim()}
          >
            确认归还
          </button>
        </div>
      </div>
    </div>
  )
}

function BorrowRecords() {
  const borrowRecords = useStore((s) => s.borrowRecords)
  const specimens = useStore((s) => s.specimens)
  const returnBorrowRecord = useStore((s) => s.returnBorrowRecord)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'全部' | '借出中' | '已归还' | '逾期'>('全部')
  const [purposeFilter, setPurposeFilter] = useState<'全部' | BorrowPurpose>('全部')
  const [returnRecord, setReturnRecord] = useState<BorrowRecord | null>(null)

  const filteredRecords = useMemo(() => {
    return borrowRecords.filter((r) => {
      const q = search.trim().toLowerCase()
      if (q && !r.borrower.toLowerCase().includes(q) && !r.specimenCode.toLowerCase().includes(q))
        return false
      if (statusFilter !== '全部' && r.status !== statusFilter) return false
      if (purposeFilter !== '全部' && r.purpose !== purposeFilter) return false
      return true
    })
  }, [borrowRecords, search, statusFilter, purposeFilter])

  const statusBadge = (status: BorrowRecord['status']) => {
    const map: Record<string, string> = {
      借出中: 'bg-blue-100 text-blue-700',
      已归还: 'bg-emerald-100 text-emerald-700',
      逾期: 'bg-red-100 text-red-700',
    }
    return <span className={`badge ${map[status] ?? ''}`}>{status}</span>
  }

  const handlePrint = (record: BorrowRecord) => {
    const specimen = specimens.find((s) => s.id === record.specimenId)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>借阅单</title>
<style>
  body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
  h1{text-align:center;font-size:20px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  td,th{border:1px solid #333;padding:8px 12px;text-align:left;font-size:14px}
  th{width:120px;background:#f5f5f5;font-weight:600}
  .sign-area{margin-top:40px;display:flex;justify-content:space-between}
  .sign-line{border-top:1px solid #333;width:180px;text-align:center;padding-top:4px;font-size:13px}
</style></head><body>
<h1>植物标本借阅单</h1>
<table>
<tr><th>标本编号</th><td>${record.specimenCode}</td></tr>
<tr><th>科/属</th><td>${specimen ? specimen.family + ' / ' + specimen.genus : ''}</td></tr>
<tr><th>借阅人</th><td>${record.borrower}</td></tr>
<tr><th>用途</th><td>${record.purpose}</td></tr>
<tr><th>拍照申请</th><td>${record.photoRequest ? '是' : '否'}</td></tr>
<tr><th>借出日期</th><td>${record.borrowDate}</td></tr>
<tr><th>预计归还</th><td>${record.expectedReturnDate}</td></tr>
${record.returnDate ? `<tr><th>实际归还</th><td>${record.returnDate}</td></tr>` : ''}
</table>
<div class="sign-area">
<div class="sign-line">借阅人签名</div>
<div class="sign-line">管理员签名</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    w.document.close()
  }

  return (
    <div>
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
              <input
                className="input-field pl-9"
                placeholder="搜索借阅人或标本编号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-36">
            <div className="relative">
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="全部">全部状态</option>
                <option value="借出中">借出中</option>
                <option value="已归还">已归还</option>
                <option value="逾期">逾期</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-32">
            <div className="relative">
              <select
                className="select-field"
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value as typeof purposeFilter)}
              >
                <option value="全部">全部用途</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand-50 border-b border-sand-200">
                <th className="px-4 py-3 text-left font-medium text-forest-700">标本编号</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">借阅人</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">用途</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">拍照申请</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">借出日期</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">预计归还</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">实际归还</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-forest-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sand-400">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    暂无借阅记录
                  </td>
                </tr>
              )}
              {filteredRecords.map((r) => (
                <tr key={r.id} className="border-b border-sand-100 hover:bg-sand-50">
                  <td className="px-4 py-3 font-mono text-forest-800">{r.specimenCode}</td>
                  <td className="px-4 py-3">{r.borrower}</td>
                  <td className="px-4 py-3">{r.purpose}</td>
                  <td className="px-4 py-3">{r.photoRequest ? '是' : '否'}</td>
                  <td className="px-4 py-3">{r.borrowDate}</td>
                  <td className="px-4 py-3">{r.expectedReturnDate}</td>
                  <td className="px-4 py-3">{r.returnDate ?? '-'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(r.status === '借出中' || r.status === '逾期') && (
                        <button
                          className="text-xs px-2 py-1 rounded bg-forest-50 text-forest-600 hover:bg-forest-100 transition-colors"
                          onClick={() => setReturnRecord(r)}
                        >
                          归还
                        </button>
                      )}
                      <button
                        className="text-xs px-2 py-1 rounded bg-sand-50 text-sand-600 hover:bg-sand-100 transition-colors"
                        onClick={() => handlePrint(r)}
                      >
                        <Printer className="w-3 h-3 inline" />
                        打印
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {returnRecord && (
        <ReturnModal record={returnRecord} onClose={() => setReturnRecord(null)} />
      )}
    </div>
  )
}

export default function BorrowsPage() {
  const role = useStore((s) => s.role)
  const defaultTab: TabKey = role === '修复师' ? 'records' : 'register'
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab)

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { key: 'register', label: '借阅登记', icon: <Plus className="w-4 h-4" />, hidden: role === '修复师' },
    { key: 'records', label: '借阅记录', icon: <Clock className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-sand-200">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.key}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-forest-500 text-forest-700'
                  : 'border-transparent text-sand-500 hover:text-forest-600'
              }`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </div>

      {activeTab === 'register' && <BorrowRegistration />}
      {activeTab === 'records' && <BorrowRecords />}
    </div>
  )
}
