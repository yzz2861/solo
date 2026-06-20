import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Truck, CheckCircle, User, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calculateAxleLoad } from '@/utils/calculator';
import SignaturePad from '@/components/SignaturePad';
import { formatWeight } from '@/utils/units';

export default function Driver() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const tasks = useStore((s) => s.tasks);
  const standards = useStore((s) => s.standards);
  const saveDriverRecord = useStore((s) => s.saveDriverRecord);
  const setCurrentTask = useStore((s) => s.setCurrentTask);

  const [driverName, setDriverName] = useState('');
  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState('');

  useEffect(() => {
    if (taskId) {
      setCurrentTask(taskId);
    }
  }, [taskId, setCurrentTask]);

  const task = tasks.find((t) => t.id === taskId) || tasks[0];
  const standard = standards.find((s) => s.id === task?.standardId) || standards[0];

  const axleResult = task && standard ? calculateAxleLoad(task.vehicleParams, task.cargoes, standard) : null;

  const handleSave = (dataUrl: string) => {
    if (!driverName.trim()) {
      alert('请输入司机姓名');
      return;
    }
    setSignatureData(dataUrl);
    saveDriverRecord(driverName, dataUrl);
    setSigned(true);
  };

  if (!task || !standard || !axleResult) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const allOk = !axleResult.frontOverloaded && !axleResult.rearOverloaded && !axleResult.totalOverloaded;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>返回首页</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Truck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">出车轴荷确认</h1>
          <p className="text-gray-500 mt-2">
            {task.name} · {task.vehiclePlate}
          </p>
        </div>

        <div className={`rounded-2xl p-6 mb-6 shadow-lg ${
          allOk ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-orange-500 to-red-500'
        } text-white`}>
          <div className="text-center mb-6">
            <div className="text-sm opacity-80 mb-1">总重</div>
            <div className="text-5xl font-bold tracking-tight" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {formatWeight(axleResult.totalWeight, 'ton', 2)}
            </div>
            <div className="text-sm mt-2 opacity-80">
              限重 {formatWeight(standard.totalLimit, 'ton', 1)}
              {axleResult.totalOverloaded
                ? ` (超载 ${formatWeight(Math.abs(axleResult.totalMargin), 'kg', 0)})`
                : ` (余量 ${formatWeight(axleResult.totalMargin, 'kg', 0)})`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm opacity-80 mb-1">前轴</div>
              <div className="text-2xl font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {formatWeight(axleResult.frontAxle, 'ton', 2)}
              </div>
              <div className="text-xs mt-1 opacity-70">
                限 {formatWeight(standard.frontLimit, 'ton', 1)}
                {axleResult.frontOverloaded ? ' ⚠ 超载' : ' ✓'}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm opacity-80 mb-1">后轴</div>
              <div className="text-2xl font-bold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {formatWeight(axleResult.rearAxle, 'ton', 2)}
              </div>
              <div className="text-xs mt-1 opacity-70">
                限 {formatWeight(standard.rearLimit, 'ton', 1)}
                {axleResult.rearOverloaded ? ' ⚠ 超载' : ' ✓'}
              </div>
            </div>
          </div>
        </div>

        {task.driverRecord && !signed ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle size={20} />
              <span className="font-medium">已完成出车确认</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User size={16} />
                <span>司机: {task.driverRecord.driverName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} />
                <span>{new Date(task.driverRecord.signedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">签字</div>
              <img
                src={task.driverRecord.signatureData}
                alt="司机签字"
                className="max-h-20 mx-auto"
              />
            </div>
          </div>
        ) : signed ? (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 mb-6">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle size={24} />
              <span className="font-semibold text-lg">签字确认成功</span>
            </div>
            <p className="text-gray-600 text-sm">
              您已确认以上轴荷数据，请注意行车安全，祝您一路平安！
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {!allOk && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-700 mb-1">⚠️ 轴荷超限警告</div>
                <div className="text-sm text-red-600">
                  当前车辆轴荷超限，请联系调度调整货物后再出车。
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">司机姓名</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="请输入司机姓名"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <SignaturePad
              onSave={handleSave}
              width={600}
              height={180}
              penWidth={2}
            />

            <div className="mt-6 text-xs text-gray-400 text-center">
              签字即表示您确认以上轴荷数据真实有效，车辆符合出车条件
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
