import { useState } from 'react'
import { useTournament } from '@/store/tournament'
import type { TournamentState } from '@/types/tournament'
import { createEmptyState } from '@/types/tournament'
import { formatDateTime } from '@/utils/common'
import { isRoundCompleted, isRoundStarted } from '@/utils/pairing'

export function ArchivePanel() {
  const state = useTournament((s) => s.state)
  const saveToDisk = useTournament((s) => s.saveToDisk)
  const exportToFile = useTournament((s) => s.exportToFile)
  const importFromFile = useTournament((s) => s.importFromFile)
  const importData = useTournament((s) => s.importData)
  const reset = useTournament((s) => s.reset)
  const rounds = useTournament((s) => s.state.rounds)
  const tiebreaks = useTournament((s) => s.getTiebreaks())

  const [exportResult, setExportResult] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'export' | 'import' | null>(null)
  const [preview, setPreview] = useState<{ json: string } | null>(null)

  const activeCount = state.players.filter((p) => p.status === 'active').length
  const completedRounds = rounds.filter((r) => r.status === 'completed').length
  const inProgressRounds = rounds.filter((r) => r.status === 'in-progress').length
  const totalMatches = rounds.reduce((n, r) => n + r.matches.length, 0)
  const completedMatches = rounds.reduce(
    (n, r) => n + r.matches.filter((m) => m.result !== 'pending').length,
    0,
  )

  const doSave = async () => {
    setBusy('save')
    setSaveResult(null)
    const res = await saveToDisk()
    if (res.success) setSaveResult('✅ 已保存到本地用户数据目录')
    else setSaveResult('❌ 保存失败：' + (res.error ?? '未知错误'))
    setBusy(null)
  }

  const doExport = async () => {
    setBusy('export')
    setExportResult(null)
    const res = await exportToFile()
    if (res.canceled) setExportResult('⏸ 已取消导出')
    else if (res.success) setExportResult(`✅ 档案已保存到：${res.path}`)
    else setExportResult('❌ 导出失败：' + (res.error ?? '未知错误'))
    setBusy(null)
  }

  const doImport = async () => {
    setBusy('import')
    setImportResult(null)
    const res = await importFromFile()
    if (res.canceled) setImportResult('⏸ 已取消导入')
    else if (res.success) {
      setImportResult(`✅ 成功导入档案：${res.path ?? ''}`)
      location.reload()
    } else setImportResult('❌ 导入失败：' + (res.error ?? '未知错误'))
    setBusy(null)
  }

  const downloadSample = () => {
    const sample: TournamentState = {
      ...createEmptyState(),
      info: {
        ...state.info,
        name: '棋社周末快棋赛 - 示例',
        totalRounds: 5,
      },
    }
    const pList: [string, number, string][] = [
      ['张伟', 1950, '红星队'],
      ['李娜', 1880, '红星队'],
      ['王强', 1820, '蓝焰队'],
      ['刘洋', 1760, '蓝焰队'],
      ['陈明', 1720, '金鲨队'],
      ['赵雪', 1680, '金鲨队'],
      ['孙浩', 1650, '青锋队'],
      ['周敏', 1600, '青锋队'],
    ]
    sample.players = pList.map(([name, rating, team], i) => ({
      id: `P_SAMPLE_${i + 1}`,
      name,
      rating: rating as number,
      team,
      status: 'active',
      seed: i + 1,
    }))
    const blob = new Blob([JSON.stringify(sample, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '棋社赛事示例.ctm'
    a.click()
    URL.revokeObjectURL(url)
  }

  const buildJsonPreview = () => {
    const copy: TournamentState = JSON.parse(JSON.stringify(state))
    setPreview({ json: JSON.stringify(copy, null, 2) })
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <section className="card p-6">
        <h3 className="text-lg font-bold text-accent-dark mb-4">📊 当前赛事概况</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '赛事名称', value: state.info.name, color: 'text-stone-800' },
            { label: '比赛日期', value: state.info.date, color: 'text-stone-800' },
            { label: '有效选手', value: `${activeCount}/${state.players.length}`, color: 'text-accent-dark' },
            { label: '总轮次', value: `${completedRounds}/${state.info.totalRounds}`, color: 'text-green-700' },
            { label: '进行中轮次', value: String(inProgressRounds), color: 'text-blue-700' },
            { label: '总对局数', value: `${completedMatches}/${totalMatches}`, color: 'text-stone-700' },
            { label: '用时规则', value: state.info.timeControl || '-', color: 'text-stone-800' },
            { label: '积分领跑', value: tiebreaks[0] ? `${state.players.find(p=>p.id===tiebreaks[0].playerId)?.name ?? '-'} (${tiebreaks[0].score})` : '-', color: 'text-amber-700' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-md bg-stone-50 border border-stone-100">
              <div className="text-xs text-stone-500">{s.label}</div>
              <div className={`mt-1 font-bold truncate ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
          <div>创建时间：{formatDateTime(state.createdAt)}</div>
          <div>最后修改：{formatDateTime(state.updatedAt)}</div>
          <div>上次保存：{state.lastSavedAt ? formatDateTime(state.lastSavedAt as any) : '—'}</div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-bold text-accent-dark mb-4">💾 数据存储</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="btn-primary"
              onClick={doSave}
              disabled={busy === 'save'}
            >
              💾 立即保存到本地
            </button>
            <span className="text-xs text-stone-500">
              正常情况下每次操作后都会自动保存，此按钮用于断电前手动备份
            </span>
          </div>
          {saveResult && (
            <div className="text-sm text-stone-700 bg-stone-50 rounded p-2">
              {saveResult}
            </div>
          )}
          <div className="text-xs text-stone-500 bg-blue-50 p-3 rounded-md border border-blue-100">
            💡 <b>断电恢复：</b>所有数据会实时写入 <code>{`系统用户数据目录/tournament-data.json`}</code>，
            即使程序崩溃或断电，重启后会自动从该文件恢复。建议重要赛事同时导出 .ctm 档案。
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-bold text-accent-dark mb-4">📦 对阵档案导入导出</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <h4 className="font-bold text-green-800 mb-2">📤 导出档案</h4>
            <p className="text-xs text-stone-600 mb-3">
              将当前所有选手、对阵、成绩、设置打包为 <code>.ctm</code> 文件存档或发送。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary bg-green-600 hover:bg-green-700"
                onClick={doExport}
                disabled={busy === 'export'}
              >
                选择位置并导出
              </button>
              <button className="btn-outline" onClick={buildJsonPreview}>
                查看数据结构
              </button>
              <button className="btn-outline" onClick={downloadSample}>
                下载示例档案
              </button>
            </div>
            {exportResult && (
              <div className="mt-2 text-sm text-green-800">{exportResult}</div>
            )}
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h4 className="font-bold text-blue-800 mb-2">📥 导入档案</h4>
            <p className="text-xs text-stone-600 mb-3">
              加载此前保存的 <code>.ctm</code> 或 <code>.json</code> 档案，会覆盖当前所有数据。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={() => {
                  if (confirm('导入将覆盖当前赛事数据，是否继续？')) doImport()
                }}
                disabled={busy === 'import'}
              >
                选择文件并导入
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirm('确认清空所有当前赛事数据？')) {
                    reset()
                    setImportResult('已重置为空白赛事')
                  }
                }}
              >
                新建空白赛事
              </button>
            </div>
            {importResult && (
              <div className="mt-2 text-sm text-blue-800">{importResult}</div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h3 className="text-lg font-bold text-accent-dark mb-4">📜 各轮状态一览</h3>
        <div className="space-y-2">
          {rounds.length === 0 && (
            <div className="text-sm text-stone-400 py-4 text-center">
              尚未生成任何对阵轮次
            </div>
          )}
          {rounds.map((r) => {
            const done = isRoundCompleted(r)
            const started = isRoundStarted(r)
            const resultCount = r.matches.filter((m) => m.result !== 'pending').length
            return (
              <div
                key={r.number}
                className="flex items-center gap-3 p-3 rounded-md border border-stone-200 bg-white hover:bg-stone-50"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    done ? 'bg-green-500' : started ? 'bg-blue-500' : 'bg-amber-400'
                  }`}
                />
                <div className="flex-1">
                  <div className="font-medium">第 {r.number} 轮</div>
                  <div className="text-xs text-stone-500">
                    {done
                      ? `已完成 · ${resultCount}/${r.matches.length} 场 · 结束于 ${formatDateTime(r.completedAt)}`
                      : started
                      ? `进行中 · 已录入 ${resultCount}/${r.matches.length} 场`
                      : `已生成 · 共 ${r.matches.length} 场 · ${formatDateTime(r.generatedAt)}`}
                  </div>
                </div>
                <div className="text-xs text-stone-500 font-mono">
                  {r.matches.filter((m) => m.locked).length > 0 && (
                    <span className="mr-2 badge bg-amber-100 text-amber-800">
                      🔒 {r.matches.filter((m) => m.locked).length} 锁定
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h4 className="font-bold text-stone-800">📁 对阵档案 JSON 结构（可复制保存）</h4>
              <button
                className="btn-ghost text-xs"
                onClick={() => setPreview(null)}
              >
                关闭
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-xs bg-stone-50 p-3 rounded border border-stone-200 whitespace-pre-wrap break-all font-mono text-stone-700 max-h-full">
                {preview.json}
              </pre>
            </div>
            <div className="p-3 border-t border-stone-200 flex gap-2 justify-end">
              <button
                className="btn-outline text-xs"
                onClick={() => navigator.clipboard.writeText(preview.json)}
              >
                📋 复制全部
              </button>
              <button className="btn-primary text-xs" onClick={() => setPreview(null)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
