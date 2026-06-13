import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Lock, Unlock, Camera, Upload, FileImage, DollarSign,
  Car, User, Phone, Calendar, MapPin, Shield, Clock,
  CheckCircle, XCircle, AlertTriangle, ArrowLeft,
  ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { accidentApi, getPhotoUrl, managerApi } from '../api/client.js';
import {
  AccidentStatus, UserRole, Accident, Photo, AuditLog, UpdateAccidentRequest
} from '../../shared/types.js';
import {
  formatDate, formatMoney, getStatusColor, getStatusLabel,
  canClose, canConfirm
} from '../utils/format.js';
import StatusBadge from '../components/StatusBadge.tsx';
import { useAuthStore } from '../store/authStore.js';

type ToastType = 'success' | 'error';

const LIABILITY_OPTIONS = [
  { value: '', label: '请选择' },
  { value: '全责', label: '全责' },
  { value: '主责', label: '主责' },
  { value: '同责', label: '同责' },
  { value: '次责', label: '次责' },
  { value: '无责', label: '无责' },
  { value: '待定', label: '待定' },
];

interface CreateField {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  type?: string;
}

const CREATE_FIELDS: CreateField[] = [
  { key: 'plateNumber', label: '车牌号', icon: Car, required: true },
  { key: 'vehicleModel', label: '车型', icon: Car, required: true },
  { key: 'customerName', label: '客户姓名', icon: User, required: true },
  { key: 'customerPhone', label: '客户电话', icon: Phone, required: true },
  { key: 'customerIdCard', label: '身份证号', icon: Shield },
  { key: 'location', label: '事故地点', icon: MapPin },
  { key: 'description', label: '事故描述', icon: FileImage },
  { key: 'depositAmount', label: '押金金额', icon: DollarSign, type: 'number' },
];

