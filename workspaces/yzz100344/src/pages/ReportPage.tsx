import { useState } from 'react';
import { useComplaintStore } from '@/store/useComplaintStore';
import { 
  calculateKPIs, 
  findLongestRunning, 
  findRepeatHotspots, 
  calculateStaffPerformance,
  getProblemTypeDistribution 
} from '@/utils/metrics';
import { FileBarChart, Download, FileSpreadsheet, Calendar, TrendingUp, AlertTriangle, Users, Award } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function ReportPage() {
  const { hasData, complaints, cleaningReport, loadMockData } = useComplaintStore();
  const [month, setMonth] = useState('2026-05');

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6">
          <FileBarChart className="w-12 h-12 text-primary-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-warm-800 mb-2">暂无月报数据</h2>
        <p className="text-warm-500 mb-8 text-center max-w-md">
          请先导入工单数据或使用示例数据，系统将自动生成结构化月度报告
        </p>
        <div className="flex gap-3">
          <Link to="/import" className="btn-primary">导入工单数据</Link>
          <button onClick={loadMockData} className="btn-secondary">加载示例数据</button>
        </div>
      </div>
    );
  }

  const kpis = calculateKPIs(complaints);
  const longest = findLongestRunning(complaints, 5);
  const hotspots = findRepeatHotspots(complaints).slice(0, 5);
  const staffPerf = calculateStaffPerformance(complaints).slice(0, 5);
  const typeDist = getProblemTypeDistribution(complaints).slice(0, 5);
  const monthLabel = `${month.split('-')[0]}年${parseInt(month.split('-')[1])}月`;

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      { '指标': '总工单量', '数值': kpis.totalComplaints, '单位': '条' },
      { '指标': '平均响应时长', '数值': kpis.avgResponseHours, '单位': '小时' },
      { '指标': '平均关闭时长', '数值': kpis.avgCloseHours, '单位': '小时' },
      { '指标': '重复投诉率', '数值': kpis.repeatComplaintRate + '%', '单位': '' },
      { '指标': '超期率', '数值': kpis.overdueRate + '%', '单位': '' },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, '核心指标');

    const longestSheet = XLSX.utils.json_to_sheet(longest.map(c => ({
      '工单号': c.orderNo,
      '小区': c.community,
      '楼栋': c.building,
      '业主': c.ownerName,
      '房号': c.roomNumber,
      '问题类型': c.problemType,
      '来源': c.source,
      '受理时间': c.receiveTime ? format(c.receiveTime, 'yyyy-MM-dd HH:mm') : '-',
      '关闭时长(小时)': c.closeHours ?? '-',
      '状态': c.status,
      '超期原因': c.overdueReason || '-',
    })));
    XLSX.utils.book_append_sheet(wb, longestSheet, '拖期TOP案例');

    const hotspotSheet = XLSX.utils.json_to_sheet(hotspots.map(h => ({
      '业主': h.ownerName,
      '房号': h.roomNumber,
      '问题类型': h.problemType,
      '投诉次数': h.count,
      '首次投诉': format(h.firstTime, 'yyyy-MM-dd'),
      '末次投诉': format(h.lastTime, 'yyyy-MM-dd'),
    })));
    XLSX.utils.book_append_sheet(wb, hotspotSheet, '重复投诉热点');

    const staffSheet = XLSX.utils.json_to_sheet(staffPerf.map(s => ({
      '排名': staffPerf.indexOf(s) + 1,
      '管家': s.name,
      '工单数': s.totalCount,
      '平均响应时长(小时)': s.avgResponseHours,
      '平均关闭时长(小时)': s.avgCloseHours,
      '超期率': s.overdueRate + '%',
      '绩效分': s.performanceScore,
    })));
    XLSX.utils.book_append_sheet(wb, staffSheet, '管家绩效排名');

    if (cleaningReport) {
      const qualitySheet = XLSX.utils.json_to_sheet([
        { '项目': '总行数', '数量': cleaningReport.totalRows, '说明': '' },
        { '项目': '有效行数', '数量': cleaningReport.validRows, '说明': '' },
        { '项目': '时间字段缺失', '数量': cleaningReport.timeMissing, '说明': '已标记异常，建议补录' },
        { '项目': '关闭早于受理', '数量': cleaningReport.timeInverted, '说明': '已自动交换时间戳' },
        { '项目': '业主多号合并', '数量': cleaningReport.ownersMerged, '说明': '同业主去重' },
        { '项目': '问题类型标准化', '数量': cleaningReport.typesStandardized, '说明': '关键词匹配成功' },
        { '项目': '待人工确认类型', '数量': cleaningReport.typesUnconfirmed, '说明': '匹配置信度低' },
      ]);
      XLSX.utils.book_append_sheet(wb, qualitySheet, '数据质量报告');
    }

    XLSX.writeFile(wb, `物业投诉月报_${month}.xlsx`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-warm-800 mb-1">月度投诉分析报告</h2>
          <p className="text-warm-500 text-sm">结构化报告，含典型案例、热点分析和改进建议</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-warm-200 px-3 py-2">
            <Calendar className="w-4 h-4 text-warm-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-sm font-medium text-warm-700 outline-none"
            />
          </div>
          <button onClick={handleExportExcel} className="btn-primary inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出 Excel 月报
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-800 to-primary-700 text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm">PROPERTY COMPLAINT MONTHLY REPORT</p>
              <h3 className="text-2xl font-serif font-bold mt-1">{monthLabel} 物业投诉分析月报</h3>
            </div>
            <div className="text-right">
              <p className="text-primary-200 text-xs">生成时间</p>
              <p className="font-mono text-sm mt-0.5">{format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h4 className="font-serif font-bold text-lg text-warm-800">一、核心运营指标</h4>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: '总工单量', value: kpis.totalComplaints, unit: '条', color: 'primary' },
                { label: '平均响应时长', value: kpis.avgResponseHours, unit: '小时', color: 'primary' },
                { label: '平均关闭时长', value: kpis.avgCloseHours, unit: '小时', color: kpis.avgCloseHours > 72 ? 'accent' : 'primary' },
                { label: '重复投诉率', value: kpis.repeatComplaintRate + '%', unit: '', color: 'accent' },
                { label: '超期率', value: kpis.overdueRate + '%', unit: '', color: 'accent' },
              ].map((item) => (
                <div key={item.label} className={`
                  p-4 rounded-xl text-center
                  ${item.color === 'accent' ? 'bg-accent-50 border border-accent-100' : 'bg-warm-50 border border-warm-200'}
                `}>
                  <p className={`text-2xl font-serif font-bold ${item.color === 'accent' ? 'text-accent-600' : 'text-primary-700'}`}>
                    {item.value}
                  </p>
                  <p className="text-xs text-warm-500 mt-1">{item.label} {item.unit}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-accent-500" />
              <h4 className="font-serif font-bold text-lg text-warm-800">二、重点拖期案例 TOP 5</h4>
            </div>
            <div className="border border-warm-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">工单号</th>
                    <th className="px-4 py-3 text-left">位置</th>
                    <th className="px-4 py-3 text-left">业主</th>
                    <th className="px-4 py-3 text-left">问题</th>
                    <th className="px-4 py-3 text-right">关闭时长</th>
                    <th className="px-4 py-3 text-left">超期原因</th>
                  </tr>
                </thead>
                <tbody>
                  {longest.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-primary-700">{c.orderNo}</td>
                      <td className="px-4 py-3 text-warm-700">{c.community} {c.building}</td>
                      <td className="px-4 py-3 text-warm-700">{c.ownerName} ({c.roomNumber})</td>
                      <td className="px-4 py-3">
                        <span className="tag bg-warm-100 text-warm-700">{c.problemType}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-accent-600">
                        {c.closeHours ? `${c.closeHours}h` : '-'}
                      </td>
                      <td className="px-4 py-3 text-warm-600 text-xs max-w-[200px] truncate">
                        {c.overdueReason || '待核实'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-500" />
                <h4 className="font-serif font-bold text-lg text-warm-800">三、重复投诉热点</h4>
              </div>
              <div className="space-y-2">
                {hotspots.map((h, idx) => (
                  <div key={h.ownerId + h.problemType} className="flex items-center justify-between p-3 bg-warm-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-warm-800 text-sm">
                          {h.ownerName} <span className="text-warm-500 text-xs">({h.roomNumber})</span>
                        </p>
                        <p className="text-xs text-warm-500">{h.problemType}</p>
                      </div>
                    </div>
                    <span className="text-accent-600 font-bold">{h.count}次</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-green-600" />
                <h4 className="font-serif font-bold text-lg text-warm-800">四、管家绩效排名 TOP 5</h4>
              </div>
              <div className="space-y-2">
                {staffPerf.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center
                        ${idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                          idx === 1 ? 'bg-warm-300 text-warm-800' :
                          idx === 2 ? 'bg-orange-300 text-orange-900' :
                          'bg-warm-200 text-warm-600'}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-warm-800 text-sm">{s.name}</p>
                        <p className="text-xs text-warm-500">{s.totalCount}单 · 超期率{s.overdueRate}%</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${s.performanceScore >= 80 ? 'text-green-600' : s.performanceScore >= 60 ? 'text-primary-600' : 'text-accent-600'}`}>
                      {s.performanceScore}分
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-primary-600" />
              <h4 className="font-serif font-bold text-lg text-warm-800">五、数据质量说明</h4>
            </div>
            {cleaningReport && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-2xl font-serif font-bold text-orange-600">{cleaningReport.timeMissing}</p>
                  <p className="text-xs text-warm-600 mt-1">时间字段缺失，已标记异常供人工补录</p>
                </div>
                <div className="p-4 bg-accent-50 rounded-xl border border-accent-100">
                  <p className="text-2xl font-serif font-bold text-accent-600">{cleaningReport.timeInverted}</p>
                  <p className="text-xs text-warm-600 mt-1">关闭早于受理，已自动交换时间戳</p>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-2xl font-serif font-bold text-primary-600">{cleaningReport.typesStandardized}</p>
                  <p className="text-xs text-warm-600 mt-1">问题类型已标准化匹配，{cleaningReport.typesUnconfirmed}条待人工确认</p>
                </div>
              </div>
            )}
          </section>

          <section className="p-5 bg-gradient-to-br from-primary-50 to-green-50 rounded-xl border border-primary-100">
            <h4 className="font-serif font-bold text-lg text-warm-800 mb-3">📋 本月改进建议</h4>
            <ul className="space-y-2 text-sm text-warm-700">
              <li className="flex gap-2">
                <span className="text-primary-600 font-bold">1.</span>
                <span>针对 <strong className="text-accent-600">{typeDist[0]?.name || '电梯问题'}</strong>（{typeDist[0]?.value || 0}条）占比最高，建议协调第三方维保单位增加巡检频次</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 font-bold">2.</span>
                <span>重复投诉业主 <strong className="text-accent-600">{hotspots[0]?.ownerName}</strong> 累计{hotspots[0]?.count || 0}次同类投诉，建议安排客服主管上门沟通</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 font-bold">3.</span>
                <span>当前超期率 <strong className="text-accent-600">{kpis.overdueRate}%</strong>，主要原因为配件采购周期长、第三方协调困难，建议建立常用备件库存机制</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary-600 font-bold">4.</span>
                <span>管家 <strong className="text-accent-600">{staffPerf[staffPerf.length - 1]?.name}</strong> 绩效分偏低，建议开展一对一绩效辅导</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="bg-warm-50 px-8 py-4 border-t border-warm-200 text-center text-xs text-warm-400">
          — 本报告由物业投诉响应看板系统自动生成，数据仅供内部复盘使用 —
        </div>
      </div>
    </div>
  );
}
