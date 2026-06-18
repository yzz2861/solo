import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, BookOpen, User, GraduationCap, Play, Clock, TrendingUp, Award } from 'lucide-react';
import { useUserStore } from '../stores';
import { getCases, getRecordsByStudent } from '../utils/storage';
import { getDifficultyLabel, getDifficultyColor } from '../utils/scoring';
import { cn } from '../lib/utils';

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, login } = useUserStore();
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);
  const [studentName, setStudentName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  
  const cases = getCases();
  
  const quickStartCases = cases.filter(c => c.difficulty === selectedDifficulty);
  const recentRecords = currentUser?.role === 'student' 
    ? getRecordsByStudent(currentUser.name).slice(0, 3)
    : [];
  
  const handleStartStudent = () => {
    if (!studentName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    login({ role: 'student', name: studentName.trim() });
    setSelectedRole(null);
  };
  
  const handleStartTeacher = () => {
    if (!teacherName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    login({ role: 'teacher', name: teacherName.trim() });
    navigate('/admin');
  };
  
  const handleQuickStart = () => {
    if (!currentUser || currentUser.role !== 'student') {
      setSelectedRole('student');
      return;
    }
    const randomCase = quickStartCases[Math.floor(Math.random() * quickStartCases.length)];
    if (randomCase) {
      navigate(`/training?caseId=${randomCase.id}`);
    }
  };
  
  const handleSelectCase = (caseId: string) => {
    if (!currentUser || currentUser.role !== 'student') {
      setSelectedRole('student');
      return;
    }
    navigate(`/training?caseId=${caseId}`);
  };
  
  const renderRoleSelector = () => {
    if (!selectedRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slideUp">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {selectedRole === 'student' ? '👨‍🎓 学员登录' : '👨‍🏫 教员登录'}
          </h3>
          <p className="text-gray-600 mb-4">
            请输入您的姓名以开始训练
          </p>
          <input
            type="text"
            value={selectedRole === 'student' ? studentName : teacherName}
            onChange={(e) => selectedRole === 'student' 
              ? setStudentName(e.target.value) 
              : setTeacherName(e.target.value)
            }
            placeholder="请输入姓名"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedRole(null)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={selectedRole === 'student' ? handleStartStudent : handleStartTeacher}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all font-medium shadow-lg"
            >
              开始
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {renderRoleSelector()}
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg mb-4">
            <Stethoscope className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            急救分诊卡片赛
          </h1>
          <p className="text-gray-600 text-lg">
            红黄绿黑 · 快速决策 · 拯救生命
          </p>
        </header>
        
        {currentUser && (
          <div className="mb-8 text-center">
            <p className="text-gray-600">
              欢迎回来，<span className="font-semibold text-cyan-600">{currentUser.name}</span>
              <span className="text-gray-400 ml-2">
                ({currentUser.role === 'student' ? '学员' : '教员'})
              </span>
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div
            onClick={() => currentUser?.role === 'student' ? null : setSelectedRole('student')}
            className={cn(
              'bg-white rounded-2xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
              currentUser?.role === 'student' && 'ring-4 ring-cyan-400 ring-offset-2'
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <GraduationCap className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">学员模式</h2>
                <p className="text-gray-500">参与分诊训练，提升急救技能</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-center gap-2">
                <Play size={14} className="text-cyan-500" />
                多种难度案例训练
              </li>
              <li className="flex items-center gap-2">
                <BookOpen size={14} className="text-cyan-500" />
                详细错题解析
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-500" />
                个人成绩追踪
              </li>
            </ul>
          </div>
          
          <div
            onClick={() => currentUser?.role === 'teacher' 
              ? navigate('/admin') 
              : setSelectedRole('teacher')
            }
            className={cn(
              'bg-white rounded-2xl p-6 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
              currentUser?.role === 'teacher' && 'ring-4 ring-amber-400 ring-offset-2'
            )}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <User className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">教员模式</h2>
                <p className="text-gray-500">管理案例与学员数据</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-center gap-2">
                <BookOpen size={14} className="text-amber-500" />
                自定义演练案例
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                多场景难度配置
              </li>
              <li className="flex items-center gap-2">
                <Award size={14} className="text-amber-500" />
                学员成绩导出
              </li>
            </ul>
          </div>
        </div>
        
        {currentUser?.role === 'student' && (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                快速开始
              </h2>
              
              <div className="flex gap-3 mb-6">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={cn(
                      'px-5 py-2 rounded-full font-medium transition-all',
                      selectedDifficulty === diff
                        ? getDifficultyColor(diff) + ' shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {getDifficultyLabel(diff)}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleQuickStart}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Play size={24} />
                开始随机训练
              </button>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">📚</span>
                演练案例库
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {cases.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCase(c.id)}
                    className="p-4 border border-gray-200 rounded-xl hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{c.name}</h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs px-2 py-1 rounded-full', getDifficultyColor(c.difficulty))}>
                        {getDifficultyLabel(c.difficulty)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {c.casualties.length} 名伤员
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {recentRecords.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  最近训练
                </h2>
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => navigate(`/result/${record.id}`)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{record.caseName}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.endTime).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-cyan-600">{record.score}</p>
                        <p className="text-xs text-gray-500">分</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {!currentUser && (
          <div className="text-center text-gray-500">
            <p>请选择身份开始使用</p>
          </div>
        )}
      </div>
    </div>
  );
}
