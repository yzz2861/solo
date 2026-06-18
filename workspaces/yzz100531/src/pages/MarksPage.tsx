import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Bookmark, Play, Trash2, Eye, AlertCircle } from 'lucide-react'
import type { PracticeRecord } from '@/types'

export default function MarksPage() {
  const { allRecords, loadAllRecords, loadAudioForRecord, loadMarks, marks, removeMark, playSegment, role } = useAppStore()
  const [activeRecord, setActiveRecord] = useState<PracticeRecord | null>(null)

  useEffect(() => {
    loadAllRecords()
  }, [loadAllRecords])

  const handleSelectRecord = async (record: PracticeRecord) => {
    await loadAudioForRecord(record)
    await loadMarks(record.id)
    setActiveRecord(record)
  }

  const handleRemoveMark = async (markId: string) => {
    await removeMark(markId)
    if (activeRecord) {
      await loadMarks(activeRecord.id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy dark:text-white">重点标记</h2>
        <p className="text-sm text-navy/50 dark:text-white/50 mt-1">
          {role === 'teacher'
            ? '查看和管理学生练习记录中的重点标记'
            : '查看老师标记的练声重点，点击可回听对应片段'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber" />
            <h3 className="font-display font-semibold text-navy dark:text-white">练习记录</h3>
          </div>
          {allRecords.length === 0 ? (
            <p className="text-sm text-navy/40 dark:text-white/40 py-8 text-center">
              暂无练习记录
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {allRecords.map((record) => (
                <button
                  key={record.id}
                  onClick={() => handleSelectRecord(record)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    activeRecord?.id === record.id
                      ? 'border-teal bg-teal/5'
                      : 'border-navy/5 dark:border-white/5 hover:border-navy/20 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy dark:text-white truncate">
                      {record.studentName}
                    </p>
                    <p className="text-xs text-navy/40 dark:text-white/40 mt-0.5">
                      {new Date(record.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        record.overallScore >= 80
                          ? 'bg-success/15 text-success'
                          : record.overallScore >= 50
                          ? 'bg-amber/15 text-amber-dark'
                          : 'bg-danger/15 text-danger'
                      }`}>
                        {record.overallScore.toFixed(0)} 分
                      </span>
                      {record.marks && record.marks.length > 0 && (
                        <span className="text-xs text-navy/40 dark:text-white/40 flex items-center gap-1">
                          <Bookmark className="w-3 h-3" />
                          {record.marks.length} 个标记
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeRecord ? (
            <>
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-navy dark:text-white">
                      {activeRecord.studentName} 的标记
                    </h3>
                    <p className="text-xs text-navy/40 dark:text-white/40 mt-1">
                      {new Date(activeRecord.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    activeRecord.overallScore >= 80
                      ? 'bg-success/15 text-success'
                      : activeRecord.overallScore >= 50
                      ? 'bg-amber/15 text-amber-dark'
                      : 'bg-danger/15 text-danger'
                  }`}>
                    {activeRecord.overallScore.toFixed(0)} 分
                  </span>
                </div>

                {marks.length === 0 ? (
                  <div className="py-12 text-center text-navy/30 dark:text-white/30">
                    <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无标记</p>
                    {role === 'teacher' && (
                      <p className="text-xs mt-1">前往"练习复盘"页可添加标记</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marks.map((mark) => (
                      <div
                        key={mark.id}
                        className="p-4 rounded-xl border transition-all"
                        style={{
                          backgroundColor: mark.color + '08',
                          borderColor: mark.color + '33',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-2 h-2 rounded-full mt-2 shrink-0"
                            style={{ backgroundColor: mark.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-navy dark:text-white">
                              {mark.label}
                            </p>
                            <p className="text-xs text-navy/40 dark:text-white/40 mt-1">
                              时间：{mark.startTime.toFixed(1)}s - {mark.endTime.toFixed(1)}s
                              <span className="ml-2 opacity-60">
                                （时长 {(mark.endTime - mark.startTime).toFixed(1)}s）
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => playSegment(mark.startTime, mark.endTime)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal/15 text-teal hover:bg-teal/25 transition-colors"
                              >
                                <Play className="w-3 h-3" />
                                回听片段
                              </button>
                              {role === 'teacher' && (
                                <button
                                  onClick={() => handleRemoveMark(mark.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeRecord.noteAnalyses && activeRecord.noteAnalyses.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-amber" />
                    <h3 className="font-display font-semibold text-navy dark:text-white">音准摘要</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-navy/5 dark:bg-white/5 text-center">
                      <p className="text-xs text-navy/40 dark:text-white/40">平均偏离</p>
                      <p className="text-xl font-bold text-navy dark:text-white mt-1">
                        {Math.abs(
                          activeRecord.noteAnalyses.reduce((s, a) => s + a.deviationCents, 0) /
                          Math.max(1, activeRecord.noteAnalyses.filter((a) => a.actualFreq > 0).length)
                        ).toFixed(1)}¢
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-navy/5 dark:bg-white/5 text-center">
                      <p className="text-xs text-navy/40 dark:text-white/40">最大偏离</p>
                      <p className="text-xl font-bold text-danger mt-1">
                        {Math.max(
                          0,
                          ...activeRecord.noteAnalyses.map((a) => Math.abs(a.deviationCents))
                        ).toFixed(1)}¢
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-navy/5 dark:bg-white/5 text-center">
                      <p className="text-xs text-navy/40 dark:text-white/40">平均抖动</p>
                      <p className="text-xl font-bold text-amber mt-1">
                        {(
                          activeRecord.noteAnalyses.reduce((s, a) => s + a.jitter, 0) /
                          Math.max(1, activeRecord.noteAnalyses.filter((a) => a.actualFreq > 0).length) *
                          100
                        ).toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-navy/5 dark:bg-white/5 text-center">
                      <p className="text-xs text-navy/40 dark:text-white/40">准确音符</p>
                      <p className="text-xl font-bold text-success mt-1">
                        {activeRecord.noteAnalyses.filter((a) => Math.abs(a.deviationCents) <= 10).length}
                        <span className="text-sm text-navy/30 dark:text-white/30 font-normal">
                          /{activeRecord.noteAnalyses.length}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center py-20 text-navy/30 dark:text-white/30">
              <Eye className="w-12 h-12 mb-3" />
              <p className="text-sm">选择一条记录查看重点标记</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
