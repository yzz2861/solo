import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Camera,
  Plus,
  X,
  Sparkles,
  Car,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { caseApi } from '../api/client';
import type { CompletionResult } from '../types';
import { cn } from '../utils';

const quickExamples = [
  {
    name: '基础测试',
    description: '右前剐蹭，对方全责',
    photoNotes: ['右前保险杠照片'],
  },
  {
    name: '完整信息',
    description: '2024年1月15日下午3点，在中关村大街与海淀大街交叉口，我车由北向南直行，对方由东向西左转，我车右前保险杠剐蹭对方左后保险杠，对方闯红灯，对方全责',
    photoNotes: ['现场全景照片', '我车右前保险杠照片', '对方左后保险杠照片', '对方闯红灯现场照片'],
  },
  {
    name: '模糊方位',
    description: '前天下午，在一个路口附近，我车这边蹭到对方车，对方责任',
    photoNotes: ['车辆剐蹭部位'],
  },
];

export default function CreateCase() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [plateNumber, setPlateNumber] = useState('京A12345');
  const [description, setDescription] = useState('');
  const [photoNotes, setPhotoNotes] = useState<string[]>(['']);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [error, setError] = useState('');

  const addPhotoNote = () => {
    if (photoNotes.length < 10) {
      setPhotoNotes([...photoNotes, '']);
    }
  };

  const removePhotoNote = (index: number) => {
    if (photoNotes.length > 1) {
      setPhotoNotes(photoNotes.filter((_, i) => i !== index));
    }
  };

  const updatePhotoNote = (index: number, value: string) => {
    const newNotes = [...photoNotes];
    newNotes[index] = value;
    setPhotoNotes(newNotes);
  };

  const useExample = (example: typeof quickExamples[0]) => {
    setDescription(example.description);
    setPhotoNotes(example.photoNotes.length > 0 ? [...example.photoNotes] : ['']);
  };

  const handleComplete = async () => {
    if (!description.trim()) {
      setError('请输入事故描述');
      return;
    }

    const validPhotoNotes = photoNotes.filter(n => n.trim());

    setLoading(true);
    setError('');

    try {
      const response = await caseApi.complete({
        shortDescription: description.trim(),
        photoNotes: validPhotoNotes,
        context: {
          plateNumber: plateNumber.trim(),
        },
      });
      setCompletionResult(response.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || '补全失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!completionResult || !user) return;

    const validPhotoNotes = photoNotes.filter(n => n.trim());

    setLoading(true);
    try {
      const response = await caseApi.create({
        surveyorId: user.id,
        plateNumber: plateNumber.trim(),
        originalDescription: description.trim(),
        photoNotes: validPhotoNotes,
        context: completionResult as any,
      });
      navigate(`/cases/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建案件失败');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'preview' && completionResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep('input')}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            ← 返回修改
          </button>
          <button
            onClick={handleCreateCase}
            disabled={loading}
            className={cn(
              "px-6 py-2.5 rounded-xl font-medium text-white transition-all",
              "bg-primary-600 hover:bg-primary-700",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? '创建中...' : '确认创建案件'}
          </button>
        </div>

        {/* Preview Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                原始描述
              </h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                {completionResult.originalDescription}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-400" />
                照片备注
              </h3>
              <div className="space-y-2">
                {completionResult.photoNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-400 text-sm">{i + 1}.</span>
                    <span className="text-gray-600 text-sm">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Completion Result */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100 p-5">
              <h3 className="font-semibold text-primary-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                标准事故经过
              </h3>
              <p className="text-primary-900 leading-relaxed">
                {completionResult.standardDescription}
              </p>
            </div>

            {/* Confidence */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4">置信度分析</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center",
                  completionResult.confidenceScore >= 0.7 ? "bg-success-100" :
                  completionResult.confidenceScore >= 0.5 ? "bg-warning-100" : "bg-danger-100"
                )}>
                  <span className={cn(
                    "text-2xl font-bold",
                    completionResult.confidenceScore >= 0.7 ? "text-success-600" :
                    completionResult.confidenceScore >= 0.5 ? "text-warning-600" : "text-danger-600"
                  )}>
                    {Math.round(completionResult.confidenceScore * 100)}%
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">
                    {completionResult.confidenceScore >= 0.7 ? "高置信" :
                    completionResult.confidenceScore >= 0.5 ? "中置信" : "低置信"}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        completionResult.confidenceScore >= 0.7 ? "bg-success-500" :
                        completionResult.confidenceScore >= 0.5 ? "bg-warning-500" : "bg-danger-500"
                      )}
                      style={{ width: `${completionResult.confidenceScore * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {completionResult.lowConfidenceFlags.length > 0 && (
                <div className="space-y-2">
                  {completionResult.lowConfidenceFlags.map((flag, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-2 p-2 rounded-lg text-sm",
                    flag.severity === 'high' ? "bg-danger-50 text-danger-700" :
                    flag.severity === 'medium' ? "bg-warning-50 text-warning-700" :
                    "bg-gray-50 text-gray-700"
                  )}>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{flag.message}</div>
                      <div className="text-xs opacity-75">{flag.suggestion}</div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DetailCard
            label="事故时间"
            value={`${completionResult.accidentTime.date || '未提取'} ${completionResult.accidentTime.time || ''}`}
            isVague={completionResult.accidentTime.isVague}
          />
          <DetailCard
            label="事故地点"
            value={completionResult.accidentLocation.road || '未提取'}
            isVague={completionResult.accidentLocation.isVague}
          />
          <DetailCard
            label="行驶方向"
            value={`我方: ${completionResult.accidentDirection.ourDirection || '未知'}`}
            isVague={completionResult.accidentDirection.isVague}
          />
          <DetailCard
            label="责任判断"
            value={completionResult.liabilityClue.liability}
          />
        </div>

        {/* Vehicle Parts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">损失部位</h3>
          <div className="flex flex-wrap gap-2">
            {completionResult.vehicleParts.map((part, i) => (
            <div key={i} className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              part.isEstimated
                ? "bg-warning-100 text-warning-700 border border-warning-200"
                : "bg-primary-100 text-primary-700 border border-primary-200"
            )}>
              {part.zoneName} · {part.name}
              {part.isEstimated && ' (推测)'}
            </div>
          ))}
          </div>
        </div>

        {/* Reshoot List */}
        {completionResult.reshootList.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">建议补拍清单</h3>
            <div className="space-y-2">
              {completionResult.reshootList.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <Camera className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">
                      {item.partName || item.shotName}
                    </div>
                    <div className="text-sm text-gray-600">{item.reason}</div>
                    {item.angle && (
                      <div className="text-xs text-gray-500 mt-1">
                        拍摄角度：{item.angle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">新建案件</h2>
        <p className="text-primary-100">
          输入现场简短描述和照片备注，系统将智能补全为标准事故描述
        </p>
      </div>

      {/* Quick Examples */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-500" />
          快速示例
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickExamples.map((example, index) => (
            <button
              key={index}
              onClick={() => useExample(example)}
              className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all"
            >
              <div className="font-medium text-gray-800 text-sm mb-1">
                {example.name}
              </div>
              <div className="text-xs text-gray-500 line-clamp-2">
                {example.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Plate Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-400" />
            车牌号
          </label>
          <input
            type="text"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            placeholder="请输入车牌号"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            现场简短描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：右前剐蹭，对方全责"
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none transition-colors resize-none"
          />
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            建议包含：时间、地点、方向、部位、责任判断
          </p>
        </div>

        {/* Photo Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-gray-400" />
            照片备注
          </label>
          <div className="space-y-3">
            {photoNotes.map((note, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => updatePhotoNote(index, e.target.value)}
                  placeholder={`照片 ${index + 1} 备注`}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 outline-none transition-colors"
                />
                {photoNotes.length > 1 && (
                  <button
                    onClick={() => removePhotoNote(index)}
                    className="p-2 text-gray-400 hover:text-danger-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {photoNotes.length < 10 && (
            <button
              onClick={addPhotoNote}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              添加照片备注
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleComplete}
          disabled={loading || !description.trim()}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2",
            "bg-primary-600 hover:bg-primary-700 active:bg-primary-800",
            (loading || !description.trim()) && "opacity-70 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              智能补全中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              开始智能补全
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DetailCard({
  label, value, isVague = false }: {
  label: string;
  value: string;
  isVague?: boolean;
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isVague
        ? "bg-warning-50 border-warning-200"
        : "bg-white border-gray-100"
    )}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
      {isVague && (
        <div className="text-xs text-warning-600 mt-1">信息模糊</div>
      )}
    </div>
  );
}
