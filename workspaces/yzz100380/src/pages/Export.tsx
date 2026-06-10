import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, FileText, Calendar, Printer, Music, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate, getDifficultyLabel } from '@/utils/helpers';
import { downloadJSON } from '@/utils/helpers';

export default function ExportPage() {
  const {
    performances,
    sheets,
    members,
    sections,
    practices,
    attendances,
    performanceConfirms,
    exportData,
    importData,
    resetData,
  } = useAppStore();

  const [selectedPerformanceId, setSelectedPerformanceId] = useState(
    performances[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showBackupOptions, setShowBackupOptions] = useState(false);

  const selectedPerformance = performances.find((p) => p.id === selectedPerformanceId);
  const perfSheets = sheets.filter((s) => selectedPerformance?.songIds.includes(s.id));

  const todayAttendances = attendances.filter((a) => a.date === selectedDate);
  const presentMembers = todayAttendances.filter((a) => a.status === 'present');

  const handlePrintRehearsalSheet = () => {
    window.print();
  };

  const handleExportBackup = () => {
    const data = exportData();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJSON(data, `口琴社数据备份_${dateStr}.json`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (confirm('确定要导入数据吗？这将覆盖现有数据。')) {
          importData(content);
          alert('导入成功！');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetData = () => {
    if (confirm('确定要重置为示例数据吗？所有自定义数据将丢失。')) {
      resetData();
      alert('已重置为示例数据');
    }
  };

  const getMemberPracticeForSheet = (memberId: string, sheetId: string) =>
    practices.find((p) => p.memberId === memberId && p.sheetId === sheetId);

  const getConfirmStatus = (perfId: string, memberId: string) => {
    const confirm = performanceConfirms.find(
      (pc) => pc.performanceId === perfId && pc.memberId === memberId
    );
    return confirm?.confirmed || false;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="排练单导出"
        subtitle="生成排练单和数据备份"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => setShowBackupOptions(!showBackupOptions)}
            >
              数据管理
            </Button>
            <Button icon={<Download className="w-4 h-4" />} onClick={handlePrintRehearsalSheet}>
              打印排练单
            </Button>
          </div>
        }
      />

      {showBackupOptions && (
        <Card className="p-4 mb-6 bg-gold-50/50 border-gold-200">
          <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gold-600" />
            数据备份与恢复
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportBackup}>
              <Download className="w-4 h-4 mr-1" />
              导出备份 (JSON)
            </Button>
            <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-wood-300 text-wood-700 hover:bg-wood-50 cursor-pointer transition-colors">
              <FileText className="w-4 h-4" />
              导入备份
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            <Button variant="danger" size="sm" onClick={handleResetData}>
              重置为示例数据
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-500" />
              排练日期
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-gold-500" />
              关联演出
            </h3>
            <div className="space-y-1">
              {performances.map((perf) => (
                <button
                  key={perf.id}
                  onClick={() => setSelectedPerformanceId(perf.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPerformanceId === perf.id
                      ? 'bg-gold-100 text-gold-800 font-medium'
                      : 'hover:bg-wood-50 text-wood-600'
                  }`}
                >
                  <div>{perf.name}</div>
                  <div className="text-xs opacity-70">{formatDate(perf.date)}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="p-6 bg-white print:shadow-none print:border-none">
            <div className="text-center mb-6 print:mb-4">
              <h1 className="text-2xl font-serif font-bold text-wood-800 mb-1">
                口琴社排练单
              </h1>
              <p className="text-wood-500">{formatDate(selectedDate)}</p>
              {selectedPerformance && (
                <Badge variant="gold" className="mt-2">
                  关联演出：{selectedPerformance.name}
                </Badge>
              )}
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-lg font-serif font-bold text-wood-800 mb-3 pb-2 border-b-2 border-gold-300 flex items-center gap-2">
                  <Music className="w-5 h-5 text-gold-500" />
                  排练曲目
                </h2>
                <div className="space-y-2">
                  {perfSheets.length > 0 ? (
                    perfSheets.map((sheet, idx) => (
                      <div
                        key={sheet.id}
                        className="flex items-center justify-between p-3 bg-wood-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gold-200 text-gold-800 rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-wood-800">{sheet.title}</div>
                            <div className="text-xs text-wood-500">
                              {sheet.composer} · {sheet.totalBars}小节 ·{' '}
                              {getDifficultyLabel(sheet.difficulty)}
                            </div>
                          </div>
                        </div>
                        <Badge variant={sheet.fileValid ? 'success' : 'danger'} size="sm">
                          {sheet.fileValid ? '曲谱有效' : '曲谱失效'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-wood-400 text-sm">暂未选择曲目</p>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-serif font-bold text-wood-800 mb-3 pb-2 border-b-2 border-gold-300 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-500" />
                  各声部成员
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sections.map((section) => {
                    const secMembers = members.filter((m) => m.sectionId === section.id);
                    return (
                      <div
                        key={section.id}
                        className="p-3 rounded-lg border border-wood-200"
                        style={{ backgroundColor: `${section.color}08` }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: section.color }}
                          />
                          <span className="font-medium text-wood-800 text-sm">
                            {section.name}
                          </span>
                          <span className="text-xs text-wood-400">
                            ({secMembers.length}人)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {secMembers.map((member) => {
                            const isPresent = presentMembers.some(
                              (a) => a.memberId === member.id
                            );
                            const isConfirmed = selectedPerformance
                              ? getConfirmStatus(selectedPerformance.id, member.id)
                              : true;
                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-wood-700">{member.name}</span>
                                <div className="flex items-center gap-1">
                                  {!isPresent && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full" title="未出勤" />
                                  )}
                                  {selectedPerformance && !isConfirmed && (
                                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="未确认演出" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {selectedPerformance && (
                <section>
                  <h2 className="text-lg font-serif font-bold text-wood-800 mb-3 pb-2 border-b-2 border-gold-300 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gold-500" />
                    练习进度概览
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-wood-50">
                          <th className="text-left py-2 px-3 font-medium text-wood-600 text-xs">
                            成员
                          </th>
                          {perfSheets.map((sheet) => (
                            <th
                              key={sheet.id}
                              className="text-center py-2 px-3 font-medium text-wood-600 text-xs"
                            >
                              {sheet.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-wood-100">
                        {members.slice(0, 8).map((member) => (
                          <tr key={member.id}>
                            <td className="py-2 px-3 text-wood-700 text-xs">
                              {member.name}
                            </td>
                            {perfSheets.map((sheet) => {
                              const practice = getMemberPracticeForSheet(
                                member.id,
                                sheet.id
                              );
                              const mastery = practice?.mastery || 0;
                              const isQualified =
                                mastery >= selectedPerformance.requiredMastery;
                              return (
                                <td key={sheet.id} className="py-2 px-3 text-center">
                                  <span
                                    className={`text-xs font-medium ${
                                      isQualified ? 'text-green-600' : 'text-red-500'
                                    }`}
                                  >
                                    {mastery}%
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-wood-400 mt-2 text-center">
                    达标线：{selectedPerformance.requiredMastery}% · 仅显示前 8 名成员
                  </p>
                </section>
              )}

              <section>
                <h2 className="text-lg font-serif font-bold text-wood-800 mb-3 pb-2 border-b-2 border-gold-300 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold-500" />
                  出勤情况
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {presentMembers.length}
                    </div>
                    <div className="text-xs text-green-700">出勤</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {todayAttendances.filter((a) => a.status === 'absent').length}
                    </div>
                    <div className="text-xs text-red-700">缺勤</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {todayAttendances.filter((a) => a.status === 'late').length}
                    </div>
                    <div className="text-xs text-yellow-700">迟到</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {todayAttendances.filter((a) => a.status === 'leave').length}
                    </div>
                    <div className="text-xs text-blue-700">请假</div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-serif font-bold text-wood-800 mb-3 pb-2 border-b-2 border-gold-300 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-500" />
                  备注
                </h2>
                <div className="p-4 bg-wood-50 rounded-lg min-h-[80px] text-wood-500 text-sm">
                  （在此记录排练要点和老师指导意见）
                </div>
              </section>
            </div>

            <div className="mt-8 pt-4 border-t border-wood-200 flex justify-between text-xs text-wood-400 print:hidden">
              <span>生成时间：{new Date().toLocaleString('zh-CN')}</span>
              <span>口琴社曲谱练习柜</span>
            </div>
          </Card>

          <div className="mt-4 flex justify-center gap-3 print:hidden">
            <Button icon={<Printer className="w-4 h-4" />} onClick={handlePrintRehearsalSheet}>
              打印排练单
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
