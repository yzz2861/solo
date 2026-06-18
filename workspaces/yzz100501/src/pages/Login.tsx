import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Shield } from 'lucide-react';
import useGameStore from '@/stores/useGameStore';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as 'student' | 'teacher' | null;
  const setUser = useGameStore((s) => s.setUser);

  const [className, setClassName] = useState('');
  const [name, setName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState('');

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (isStudent) {
      if (!className.trim() || !name.trim()) {
        setError('请填写班级和姓名');
        return;
      }
      setUser({ role: 'student', name: name.trim(), className: className.trim() });
      navigate('/student');
    } else if (isTeacher) {
      if (!teacherCode.trim()) {
        setError('请输入教师码');
        return;
      }
      if (teacherCode !== '2024' && teacherCode !== 'teacher') {
        setError('教师码不正确');
        return;
      }
      setUser({ role: 'teacher', name: '教师' });
      navigate('/teacher');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A2E23] bg-lab-pattern flex items-center justify-center px-4">
      <div className="card-scene w-full max-w-md animate-bubble-up">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost flex items-center gap-2 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="flex items-center gap-3 mb-6">
          {isStudent && <GraduationCap className="w-8 h-8 text-[#2ECC71]" />}
          {isTeacher && <Shield className="w-8 h-8 text-[#FF6B35]" />}
          <h1 className="font-display text-3xl text-white">
            {isStudent ? '学生登录' : isTeacher ? '教师登录' : '登录'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isStudent && (
            <>
              <div>
                <label className="block text-white/60 text-sm mb-1">班级</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="三年一班"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10
                             text-white placeholder-white/30 outline-none
                             focus:border-[#2ECC71] focus:ring-1 focus:ring-[#2ECC71] transition-all"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10
                             text-white placeholder-white/30 outline-none
                             focus:border-[#2ECC71] focus:ring-1 focus:ring-[#2ECC71] transition-all"
                />
              </div>
            </>
          )}

          {isTeacher && (
            <div>
              <label className="block text-white/60 text-sm mb-1">教师码</label>
              <input
                type="password"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                placeholder="请输入教师码"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10
                           text-white placeholder-white/30 outline-none
                           focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
              />
            </div>
          )}

          {error && (
            <p className="text-[#FF6B35] text-sm animate-shake">{error}</p>
          )}

          <button
            type="submit"
            className={`btn-primary mt-2 ${
              isTeacher
                ? 'border-[#FF6B35] hover:shadow-[#FF6B35]/20'
                : ''
            }`}
          >
            进入
          </button>
        </form>
      </div>
    </div>
  );
}
