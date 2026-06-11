import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  AlertTriangle,
  ImagePlus,
  Calendar,
  MapPin,
  Hash,
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Eye,
  Link,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/ToastProvider';
import { Modal } from '@/components/ui/Modal';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { TEAMS, ROLE_LABELS } from '@/types';
import type { Team } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { checkDuplicateLocationToday } from '@/utils/duplicateCheck';
import type { Hazard } from '@/types';

interface FormData {
  boxNumber: string;
  location: string;
  description: string;
  photoUrl: string;
  team: Team | '';
  deadline: string;
}

const initialForm: FormData = {
  boxNumber: '',
  location: '',
  description: '',
  photoUrl: '',
  team: '',
  deadline: '',
};

const samplePhoto =
  'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=600';

export const HazardRegister: React.FC = () => {
  const navigate = useNavigate();
  const addHazard = useAppStore((s) => s.addHazard);
  const hazards = useAppStore((s) => s.hazards);
  const currentRole = useAppStore((s) => s.currentRole);
  const { showToast } = useToast();

  const [form, setForm] = React.useState<FormData>(initialForm);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});
  const [duplicates, setDuplicates] = React.useState<Hazard[] | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  if (currentRole !== 'SAFETY_OFFICER') {
    return (
      <div className="page-container">
        <div className="industrial-card p-12 text-center">
          <AlertTriangle size={56} className="mx-auto mb-4 text-warning-yellow" />
          <h2 className="text-xl font-bold mb-2">权限不足</h2>
          <p className="text-industrial-gray-500 mb-6">
            只有【安全员】角色可以登记隐患。请切换角色后再试。
          </p>
          <button className="btn-outline" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> 返回首页
          </button>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const nextErr: Partial<Record<keyof FormData, string>> = {};
    if (!form.boxNumber.trim()) nextErr.boxNumber = '请填写配电箱编号';
    if (!form.location.trim()) nextErr.location = '请填写配电箱位置';
    if (form.location.trim().length < 4)
      nextErr.location = '位置描述至少4个字，便于复查定位';
    if (!form.description.trim()) nextErr.description = '请填写隐患描述';
    if (form.description.trim().length < 10)
      nextErr.description = '请详细描述隐患（至少10字）';
    if (!form.team) nextErr.team = '请选择责任班组';
    if (!form.deadline) nextErr.deadline = '请选择整改期限';
    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const submitOrCheckDuplicate = () => {
    if (!validate()) {
      showToast('error', '请检查表单，修正红框提示的内容');
      return;
    }
    const check = checkDuplicateLocationToday(hazards, form.location);
    if (check.hasDuplicate) {
      setDuplicates(check.duplicates);
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    const created = addHazard({
      boxNumber: form.boxNumber.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      photoUrl: form.photoUrl.trim() || undefined,
      team: form.team as Team,
      deadline: form.deadline,
      createdBy: currentRole,
    });
    setDuplicates(null);
    showToast('success', `隐患登记成功！编号 ${created.boxNumber}`);
    navigate(`/hazards/${created.id}`);
  };

  const field = (key: keyof FormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const minDate = today;

  const inputCls = (k: keyof FormData) =>
    `input-base ${errors[k] ? 'border-danger-red focus:border-danger-red focus:ring-danger-red/20' : ''}`;

  const loadSample = () => {
    setForm({
      boxNumber: 'PDX-B-031',
      location: '6号楼南区1层外脚手架旁',
      description:
        '配电箱未加锁，箱体倾斜未固定，进出线口未装护圈，有杂物堆积在配电箱下方。',
      photoUrl: samplePhoto,
      team: 'B班',
      deadline: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    });
    setErrors({});
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-industrial-gray-500 hover:text-steel-blue mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> 返回
          </button>
          <h2 className="text-2xl font-black text-industrial-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[4px] bg-safety-orange/15 text-safety-orange flex items-center justify-center">
              <FilePlus size={22} strokeWidth={2.4} />
            </span>
            配电箱隐患登记
          </h2>
          <p className="text-sm text-industrial-gray-500 mt-1">
            请如实填写现场巡检发现的隐患信息，系统将自动分配给责任班组
          </p>
        </div>
        <button
          onClick={loadSample}
          className="btn-outline text-xs"
          type="button"
        >
          <Upload size={13} />
          载入示例
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 industrial-card p-6">
          <h3 className="section-title">
            <FileText size={18} className="text-safety-orange" />
            基本信息
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label className="label-base">
                <Hash size={13} className="inline mr-1 -mt-0.5 text-industrial-gray-400" />
                配电箱编号 <span className="text-danger-red">*</span>
              </label>
              <input
                value={form.boxNumber}
                onChange={(e) => field('boxNumber', e.target.value)}
                placeholder="如 PDX-A-001、PDX-B-015"
                className={inputCls('boxNumber')}
              />
              {errors.boxNumber && (
                <p className="text-xs text-danger-red mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> {errors.boxNumber}
                </p>
              )}
            </div>

            <div>
              <label className="label-base">
                <Users size={13} className="inline mr-1 -mt-0.5 text-industrial-gray-400" />
                责任班组 <span className="text-danger-red">*</span>
              </label>
              <select
                value={form.team}
                onChange={(e) => field('team', e.target.value)}
                className={inputCls('team')}
              >
                <option value="">— 请选择 —</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {form.team && (
                <div className="mt-1.5">
                  <TeamBadge team={form.team as Team} size="sm" />
                </div>
              )}
              {errors.team && (
                <p className="text-xs text-danger-red mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> {errors.team}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label-base">
                <MapPin size={13} className="inline mr-1 -mt-0.5 text-industrial-gray-400" />
                具体位置 <span className="text-danger-red">*</span>
              </label>
              <input
                value={form.location}
                onChange={(e) => field('location', e.target.value)}
                placeholder="如 1号楼东区3层东北角脚手架旁 / 塔吊基础西北侧"
                className={`${inputCls('location')} font-medium`}
              />
              {errors.location && (
                <p className="text-xs text-danger-red mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> {errors.location}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label-base">
                <AlertTriangle size={13} className="inline mr-1 -mt-0.5 text-danger-red" />
                隐患描述 <span className="text-danger-red">*</span>
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => field('description', e.target.value)}
                placeholder="请详细描述现场存在的问题，如漏保失效、箱体破损、接线混乱等..."
                className={inputCls('description')}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-danger-red flex items-center gap-1">
                    <AlertTriangle size={11} /> {errors.description}
                  </p>
                ) : (
                  <span className="text-[11px] text-industrial-gray-400">
                    建议说明隐患类型、严重程度、可能后果
                  </span>
                )}
                <span className="text-[11px] tabular-nums text-industrial-gray-400">
                  {form.description.length} 字
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label-base">
                <Link size={13} className="inline mr-1 -mt-0.5 text-industrial-gray-400" />
                现场照片链接
                <span className="text-industrial-gray-400 font-normal ml-1">
                  （粘贴图片URL，可多张用逗号分隔）
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  value={form.photoUrl}
                  onChange={(e) => field('photoUrl', e.target.value)}
                  placeholder="https://..."
                  className={inputCls('photoUrl')}
                />
                {form.photoUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="btn-outline px-3"
                  >
                    <Eye size={15} />
                    预览
                  </button>
                )}
              </div>
              {form.photoUrl.trim() && (
                <div className="mt-2 h-32 rounded-[4px] overflow-hidden border border-industrial-gray-200">
                  <img
                    src={form.photoUrl.split(',')[0].trim()}
                    alt="预览"
                    className="w-full h-full object-cover"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="%23F1F5F9" width="400" height="200"/><text x="50%25" y="50%25" fill="%2394A3B8" font-family="sans-serif" text-anchor="middle" dy=".3em">图片无法加载，请检查链接</text></svg>')
                    }
                  />
                </div>
              )}
            </div>

            <div>
              <label className="label-base">
                <Calendar size={13} className="inline mr-1 -mt-0.5 text-industrial-gray-400" />
                整改期限 <span className="text-danger-red">*</span>
              </label>
              <input
                type="date"
                min={minDate}
                value={form.deadline}
                onChange={(e) => field('deadline', e.target.value)}
                className={inputCls('deadline')}
              />
              {form.deadline && (
                <p className="text-xs text-industrial-gray-500 mt-1">
                  要求 <b className="text-steel-blue">{formatDate(form.deadline)}</b> 前完成整改
                </p>
              )}
              {errors.deadline && (
                <p className="text-xs text-danger-red mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> {errors.deadline}
                </p>
              )}
            </div>

            <div className="flex items-end">
              <div className="p-3 rounded-[4px] bg-amber-50 border border-amber-200 w-full text-xs text-amber-800 leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1">
                  <AlertTriangle size={13} /> 登记人
                </div>
                {ROLE_LABELS[currentRole]} · 登记时间将自动记录
              </div>
            </div>
          </div>

          <div className="divider-thin" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-industrial-gray-500">
              提交后系统自动分配给所选班组，同时进入「待整改」状态
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="btn-outline"
              >
                清空重置
              </button>
              <button
                type="button"
                onClick={submitOrCheckDuplicate}
                className="btn-primary px-6"
              >
                <CheckCircle2 size={16} />
                提交登记
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="industrial-card p-5 bg-gradient-to-br from-steel-blue to-steel-blue-dark text-white border-0">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <ImagePlus size={18} /> 现场拍照指引
            </h4>
            <ul className="space-y-2 text-xs text-white/85 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-safety-orange font-black">01</span>
                拍全景：一张能看清配电箱整体位置和周围环境
              </li>
              <li className="flex gap-2">
                <span className="text-safety-orange font-black">02</span>
                拍特写：打开箱门拍内部接线、端子、漏保标识
              </li>
              <li className="flex gap-2">
                <span className="text-safety-orange font-black">03</span>
                拍问题点：针对隐患局部放大，保证清晰可辨
              </li>
              <li className="flex gap-2">
                <span className="text-safety-orange font-black">04</span>
                上传：上传至图床后把图片链接粘贴到上方
              </li>
            </ul>
          </div>

          <div className="industrial-card p-5">
            <h4 className="font-bold mb-3 text-industrial-gray-800 flex items-center gap-2">
              <AlertTriangle size={17} className="text-danger-red" /> 常见隐患类型
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                '漏保失效',
                '箱体破损',
                '无门无锁',
                '接线混乱',
                '无PE接地',
                '电缆破损',
                '周围积水',
                '无防砸棚',
                '无重复接地',
                '标识不清',
                '进出线无护圈',
                '箱前堆物',
              ].map((tag) => (
                <span
                  key={tag}
                  className="chip bg-industrial-gray-50 text-industrial-gray-600 border-industrial-gray-200 cursor-default hover:bg-steel-blue/5 hover:text-steel-blue hover:border-steel-blue/30 transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="industrial-card p-5">
            <h4 className="font-bold mb-3 text-industrial-gray-800 flex items-center gap-2">
              <CheckCircle2 size={17} className="text-success-green" /> 今日统计
            </h4>
            <div className="text-3xl font-black tabular-nums text-success-green mb-1">
              {
                hazards.filter((h) => h.createdAt.slice(0, 10) === today).length
              }
            </div>
            <div className="text-xs text-industrial-gray-500">
              条今日登记的隐患记录
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={duplicates !== null}
        onClose={() => setDuplicates(null)}
        size="lg"
        title={
          <span className="flex items-center gap-2 text-warning-yellow">
            <AlertTriangle size={20} />
            检测到同位置今天已有登记记录
          </span>
        }
        footer={
          <>
            <button className="btn-outline" onClick={() => setDuplicates(null)}>
              取消，返回修改
            </button>
            <button className="btn-primary" onClick={doSubmit}>
              <CheckCircle2 size={15} />
              确认仍然上报（共{duplicates?.length ?? 0}条重复）
            </button>
          </>
        }
      >
        <div className="mb-4 p-4 rounded-[4px] bg-amber-50 border border-amber-200 text-sm text-amber-800 leading-relaxed">
          根据位置模糊匹配和登记日期判断，以下记录与您当前填写的位置非常接近。
          请确认是否为<b>同一隐患重复上报</b>。如非重复，可点击右下角"确认仍然上报"。
        </div>
        <div className="space-y-3">
          {duplicates?.map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-[4px] border border-industrial-gray-200 hover:border-steel-blue/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs text-industrial-gray-500">
                  #{d.boxNumber}
                </span>
                <TeamBadge team={d.team} size="sm" />
                <span className="text-[11px] text-industrial-gray-400 ml-auto tabular-nums">
                  {formatDate(d.createdAt)}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-sm mb-1">
                <MapPin size={13} className="mt-0.5 text-industrial-gray-400 flex-shrink-0" />
                <span className="font-medium">{d.location}</span>
              </div>
              <p className="text-xs text-industrial-gray-600 line-clamp-2 leading-relaxed">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        title="图片预览"
      >
        <div className="space-y-3">
          {form.photoUrl
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
            .map((url, i) => (
              <div key={i} className="rounded-[4px] overflow-hidden border">
                <img
                  src={url}
                  alt={`图片 ${i + 1}`}
                  className="w-full max-h-[400px] object-contain bg-industrial-gray-100"
                />
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
};
