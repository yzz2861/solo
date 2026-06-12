import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, MapPin } from 'lucide-react';
import { elderlyApi } from '../../services/api';

export default function ElderlyLogin() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [age, setAge] = useState('');
  const [community, setCommunity] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await elderlyApi.login(
        name.trim(),
        phoneLast4,
        age ? parseInt(age, 10) : undefined,
        community.trim() || undefined
      );

      localStorage.setItem('elderlyId', result.elderly.id.toString());
      localStorage.setItem('elderlyName', result.elderly.name);

      navigate('/elderly/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xl text-gray-600 hover:text-orange-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>返回首页</span>
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">欢迎您！</h1>
            <p className="text-xl text-gray-500">请输入您的信息开始学习</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="flex items-center gap-3 text-2xl font-bold text-gray-700 mb-3">
                <User className="w-7 h-7 text-orange-500" />
                您的姓名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-16 px-6 text-2xl border-3 border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all"
                placeholder="请输入您的姓名"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-3 text-2xl font-bold text-gray-700 mb-3">
                <Phone className="w-7 h-7 text-orange-500" />
                手机号后四位
              </label>
              <input
                type="tel"
                value={phoneLast4}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPhoneLast4(val);
                }}
                className="w-full h-16 px-6 text-2xl border-3 border-gray-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all tracking-widest"
                placeholder="比如：1234"
                maxLength={4}
                required
              />
              <p className="text-lg text-gray-400 mt-2">
                我们只保存手机号后四位，用来识别您的身份
              </p>
            </div>

            {!showMore && (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="text-xl text-orange-600 hover:text-orange-700 font-medium"
              >
                + 填写年龄和社区（选填）
              </button>
            )}

            {showMore && (
              <div className="space-y-8 p-6 bg-orange-50 rounded-2xl">
                <div>
                  <label className="flex items-center gap-3 text-xl font-bold text-gray-700 mb-3">
                    <Calendar className="w-6 h-6 text-orange-500" />
                    您的年龄（选填）
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full h-14 px-5 text-xl border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="比如：65"
                    min="50"
                    max="100"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 text-xl font-bold text-gray-700 mb-3">
                    <MapPin className="w-6 h-6 text-orange-500" />
                    所在社区（选填）
                  </label>
                  <input
                    type="text"
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full h-14 px-5 text-xl border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="比如：朝阳社区"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-xl text-red-600">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name || phoneLast4.length !== 4}
              className="w-full h-20 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white text-2xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
            >
              {loading ? '请稍候...' : '开始学习 ✨'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-8 text-lg">
          下次来上课，用同样的姓名和手机号后四位就能继续学习啦！
        </p>
      </div>
    </div>
  );
}
