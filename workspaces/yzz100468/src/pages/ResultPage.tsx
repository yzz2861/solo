import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, RotateCcw, Share2 } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import StarRating from '@/components/StarRating';
import { REGION_ORDER, REGION_NAMES, ToothRegion, RegionDetail, PracticeRecord } from '@/types';
import { formatDuration, getTodayString, generateId } from '@/utils/dateUtils';
import { getEncouragement } from '@/utils/scoring';

interface LocationState {
  totalDuration: number;
  score: number;
  stars: number;
  regions: Record<ToothRegion, RegionDetail>;
  overallIssues: string[];
}

const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const addRecord = useRecordStore((state) => state.addRecord);
  const { childName, difficulty } = useSettingsStore();
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const result = location.state as LocationState | null;

  useEffect(() => {
    if (!result) {
      navigate('/');
      return;
    }

    const record: Omit<PracticeRecord, 'id' | 'date' | 'startTime'> = {
      totalDuration: result.totalDuration,
      score: result.score,
      regions: result.regions,
      overallIssues: result.overallIssues,
      stars: result.stars,
      difficulty,
    };
    addRecord(record);

    setTimeout(() => setIsLoaded(true), 100);
    setTimeout(() => setShowConfetti(false), 3000);
  }, [result, navigate, addRecord, difficulty]);

  if (!result) {
    return null;
  }

  const encouragement = getEncouragement(result.score, result.stars, childName);

  const confettiColors = ['#4ECDC4', '#FFE66D', '#FF6B6B', '#A8E6CF', '#95E1D3'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-100 via-white to-sunshine-100 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: confettiColors[i % confettiColors.length],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8 relative z-10">
        <div className={`text-center mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-mint-700 mb-2">
            练习完成！
          </h1>
          <p className="text-gray-600">{encouragement}</p>
        </div>

        <div className={`bg-white rounded-3xl p-6 shadow-xl mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold bg-gradient-to-r from-mint-500 to-mint-600 bg-clip-text text-transparent mb-4">
              {result.score}
              <span className="text-2xl text-gray-400 ml-1">分</span>
            </div>
            <StarRating stars={result.stars} size="xl" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-mint-50 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-mint-600">
                {formatDuration(result.totalDuration)}
              </div>
              <div className="text-sm text-gray-500 mt-1">练习时长</div>
            </div>
            <div className="bg-sunshine-50 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-sunshine-600">
                {REGION_ORDER.filter(r => result.regions[r].completed).length}
                <span className="text-base text-gray-400"> / 4</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">完成区域</div>
            </div>
          </div>

          {result.overallIssues.length > 0 && (
            <div className="bg-sunshine-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium text-sunshine-700 mb-2">小提示</h4>
              <ul className="text-sm text-sunshine-600 space-y-1">
                {result.overallIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`bg-white rounded-3xl p-6 shadow-lg mb-6 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h3 className="font-bold text-gray-800 mb-4">各区域详情</h3>
          <div className="space-y-3">
            {REGION_ORDER.map((region, index) => {
              const data = result.regions[region];
              return (
                <div
                  key={region}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      data.completed ? 'bg-mint-500' : 'bg-gray-300'
                    }`}
                  >
                    {data.completed ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">
                        {REGION_NAMES[region]}
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.round(data.duration)}s
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          data.cleanliness >= 70
                            ? 'bg-mint-500'
                            : data.cleanliness >= 40
                            ? 'bg-sunshine-400'
                            : 'bg-coral-400'
                        }`}
                        style={{ width: `${data.cleanliness}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`flex gap-3 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link
            to="/"
            className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <Home className="w-5 h-5" />
            返回首页
          </Link>
          <Link
            to="/practice"
            className="flex-1 py-4 bg-gradient-to-r from-mint-500 to-mint-400 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            再来一次
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
