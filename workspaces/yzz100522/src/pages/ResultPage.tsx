import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ArrowLeft, Trophy, Clock, Target, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Download, RotateCcw, Home,
} from 'lucide-react';
import { getRecordById } from '../utils/storage';
import { getCases } from '../utils/storage';
import { getLevelShortLabel, getLevelColorClass, formatTime, getDifficultyLabel, getScenarioLabel } from '../utils/scoring';
import { exportMistakeDetail } from '../utils/export';
import type { TrainingRecord, MistakeItem, TriageLevel } from '../types';
import { cn } from '../lib/utils';

const getMistakeTypeLabel = (type: string) => {
  switch (type) {
    case 'level': return '等级判断错误';
    case 'priority': return '优先级排序错误';
    case 'both': return '等级和排序均错误';
    default: return '错误';
  }
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [expandedMistake, setExpandedMistake] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      const data = getRecordById(id);
      if (data) {
        setRecord(data);
      }
    }
  }, [id]);
  
  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }
  
  const levelData = [
    { name: '红色', value: record.levelAccuracy.red, color: '#dc2626' },
    { name: '黄色', value: record.levelAccuracy.yellow, color: '#f59e0b' },
    { name: '绿色', value: record.levelAccuracy.green, color: '#10b981' },
    { name: '黑色', value: record.levelAccuracy.black, color: '#1f2937' },
  ];
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-cyan-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };
  
  const getScoreGrade = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '及格';
    return '需要加强';
  };
  
  const handleRetry = () => {
    const cases = getCases();
    const caseData = cases.find(c => c.id === record.caseId);
    if (caseData) {
      navigate(`/training?caseId=${record.caseId}`);
    }
  };
  
  const handleExportMistakes = () => {
    exportMistakeDetail(record);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          返回首页
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
              <Trophy size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-2">训练完成！</h1>
            <p className="text-white/80">{record.caseName}</p>
          </div>
          
          <div className="p-8">
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-1">总分</p>
                <p className={cn('text-5xl font-bold', getScoreColor(record.score))}>
                  {record.score}
                </p>
                <p className="text-gray-400 text-sm">/ 100分</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-1">评级</p>
                <p className={cn('text-3xl font-bold', getScoreColor(record.score))}>
                  {getScoreGrade(record.score)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-1 flex items-center justify-center gap-1">
                  <Target size={14} />
                  正确率
                </p>
                <p className="text-3xl font-bold text-cyan-600">{record.accuracy}%</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-1 flex items-center justify-center gap-1">
                  <Clock size={14} />
                  用时
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatTime(record.duration)}
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-3 mb-8">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span className="text-gray-600 text-sm">红色准确率</span>
                <p className="text-xl font-bold text-red-600">{record.levelAccuracy.red}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                <span className="text-gray-600 text-sm">黄色准确率</span>
                <p className="text-xl font-bold text-amber-600">{record.levelAccuracy.yellow}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
                <span className="text-gray-600 text-sm">绿色准确率</span>
                <p className="text-xl font-bold text-emerald-600">{record.levelAccuracy.green}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-800 mr-2"></span>
                <span className="text-gray-600 text-sm">黑色准确率</span>
                <p className="text-xl font-bold text-gray-800">{record.levelAccuracy.black}%</p>
              </div>
            </div>
            
            <div className="h-64 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, '准确率']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg font-medium"
              >
                <RotateCcw size={18} />
                再练一次
              </button>
              <button
                onClick={handleExportMistakes}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                <Download size={18} />
                导出错题详情
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                <Home size={18} />
                返回首页
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={24} />
              错题详解
              <span className="text-sm font-normal text-gray-500 ml-2">
                共 {record.mistakes.length} 题错误
              </span>
            </h2>
          </div>
          
          <div className="p-6">
            {record.mistakes.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
                <p className="text-lg font-medium text-gray-700">太棒了！全部正确！</p>
                <p className="text-gray-500">你已经掌握了分诊技能</p>
              </div>
            ) : (
              <div className="space-y-4">
                {record.mistakes.map((mistake) => (
                  <MistakeCard
                    key={mistake.casualtyId}
                    mistake={mistake}
                    expanded={expandedMistake === mistake.casualtyId}
                    onToggle={() => setExpandedMistake(
                      expandedMistake === mistake.casualtyId ? null : mistake.casualtyId
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MistakeCardProps {
  mistake: MistakeItem;
  expanded: boolean;
  onToggle: () => void;
}

function MistakeCard({ mistake, expanded, onToggle }: MistakeCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-gray-300">
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
            <XCircle className="text-red-500" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{mistake.casualtyName}</h3>
            <p className="text-sm text-gray-500">
              {getMistakeTypeLabel(mistake.mistakeType)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">你的答案:</span>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getLevelColorClass(mistake.studentLevel as TriageLevel))}>
                {getLevelShortLabel(mistake.studentLevel as TriageLevel)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className="text-gray-500">正确答案:</span>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getLevelColorClass(mistake.correctLevel as TriageLevel))}>
                {getLevelShortLabel(mistake.correctLevel as TriageLevel)}
              </span>
            </div>
          </div>
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-gray-100 animate-fadeIn">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">排序对比</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">你的排序:</span>
                  <span className="font-bold text-lg text-red-600">第 {mistake.studentPriority} 位</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">正确排序:</span>
                  <span className="font-bold text-lg text-emerald-600">第 {mistake.correctPriority} 位</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">误判的生命体征</h4>
              <div className="flex flex-wrap gap-2">
                {mistake.misjudgedVitals.map((vital, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm"
                  >
                    {vital}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle size={18} />
              正确解析
            </h4>
            <p className="text-emerald-700">{mistake.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