interface InfoField {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INFO_FIELDS: InfoField[] = [
  { key: 'plateNumber', label: '车牌号', icon: Car },
  { key: 'vehicleModel', label: '车型', icon: Car },
  { key: 'customerName', label: '客户姓名', icon: User },
  { key: 'customerPhone', label: '客户电话', icon: Phone },
  { key: 'customerIdCard', label: '身份证号', icon: Shield },
  { key: 'accidentTime', label: '事故时间', icon: Calendar },
  { key: 'returnTime', label: '还车时间', icon: Clock },
  { key: 'location', label: '事故地点', icon: MapPin },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AccidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isNew = id === 'new';

  const [accident, setAccident] = useState<Accident | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const [form, setForm] = useState({
    liability: '',
    insuranceEstimate: '' as string,
    assessmentAmount: '' as string,
    deductionAmount: '' as string,
    replacementCar: false,
    replacementCarInfo: '',
  });

  const [photoDescription, setPhotoDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState({
    plateNumber: '',
    vehicleModel: '',
    customerName: '',
    customerPhone: '',
    customerIdCard: '',
    accidentTime: '',
    returnTime: '',
    location: '',
    description: '',
    depositAmount: '',
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadAccident = useCallback(async () => {
    if (isNew || !id) return;
    try {
      setLoading(true);
      const [acc, photoList, logs] = await Promise.all([
        accidentApi.get(id),
        accidentApi.getPhotos(id),
        accidentApi.getAuditLogs(id),
      ]);
      setAccident(acc);
      setPhotos(photoList.sort((a, b) => new Date(a.uploadTime).getTime() - new Date(b.uploadTime).getTime()));
      setAuditLogs(logs);
      setForm({
        liability: acc.liability || '',
        insuranceEstimate: acc.insuranceEstimate?.toString() ?? '',
        assessmentAmount: acc.assessmentAmount?.toString() ?? '',
        deductionAmount: acc.deductionAmount?.toString() ?? '',
        replacementCar: acc.replacementCar,
        replacementCarInfo: acc.replacementCarInfo || '',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, showToast]);

  useEffect(() => {
    loadAccident();
  }, [loadAccident]);

  const isAssessmentLocked = accident
    ? accident.customerConfirmed && user?.role === UserRole.STAFF
    : false;

  const handleSaveAssessment = async () => {
    if (!accident) return;
    try {
      setSaving(true);
      const updates: UpdateAccidentRequest = {};
      if (form.liability !== (accident.liability || '')) updates.liability = form.liability || undefined;
      if (form.insuranceEstimate !== (accident.insuranceEstimate?.toString() ?? ''))
        updates.insuranceEstimate = form.insuranceEstimate ? Number(form.insuranceEstimate) : undefined;
      if (form.assessmentAmount !== (accident.assessmentAmount?.toString() ?? ''))
        updates.assessmentAmount = form.assessmentAmount ? Number(form.assessmentAmount) : undefined;
      if (form.deductionAmount !== (accident.deductionAmount?.toString() ?? ''))
        updates.deductionAmount = form.deductionAmount ? Number(form.deductionAmount) : undefined;
      await accidentApi.update(accident.id, updates);
      showToast('评估信息已保存');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReplacementCar = async () => {
    if (!accident) return;
    try {
      setSaving(true);
      await accidentApi.update(accident.id, {
        replacementCar: form.replacementCar,
        replacementCarInfo: form.replacementCarInfo || undefined,
      });
      showToast('代步车信息已保存');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!accident) return;
    try {
      setSaving(true);
      await accidentApi.confirm(accident.id);
      showToast('已确认费用');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!accident) return;
    try {
      setSaving(true);
      await accidentApi.requestClose(accident.id);
      showToast('已申请结案');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDispute = async () => {
    if (!accident) return;
    try {
      setSaving(true);
      await managerApi.markDisputed(accident.id);
      showToast('已标记争议');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!accident || !e.target.files?.length) return;
    try {
      setUploading(true);
      await accidentApi.uploadPhotos(accident.id, Array.from(e.target.files), photoDescription || undefined);
      setPhotoDescription('');
      showToast('照片上传成功');
      await loadAccident();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const data = {
        plateNumber: createForm.plateNumber,
        vehicleModel: createForm.vehicleModel,
        customerName: createForm.customerName,
        customerPhone: createForm.customerPhone,
        customerIdCard: createForm.customerIdCard || undefined,
        accidentTime: createForm.accidentTime ? new Date(createForm.accidentTime) : new Date(),
        returnTime: createForm.returnTime ? new Date(createForm.returnTime) : undefined,
        location: createForm.location || undefined,
        description: createForm.description || undefined,
        depositAmount: createForm.depositAmount ? Number(createForm.depositAmount) : undefined,
      };
      const created = await accidentApi.create(data);
      showToast('事故已创建');
      navigate(`/accidents/${created.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmEnabled = accident
    ? canConfirm(accident.status, accident.assessmentAmount)
    : false;
  const closeEnabled = accident
    ? canClose(accident.status, accident.assessmentAmount)
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (isNew) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">新建事故记录</h1>
        </div>

        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CREATE_FIELDS.map(field => (
              <div key={field.key}>
                <label className="label-text flex items-center gap-1.5">
                  <field.icon className="w-4 h-4 text-slate-400" />
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  className="input-field"
                  value={createForm[field.key as keyof typeof createForm]}
                  onChange={e => setCreateForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                事故时间
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={createForm.accidentTime}
                onChange={e => setCreateForm(prev => ({ ...prev, accidentTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                还车时间
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={createForm.returnTime}
                onChange={e => setCreateForm(prev => ({ ...prev, returnTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? '创建中...' : '创建事故'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accident) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        事故记录不存在
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/accidents')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {accident.plateNumber}
              </h1>
              <StatusBadge status={accident.status} isOverdue={accident.isOverdue} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              事故编号: {accident.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={!confirmEnabled || saving}
            className="btn-success flex items-center gap-2 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            确认费用
          </button>
          <button
            onClick={handleClose}
            disabled={!closeEnabled || saving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <XCircle className="w-4 h-4" />
            申请结案
          </button>
          <button
            onClick={handleDispute}
            disabled={saving}
            className="btn-danger flex items-center gap-2 text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            标记争议
          </button>
        </div>
      </div>

      {/* Basic Info Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {INFO_FIELDS.map(field => (
            <div key={field.key} className="flex items-start gap-3">
              <field.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">{field.label}</p>
                <p className="text-sm font-medium text-slate-800">
                  {field.key === 'accidentTime' || field.key === 'returnTime'
                    ? formatDate(accident[field.key as keyof Accident] as Date)
                    : (accident[field.key as keyof Accident] as string) || '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
        {accident.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">事故描述</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{accident.description}</p>
          </div>
        )}
      </div>

      {/* Liability & Assessment Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">责任与评估</h2>
          {isAssessmentLocked && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 px-3 py-1.5 rounded-lg">
              <Lock className="w-4 h-4" />
              <span>🔒 客户已确认，不可修改</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="label-text">责任初判</label>
            <select
              className="input-field"
              value={form.liability}
              onChange={e => setForm(prev => ({ ...prev, liability: e.target.value }))}
              disabled={isAssessmentLocked}
            >
              {LIABILITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              保险估价
            </label>
            <input
              type="number"
              className="input-field"
              value={form.insuranceEstimate}
              onChange={e => setForm(prev => ({ ...prev, insuranceEstimate: e.target.value }))}
              disabled={isAssessmentLocked}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              定损金额
              {isAssessmentLocked && <Lock className="w-3 h-3 text-amber-500" />}
            </label>
            <input
              type="number"
              className="input-field"
              value={form.assessmentAmount}
              onChange={e => setForm(prev => ({ ...prev, assessmentAmount: e.target.value }))}
              disabled={isAssessmentLocked}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              扣款金额
              {isAssessmentLocked && <Lock className="w-3 h-3 text-amber-500" />}
            </label>
            <input
              type="number"
              className="input-field"
              value={form.deductionAmount}
              onChange={e => setForm(prev => ({ ...prev, deductionAmount: e.target.value }))}
              disabled={isAssessmentLocked}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              押金金额
            </label>
            <div className="px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-600">
              {formatMoney(accident.depositAmount)}
            </div>
          </div>

          {accident.deductionAmount && accident.deductionAmount > 0 && (
            <div className="md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 px-4 py-2.5 rounded-lg">
                <DollarSign className="w-4 h-4" />
                <span>
                  扣款明细: 扣款 {formatMoney(accident.deductionAmount)} from 押金 {formatMoney(accident.depositAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveAssessment}
            disabled={saving || isAssessmentLocked}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存评估'}
          </button>
        </div>
      </div>

      {/* Replacement Car Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">代步车</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.replacementCar}
              onChange={e => setForm(prev => ({ ...prev, replacementCar: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">是否需要代步车</span>
          </label>

          {form.replacementCar && (
            <div>
              <label className="label-text">代步车信息</label>
              <input
                type="text"
                className="input-field"
                value={form.replacementCarInfo}
                onChange={e => setForm(prev => ({ ...prev, replacementCarInfo: e.target.value }))}
                placeholder="代步车车牌、型号等"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveReplacementCar}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存代步车信息'}
            </button>
          </div>
        </div>
      </div>

      {/* Photo Timeline Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-slate-500" />
            照片记录
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="input-field !w-48 !py-2 text-sm"
              placeholder="照片描述（可选）"
              value={photoDescription}
              onChange={e => setPhotoDescription(e.target.value)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              {uploading ? '上传中...' : '上传照片'}
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileImage className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">暂无照片记录</p>
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {photos.map(photo => (
                <div key={photo.id} className="relative flex gap-4">
                  <div className="absolute -left-3.5 top-3 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <div className="flex-1 card p-3 flex gap-4">
                    <a
                      href={getPhotoUrl(photo.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={getPhotoUrl(photo.fileName)}
                        alt={photo.originalName}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                      />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 truncate">
                        {photo.originalName}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(photo.uploadTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {photo.uploaderName}
                        </span>
                        <span>{formatFileSize(photo.fileSize)}</span>
                      </div>
                      {photo.description && (
                        <p className="text-xs text-slate-500 mt-1">{photo.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Card */}
      <div className="card">
        <button
          onClick={() => setAuditExpanded(!auditExpanded)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-500" />
            审计日志
            <span className="text-sm font-normal text-slate-400">({auditLogs.length})</span>
          </h2>
          {auditExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {auditExpanded && (
          <div className="px-6 pb-6">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">暂无审计记录</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex gap-4 text-sm border-b border-slate-100 pb-3 last:border-0">
                    <div className="shrink-0 w-40 text-slate-500 text-xs">
                      {formatDate(log.timestamp)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{log.operatorName}</span>
                        <span className="text-slate-500">{log.operation}</span>
                      </div>
                      {log.fieldName && (
                        <div className="mt-1 text-xs">
                          <span className="text-slate-500">{log.fieldName}: </span>
                          {log.oldValue && (
                            <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">
                              {log.oldValue}
                            </span>
                          )}
                          {log.oldValue && log.newValue && <span className="mx-1 text-slate-400">→</span>}
                          {log.newValue && (
                            <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                              {log.newValue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
