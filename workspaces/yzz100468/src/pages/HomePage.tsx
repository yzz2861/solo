import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, User, UserCircle, Stethoscope, Sparkles, Clock, Trophy } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatDuration, getTodayString } from '@/utils/dateUtils';
import ProgressRing from '@/components/ProgressRing';

const HomePage: React.FC = () => {
  const records = useRecordStore((state) => state.records);
  const childName = useSettingsStore((state) => state.childName);

  const todayRecords = useMemo(() => {
    const today = getTodayString();
    return records.filter((r) => r.date === today);
  }, [records]);

  const todayCount = todayRecords.length;
  const dailyGoal = 2;
  const goalProgress = Math.min((todayCount / dailyGoal) * 100, 100);

  const bestScore = todayRecords.length > 0
    ? Math.max(...todayRecords.map(r => r.score))
    : 0;

  const totalDuration = todayRecords.reduce((sum, r) => sum + r.totalDuration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 via-white to-sunshine-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 mb-4">
            <Sparkles className="w-8 h-8 text-sunshine-500 animate-sparkle" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-mint-600 to-mint-500 bg-clip-text text-transparent">
              刷牙姿势训练局
            </h1>
            <Sparkles className="w-8 h-8 text-sunshine-500 animate-sparkle" />
          </div>
          <p className="text-gray-500">
            嗨，{childName}！今天也要好好刷牙了吗？
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-mint-500" />
            今日概览
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-mint-600">{todayCount}</div>
              <div className="text-xs text-gray-500 mt-1">练习次数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sunshine-600">{bestScore}</div>
              <div className="text-xs text-gray-500 mt-1">最高分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sky2-600">
                {Math.floor(totalDuration / 60)}
                <span className="text-lg">分</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">总时长</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
            <ProgressRing
              progress={goalProgress}
              size={80}
              strokeWidth={6}
              color="#4ECDC4"
              label={`${todayCount}/${dailyGoal}`}
              sublabel="每日目标"
            />
            <div className="text-sm text-gray-600">
              <p>再刷 <span className="font-bold text-mint-600">
                {Math.max(0, dailyGoal - todayCount)}
              </span> 次就达标啦！</p>
              {todayCount >= dailyGoal && (
                <p className="text-sunshine-600 font-medium mt-1 flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  今天很棒哦！
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link
            to="/practice"
            className="block w-full py-5 bg-gradient-to-r from-mint-500 to-mint-400 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
          >
            <Play className="w-7 h-7" fill="currentColor" />
            开始练习
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link
            to="/parent"
            className="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-sky2-100 rounded-xl flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-sky2-600" />
            </div>
            <h3 className="font-bold text-gray-800">家长中心</h3>
            <p className="text-xs text-gray-500 mt-1">查看练习记录和建议</p>
          </Link>

          <Link
            to="/doctor"
            className="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-coral-100 rounded-xl flex items-center justify-center mb-3">
              <Stethoscope className="w-6 h-6 text-coral-600" />
            </div>
            <h3 className="font-bold text-gray-800">医生视角</h3>
            <p className="text-xs text-gray-500 mt-1">复诊摘要与宣教指导</p>
          </Link>
        </div>

        <div className="text-center text-gray-400 text-sm">
          <p>每天刷牙身体好，牙齿健康吃饭香～</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
