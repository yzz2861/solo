import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy, Clock, Home, LogOut } from 'lucide-react';
import { elderlyApi } from '../../services/api';

export default function ElderlyHome() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCorrect: 0,
    totalAnswered: 0,
    consecutiveCorrect: 0,
    currentDifficulty: 1,
  });
  const [hasProgress, setHasProgress] = useState(false);

  useEffect(() => {
    const elderlyName = localStorage.getItem('elderlyName');
    if (!elderlyName) {
      navigate('/elderly/login');
      return;
    }
    setName(elderlyName);
    loadProgress();
  }, [navigate]);

  const loadProgress = async () => {
    try {
      const result = await elderlyApi.getProfile();
      if (result.progress) {
        setHasProgress(!!result.progress.currentCaseId);
        setStats((prev) => ({
          ...prev,
          consecutiveCorrect: result.progress.consecutiveCorrect || 0,
          currentDifficulty: result.progress.currentDifficulty || 1,
        }));
      }
    } catch (err) {
      console.error('加载进度失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('elderlyId');
    localStorage.removeItem('elderlyName');
    navigate('/');
  };

  const handleStartGame = () => {
    navigate('/elderly/game');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xl text-gray-600 hover:text-orange-600 transition-colors"
          >
            <Home className="w-6 h-6" />
            <span>首页</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xl text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-6 h-6" />
            <span>退出</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-10 text-white">
            <h1 className="text-4xl font-bold mb-2">
              {name}阿姨/叔叔，您好！
            </h1>
            <p className="text-2xl opacity-90">欢迎来到防诈骗小课堂</p>
          </div>

          <div className="p-10">
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 text-center">
                <Trophy className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-green-700">
                  {stats.consecutiveCorrect}
                </div>
                <div className="text-xl text-green-600">连续答对</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-6 text-center">
                <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-blue-700">
                  第{stats.currentDifficulty}关
                </div>
                <div className="text-xl text-blue-600">当前难度</div>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full h-24 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-3xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-4"
            >
              <Play className="w-10 h-10" />
              {hasProgress ? '继续学习 →' : '开始学习 →'}
            </button>

            {hasProgress && (
              <p className="text-center text-xl text-gray-500 mt-4">
                📖 上次的进度已为您保存，点击继续学习
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-3xl">💡</span>
            防骗小口诀
          </h2>
          <div className="space-y-4">
            {[
              '不听不信不转账，遇到疑问找民警',
              '短信链接不要点，陌生电话别轻信',
              '验证码是金钥匙，谁要都不能告诉',
              '投资理财走正道，高息都是大陷阱',
              '有事多跟儿女讲，转账之前要三思',
            ].map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl"
              >
                <span className="text-2xl font-bold text-orange-500">{index + 1}</span>
                <p className="text-xl text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">📞 遇到诈骗怎么办？</h2>
          <div className="space-y-3 text-xl">
            <p>• 第一时间拨打 <span className="font-bold text-2xl">110</span> 报警</p>
            <p>• 告诉社区民警或工作人员</p>
            <p>• 告诉家里人，别觉得不好意思</p>
          </div>
        </div>
      </div>
    </div>
  );
}
