import { useState, useMemo } from 'react';
import { Download, Music, TrendingUp, AlertTriangle, FileText, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore, useMembers, useLeaveRecords, usePieces } from '../store/useStore';
import { getVoicePartName, getVoicePartBadgeClass, voicePartList } from '../utils/voiceParts';
import { formatDate, daysBetween, getNextPerformanceDate } from '../utils/date';
import { exportToCSV, generatePerformanceList, generatePiecePracticeList } from '../utils/export';
import { VoicePart, Difficulty } from '../types';
import { StarRating } from '../components/StarRating';

type RiskLevel = 'low' | 'medium' | 'high';

export default function ConductorPanel() {
  const members = useMembers();
  const leaveRecords = useLeaveRecords();
  const pieces = usePieces();
  
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  const nextPerformance = getNextPerformanceDate();
  const daysToPerformance = daysBetween(new Date().toISOString().split('T')[0], nextPerformance.toISOString().split('T')[0]);

  const performanceList = useMemo(() => {
    return generatePerformanceList(members, leaveRecords);
  }, [members, leaveRecords]);

  const piecePracticeList = useMemo(() => {
    return generatePiecePracticeList(members, leaveRecords);
  }, [members, leaveRecords]);

  // 曲目维度分析
  const pieceAnalysis = useMemo(() => {
    return pieces.map(piece => {
      const pieceLeaves = leaveRecords.filter(r => r.reason.includes(piece.title) || r.notes.includes(piece.title));
      
      const partAnalysis = voicePartList.map(part => {
        const partMembers = members.filter(m => m.voicePart === part.key && m.status === 'active');
        const partLeaves = pieceLeaves.filter(r => {
          const member = members.find(m => m.id === r.memberId);
          return member?.voicePart === part.key;
        });
        
        const avgProficiency = partLeaves.length > 0
          ? partLeaves.reduce((sum, r) => sum + r.proficiency, 0) / partLeaves.length
          : 4;
        
        const attendanceRate = partMembers.length > 0
          ? ((partMembers.length - partLeaves.length) / partMembers.length) * 100
          : 100;
        
        const shortageRisk: RiskLevel = attendanceRate < 60 || avgProficiency < 3
          ? 'high'
          : attendanceRate < 80 || avgProficiency < 4
          ? 'medium'
          : 'low';
        
        return {
          ...part,
          total: partMembers.length,
          leaveCount: partLeaves.length,
          avgProficiency: Math.round(avgProficiency * 10) / 10,
          attendanceRate: Math.round(attendanceRate),
          shortageRisk,
        };
      });
      
      const overallProficiency = partAnalysis.reduce((sum, p) => sum + p.avgProficiency, 0) / partAnalysis.length;
      const overallAttendance = partAnalysis.reduce((sum, p) => sum + p.attendanceRate, 0) / partAnalysis.length;
      const overallRisk: RiskLevel = partAnalysis.some(p => p.shortageRisk === 'high')
        ? 'high'
        : partAnalysis.some(p => p.shortageRisk === 'medium')
        ? 'medium'
        : 'low';
      
      return {
        ...piece,
        partAnalysis,
        overallProficiency: Math.round(overallProficiency * 10) / 10,
        overallAttendance: Math.round(overallAttendance),
        overallRisk,
      };
    }).sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.overallRisk] - riskOrder[b.overallRisk];
    });
  }, [members, leaveRecords, pieces]);

  const canPerformList = useMemo(() => {
    return performanceList.filter(p => p.willPerform);
  }, [performanceList]);

  const cannotPerformList = useMemo(() => {
    return performanceList.filter(p => !p.willPerform);
  }, [performanceList]);

  const handleExportPerformanceList = () => {
    const exportData = canPerformList.map(p => ({
      '姓名': p.name,
      '声部': p.voicePart,
      '平均熟练度': p.proficiency,
      '出勤情况': p.recentAttendance,
    }));
    exportToCSV(exportData, '演出名单');
  };

  const handleExportPracticeList = () => {
    const exportData = piecePracticeList.flatMap(pp => 
      pp.members.map(m => ({
        '声部': pp.voicePart,
        '姓名': m,
        '原因': pp.reason,
      }))
    );
    exportToCSV(exportData, '补练名单');
  };

  const getDifficultyColor = (difficulty: Difficulty) => {
    const colors = {
      easy: 'bg-emerald-100 text-emerald-800',
      medium: 'bg-amber-100 text-amber-800',
      hard: 'bg-red-100 text-red-800',
    };
    return colors[difficulty];
  };

  const getDifficultyLabel = (difficulty: Difficulty) => {
    const labels = { easy: '简单', medium: '中等', hard: '困难' };
    return labels[difficulty];
  };

  const getRiskColor = (risk: RiskLevel) => {
    const colors = {
      low: 'bg-emerald-500',
      medium: 'bg-amber-500',
      high: 'bg-red-500',
    };
    return colors[risk];
  };

  const getRiskLabel = (risk: RiskLevel) => {
    const labels = { low: '低风险', medium: '中风险', high: '高风险' };
    return labels[risk];
  };

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-burgundy-900 text-shadow">
              指挥面板
            </h1>
            <p className="text-charcoal/60 mt-1">
              距离下次演出还有 <span className="font-bold text-burgundy-700">{daysToPerformance}</span> 天
              （{formatDate(nextPerformance)}）
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPerformanceList}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出演出名单
            </button>
            <button
              onClick={handleExportPracticeList}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出补练名单
            </button>
          </div>
        </div>
      </div>

      {/* 演出概况 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger-1">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">可参加演出</p>
              <p className="text-2xl font-bold font-serif text-emerald-700">{canPerformList.length} 人</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">无法参加</p>
              <p className="text-2xl font-bold font-serif text-red-700">{cannotPerformList.length} 人</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-100 rounded-xl">
              <FileText className="w-5 h-5 text-gold-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">需补练声部</p>
              <p className="text-2xl font-bold font-serif text-gold-700">{piecePracticeList.length} 个</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <BarChart3 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-charcoal/60">高风险曲目</p>
              <p className="text-2xl font-bold font-serif text-blue-700">
                {pieceAnalysis.filter(p => p.overallRisk === 'high').length} 首
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 曲目维度缺口分析 */}
      <div className="card p-6 animate-stagger-2">
        <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2 mb-6">
          <Music className="w-5 h-5" />
          曲目维度缺口分析
          <span className="text-sm font-normal text-charcoal/50 ml-2">
            按风险优先级排序，决定排练重点
          </span>
        </h2>

        <div className="space-y-4">
          {pieceAnalysis.map((piece, index) => (
            <div
              key={piece.id}
              className={`rounded-xl border-2 transition-all duration-300 ${
                piece.overallRisk === 'high'
                  ? 'border-red-200 bg-red-50/30'
                  : piece.overallRisk === 'medium'
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-emerald-200 bg-emerald-50/30'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* 曲目头部 */}
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedPiece(expandedPiece === piece.id ? null : piece.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(piece.overallRisk)}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-charcoal">{piece.title}</h3>
                      <span className={`badge ${getDifficultyColor(piece.difficulty)} text-xs`}>
                        {getDifficultyLabel(piece.difficulty)}
                      </span>
                      <span className={`badge ${getRiskColor(piece.overallRisk)} text-white text-xs`}>
                        {getRiskLabel(piece.overallRisk)}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal/60">作曲：{piece.composer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-charcoal/50">平均熟练度</p>
                    <StarRating value={piece.overallProficiency} readOnly size="sm" />
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-charcoal/50">出席率</p>
                    <p className={`font-bold ${
                      piece.overallAttendance >= 80 ? 'text-emerald-600' :
                      piece.overallAttendance >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {piece.overallAttendance}%
                    </p>
                  </div>
                  {expandedPiece === piece.id ? (
                    <ChevronUp className="w-5 h-5 text-charcoal/50" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal/50" />
                  )}
                </div>
              </div>

              {/* 展开详情 */}
              {expandedPiece === piece.id && (
                <div className="px-4 pb-4 border-t border-current/10 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {piece.partAnalysis.map((part, partIndex) => (
                      <div
                        key={part.key}
                        className={`p-3 rounded-xl ${
                          part.shortageRisk === 'high'
                            ? 'bg-red-100/50 border border-red-200'
                            : part.shortageRisk === 'medium'
                            ? 'bg-amber-100/50 border border-amber-200'
                            : 'bg-emerald-100/50 border border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`badge ${getVoicePartBadgeClass(part.key as VoicePart)} text-white text-xs`}>
                            {part.name}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${getRiskColor(part.shortageRisk)}`} />
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-charcoal/60">人数：</span>
                            <span className="font-medium">{part.total - part.leaveCount}/{part.total}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-charcoal/60">熟练度：</span>
                            <StarRating value={part.avgProficiency} readOnly size="sm" />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-charcoal/60">出席率：</span>
                            <span className={`font-medium ${
                              part.attendanceRate >= 80 ? 'text-emerald-600' :
                              part.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {part.attendanceRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 演出名单 */}
      <div className="card p-6 animate-stagger-3">
        <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5" />
          演出名单
          <span className="text-sm font-normal text-charcoal/50 ml-2">
            共 {canPerformList.length} 人可参加
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">姓名</th>
                <th className="table-header">声部</th>
                <th className="table-header text-center">平均熟练度</th>
                <th className="table-header">近期出勤</th>
                <th className="table-header text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {performanceList.map((person, index) => (
                <tr key={person.name} className={`table-row ${!person.willPerform ? 'bg-red-50/30' : ''}`}>
                  <td className="table-cell font-medium">{person.name}</td>
                  <td className="table-cell">
                    <span className={`badge ${getVoicePartBadgeClass(voicePartList.find(v => v.name === person.voicePart)?.key as VoicePart || 'soprano')} text-white text-xs`}>
                      {person.voicePart}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <StarRating value={person.proficiency} readOnly size="sm" />
                  </td>
                  <td className="table-cell text-sm text-charcoal/60">{person.recentAttendance}</td>
                  <td className="table-cell text-center">
                    {person.willPerform ? (
                      <span className="badge bg-emerald-100 text-emerald-800">可参加</span>
                    ) : (
                      <span className="badge bg-red-100 text-red-800">无法参加</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 需要补练的声部 */}
      {piecePracticeList.length > 0 && (
        <div className="card p-6 animate-stagger-4">
          <h2 className="text-xl font-bold font-serif text-burgundy-900 flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5" />
            需要重点补练的声部
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {piecePracticeList.map((practice, index) => (
              <div
                key={practice.voicePart}
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 animate-slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-charcoal">{practice.voicePart}</h3>
                  <span className="badge bg-amber-200 text-amber-800 text-xs">
                    {practice.members.length} 人
                  </span>
                </div>
                <p className="text-sm text-charcoal/60 mb-3">{practice.reason}</p>
                <div className="flex flex-wrap gap-2">
                  {practice.members.map((member, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-white rounded-full text-sm text-charcoal border border-amber-200"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
