import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, Users, Settings, Plus, Edit2, Trash2, Eye,
  Download, ChevronRight, FileText, BarChart3, LogOut,
} from 'lucide-react';
import { useAdminStore, useUserStore } from '../stores';
import { getDifficultyLabel, getDifficultyColor, getScenarioLabel, formatTime } from '../utils/scoring';
import { exportPersonalRecords, exportClassSummary } from '../utils/export';
import { getRecordsByStudent } from '../utils/storage';
import type { TrainingCase, Student } from '../types';
import { cn } from '../lib/utils';

type TabType = 'cases' | 'students' | 'stats';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useUserStore();
  const { cases, students, records, loadData, removeCase } = useAdminStore();
  const [activeTab, setActiveTab] = useState<TabType>('cases');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') {
      navigate('/');
    }
  }, [currentUser]);
  
  const handleDeleteCase = (id: string, name: string) => {
    if (confirm(`确定要删除案例"${name}"吗？此操作不可撤销。`)) {
      removeCase(id);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleExportStudent = (student: Student) => {
    const studentRecords = getRecordsByStudent(student.name);
    exportPersonalRecords(studentRecords, student.name);
  };
  
  const handleExportAll = () => {
    exportClassSummary(students, records);
  };
  
  const renderCasesTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">案例管理</h2>
        <button
          onClick={() => navigate('/admin/case/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-md font-medium"
        >
          <Plus size={18} />
          新建案例
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">案例名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">难度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">场景</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">伤员数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cases.map((c: TrainingCase) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate max-w-xs">{c.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getDifficultyColor(c.difficulty))}>
                    {getDifficultyLabel(c.difficulty)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{getScenarioLabel(c.scenario)}</td>
                <td className="px-6 py-4 text-gray-600">{c.casualties.length} 人</td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {new Date(c.updatedAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/training?caseId=${c.id}`)}
                      className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                      title="预览/试玩"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/case/${c.id}/edit`)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCase(c.id, c.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {cases.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="mx-auto mb-3 opacity-50" size={48} />
            <p>暂无案例，点击上方按钮创建</p>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderStudentsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">学员管理</h2>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          <Download size={18} />
          导出班级汇总
        </button>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student: Student) => (
          <div
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className="bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{student.name}</h3>
                  <p className="text-sm text-gray-500">{student.className || '未分配班级'}</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-lg font-bold text-cyan-600">{student.trainingCount}</p>
                <p className="text-xs text-gray-500">训练次数</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-lg font-bold text-emerald-600">{student.averageScore}</p>
                <p className="text-xs text-gray-500">平均分</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportStudent(student);
                  }}
                  className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center justify-center gap-1 w-full py-1"
                >
                  <Download size={12} />
                  导出
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {students.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
          <Users className="mx-auto mb-3 opacity-50" size={48} />
          <p>暂无学员数据</p>
          <p className="text-sm">学员完成训练后会自动记录</p>
        </div>
      )}
      
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
  
  const renderStatsTab = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">数据统计</h2>
      
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Users className="text-cyan-600" size={20} />
            </div>
            <span className="text-gray-500">学员总数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{students.length}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BookOpen className="text-emerald-600" size={20} />
            </div>
            <span className="text-gray-500">案例总数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{cases.length}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText className="text-amber-600" size={20} />
            </div>
            <span className="text-gray-500">训练总次数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{records.length}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-purple-600" size={20} />
            </div>
            <span className="text-gray-500">平均得分</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {records.length > 0
              ? Math.round(records.reduce((sum: number, r: any) => sum + r.score, 0) / records.length)
              : 0}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-semibold text-gray-800 mb-4">难度分布</h3>
        <div className="space-y-3">
          {(['easy', 'medium', 'hard'] as const).map((diff) => {
            const count = cases.filter((c: TrainingCase) => c.difficulty === diff).length;
            const percentage = cases.length > 0 ? (count / cases.length) * 100 : 0;
            return (
              <div key={diff}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{getDifficultyLabel(diff)}</span>
                  <span className="text-gray-500">{count} 个</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', {
                      'bg-emerald-500': diff === 'easy',
                      'bg-amber-500': diff === 'medium',
                      'bg-red-500': diff === 'hard',
                    })}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-cyan-500" size={24} />
            教员控制台
          </h1>
          {currentUser && (
            <p className="text-sm text-gray-500 mt-1">{currentUser.name}</p>
          )}
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Home size={20} />
                返回首页
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('cases')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  activeTab === 'cases'
                    ? 'bg-cyan-50 text-cyan-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <BookOpen size={20} />
                案例管理
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('students')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  activeTab === 'students'
                    ? 'bg-cyan-50 text-cyan-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Users size={20} />
                学员管理
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('stats')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  activeTab === 'stats'
                    ? 'bg-cyan-50 text-cyan-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <BarChart3 size={20} />
                数据统计
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            退出登录
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === 'cases' && renderCasesTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </main>
    </div>
  );
}

interface StudentDetailModalProps {
  student: Student;
  onClose: () => void;
}

function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  const navigate = useNavigate();
  const studentRecords = getRecordsByStudent(student.name);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-slideUp">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
              <p className="text-gray-500">{student.className || '未分配班级'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-cyan-600">{student.trainingCount}</p>
              <p className="text-sm text-gray-500">训练次数</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{student.averageScore}</p>
              <p className="text-sm text-gray-500">平均得分</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mt-2">
                {student.lastTrainingTime
                  ? new Date(student.lastTrainingTime).toLocaleDateString('zh-CN')
                  : '-'}
              </p>
              <p className="text-sm text-gray-500">最近训练</p>
            </div>
          </div>
          
          <h4 className="font-semibold text-gray-800 mb-3">训练记录</h4>
          <div className="space-y-2">
            {studentRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无训练记录</p>
            ) : (
              studentRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  onClick={() => {
                    navigate(`/result/${record.id}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{record.caseName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(record.endTime).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-cyan-600">{record.score}分</p>
                    <p className="text-xs text-gray-500">{formatTime(record.duration)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => {
              exportPersonalRecords(studentRecords, student.name);
            }}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            导出全部记录
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
