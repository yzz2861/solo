import { useNavigate } from 'react-router-dom';
import { Shield, Users, UserCheck } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-6 shadow-lg">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            社区防诈骗剧情课
          </h1>
          <p className="text-2xl text-gray-600">
            跟着聊天学防骗，轻松识破各种骗局
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <button
            onClick={() => navigate('/elderly/login')}
            className="group bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-4 border-transparent hover:border-orange-400"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">
                我是老人朋友
              </h2>
              <p className="text-xl text-gray-500 text-center">
                开始学习防诈骗知识
              </p>
              <div className="mt-6 px-8 py-3 bg-orange-500 text-white rounded-full text-xl font-semibold group-hover:bg-orange-600 transition-colors">
                开始学习 →
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/login')}
            className="group bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-4 border-transparent hover:border-blue-400"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UserCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">
                工作人员入口
              </h2>
              <p className="text-xl text-gray-500 text-center">
                民警 / 社工管理后台
              </p>
              <div className="mt-6 px-8 py-3 bg-blue-500 text-white rounded-full text-xl font-semibold group-hover:bg-blue-600 transition-colors">
                登录管理 →
              </div>
            </div>
          </button>
        </div>

        <div className="mt-16 bg-white/80 backdrop-blur rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center">
            📚 您将学习识别这些骗局
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: '冒充客服', icon: '📞' },
              { name: '投资群诈骗', icon: '💰' },
              { name: '假冒亲友', icon: '👨‍👩‍👧' },
              { name: '验证码诈骗', icon: '🔐' },
              { name: '恶意链接', icon: '🔗' },
            ].map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center p-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-100"
              >
                <span className="text-4xl mb-2">{item.icon}</span>
                <span className="text-lg font-medium text-gray-700">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-400 mt-12 text-lg">
          © 社区防诈骗宣传教育平台 · 守护您的钱袋子
        </p>
      </div>
    </div>
  );
}
