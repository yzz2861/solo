import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Hash,
  AlertOctagon,
  Shield,
  Wrench,
  CheckSquare,
  XSquare,
  CheckCircle2,
  XCircle,
  Camera,
  MessageSquare,
  Send,
  Lock,
  History,
  Clock,
  AlertTriangle,
  Image,
  Eye,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/ToastProvider';
import { StatusTimeline } from '@/components/hazard/StatusTimeline';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import {
  STATUS_LABELS,
  ROLE_LABELS,
} from '@/types';
import type { HazardStatus, UserRole } from '@/types';
import {
  formatDate,
  formatDateTime,
  formatRelative,
} from '@/utils/dateUtils';

type RectifyForm = { description: string; photoUrl: string };
type ReviewForm = { passed: boolean; comment: string };

export const HazardDetail: React.FC = () => {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const getHazardById = useAppStore((s) => s.getHazardById);
  const submitRectification = useAppStore((s) => s.submitRectification);
  const submitReview = useAppStore((s) => s.submitReview);
  const currentRole = useAppStore((s) => s.currentRole);
  const hazards = useAppStore((s) => s.hazards);

  const hazard = hazards.find((h) => h.id === id) ?? getHazardById(id);

  const [rectForm, setRectForm] = React.useState<RectifyForm>({
    description: '',
    photoUrl: '',
  });
  const [reviewForm, setReviewForm] = React.useState<ReviewForm>({
    passed: true,
    comment: '',
  });
  const [rectErr, setRectErr] = React.useState('');
  const [reviewErr, setReviewErr] = React.useState('');

  const action = sp.get('action');
  const rectRef = React.useRef<HTMLDivElement>(null);
  const reviewRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (action === 'rectify' && rectRef.current) {
      setTimeout(() => rectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
    if (action === 'review' && reviewRef.current) {
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [action, hazard]);

  if (!hazard) {
    return (
      <div className="page-container">
        <div className="industrial-card p-12 text-center">
          <AlertOctagon size={56} className="mx-auto mb-4 text-danger-red" />
          <h2 className="text-xl font-bold mb-2">记录不存在</h2>
          <p className="text-industrial-gray-500 mb-6">该隐患记录可能已被删除或编号错误。</p>
          <button className="btn-steel" onClick={() => navigate('/hazards')}>
            <ArrowLeft size={16} /> 返回列表
          </button>
        </div>
      </div>
    );
  }

  const isLocked = hazard.status === 'CLOSED';
  const deadlineRel = formatRelative(hazard.deadline);

  const canRectify =
    !isLocked &&
    (currentRole === 'ELECTRICIAN' || currentRole === 'SAFETY_OFFICER') &&
    (hazard.status === 'PENDING_RECTIFICATION' || hazard.status === 'REJECTED');

  const canReview =
    !isLocked &&
    (currentRole === 'SAFETY_OFFICER' || currentRole === 'PROJECT_MANAGER') &&
    hazard.status === 'PENDING_REVIEW';

  const handleSubmitRectification = async () => {
    setRectErr('');
    if (!rectForm.description.trim()) {
      setRectErr('请填写整改说明');
      return;
    }
    if (rectForm.description.trim().length < 8) {
      setRectErr('整改说明至少8字，请详细描述处理过程');
      return;
    }
    const ok = await submitRectification(hazard.id, {
      description: rectForm.description.trim(),
      photoUrl: rectForm.photoUrl.trim() || undefined,
      submittedBy: currentRole,
    });
    if (ok) {
      showToast('success', '整改已提交，等待安全员复查验收');
      setRectForm({ description: '', photoUrl: '' });
    } else {
      showToast('error', '提交失败，该记录可能已被关闭');
    }
  };

  const handleSubmitReview = async () => {
    setReviewErr('');
    if (!reviewForm.passed && !reviewForm.comment.trim()) {
      setReviewErr('打回时必须填写复查意见，说明需要如何整改');
      return;
    }
    const ok = await submitReview(hazard.id, {
      passed: reviewForm.passed,
      comment: reviewForm.comment.trim(),
      reviewedBy: currentRole,
    });
    if (ok) {
      showToast(
        reviewForm.passed ? 'success' : 'warning',
        reviewForm.passed
          ? `复查通过，隐患已闭环 🔒`
          : `已打回，打回次数 ${hazard.rejectCount + 1} 次`
      );
      setReviewForm({ passed: true, comment: '' });
    } else {
      showToast('error', '提交失败，该记录可能已被关闭');
    }
  };

  const lastRect = hazard.rectifications[hazard.rectifications.length - 1];
  const allRects = hazard.rectifications;
  const allReviews = hazard.reviews;

  return (
    <div className="page-container">
      {isLocked && (
        <div
          className="mb-5 p-4 rounded-md border-2 border-success-green/40
            bg-gradient-to-r from-green-50 via-white to-green-50
            flex items-center gap-4 animate-slide-in"
        >
          <div className="w-11 h-11 rounded-full bg-success-green/15 text-success-green flex items-center justify-center">
            <Lock size={22} strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-success-green text-base flex items-center gap-2">
              <CheckCircle2 size={18} />
              此隐患已关闭并锁定
            </div>
            <p className="text-sm text-industrial-gray-600 mt-0.5">
              普通用户无法再修改或重新提交。如需重新开启请联系管理员。
            </p>
          </div>
          <StatusBadge status="CLOSED" />
        </div>
      )}

      {!isLocked && hazard.isOverdue && (
        <div
          className="mb-5 p-4 rounded-md border-2 border-danger-red/40
            bg-gradient-to-r from-red-50 via-white to-red-50
            flex items-center gap-4 animate-slide-in danger-pattern"
        >
          <div className="w-11 h-11 rounded-full bg-danger-red/15 text-danger-red flex items-center justify-center animate-pulse-slow">
            <Flame size={22} strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-danger-red text-base flex items-center gap-2">
              <AlertTriangle size={18} />
              已逾期！{deadlineRel.text}
            </div>
            <p className="text-sm text-industrial-gray-600 mt-0.5">
              整改期限为 <b>{formatDate(hazard.deadline)}</b>，请立即处理并提交。
            </p>
          </div>
          <StatusBadge status={hazard.status} isOverdue />
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost text-sm px-2 -ml-2"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div>
          <h2 className="text-2xl font-black text-industrial-gray-900 flex items-center gap-2.5">
            <span className="font-mono font-bold text-steel-blue text-xl">
              #{hazard.boxNumber}
            </span>
            <span className="truncate">{hazard.location}</span>
          </h2>
          <p className="text-xs text-industrial-gray-500 mt-1 flex items-center gap-3">
            <span>登记时间：{formatDateTime(hazard.createdAt)}</span>
            <span>登记人：{ROLE_LABELS[hazard.createdBy]}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={hazard.status} isOverdue={hazard.isOverdue} />
          <TeamBadge team={hazard.team} />
        </div>
      </div>

      <div className="industrial-card p-6 mb-5">
        <h3 className="section-title mb-5">
          <History size={18} className="text-safety-orange" />
          处理流程进度
        </h3>
        <StatusTimeline hazard={hazard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="industrial-card p-6">
            <h3 className="section-title mb-4">
              <AlertTriangle size={18} className="text-danger-red" />
              隐患详情
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
              <InfoRow
                icon={<Hash size={14} />}
                label="配电箱编号"
                value={<span className="font-mono font-bold text-steel-blue">{hazard.boxNumber}</span>}
              />
              <InfoRow
                icon={<MapPin size={14} />}
                label="位置"
                value={hazard.location}
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="整改期限"
                value={
                  <span className={deadlineRel.isOverdue ? 'text-danger-red font-bold' : ''}>
                    {formatDate(hazard.deadline)} · {deadlineRel.text}
                  </span>
                }
              />
              <InfoRow
                icon={<Clock size={14} />}
                label="当前状态"
                value={<StatusBadge status={hazard.status} isOverdue={hazard.isOverdue} />}
              />
              {hazard.rejectCount > 0 && (
                <InfoRow
                  icon={<XCircle size={14} />}
                  label="累计打回"
                  value={
                    <span className="chip bg-danger-red/10 text-danger-red border-danger-red/30">
                      {hazard.rejectCount} 次
                    </span>
                  }
                />
              )}
            </div>

            <div className="mb-4">
              <div className="text-xs font-semibold text-industrial-gray-500 mb-2 uppercase tracking-wider">
                隐患描述
              </div>
              <div className="p-4 rounded-[4px] bg-industrial-gray-50 border border-industrial-gray-200 text-industrial-gray-800 leading-relaxed whitespace-pre-wrap">
                {hazard.description}
              </div>
            </div>

            {hazard.photoUrl && (
              <PhotoGallery urls={hazard.photoUrl} label="现场隐患照片" />
            )}
          </div>

          {allRects.length > 0 && (
            <div className="industrial-card p-6">
              <h3 className="section-title mb-4">
                <Wrench size={18} className="text-pending-blue" />
                整改提交记录 <span className="text-xs font-normal text-industrial-gray-500">（共{allRects.length}次）</span>
              </h3>
              <div className="space-y-4">
                {allRects.map((r, idx) => (
                  <TimelineItem
                    key={r.id}
                    position={idx === allRects.length - 1 ? 'last' : 'middle'}
                    icon={<Wrench size={16} />}
                    iconBg="bg-blue-100 text-pending-blue border-blue-300"
                    title={`第 ${idx + 1} 次整改 · ${ROLE_LABELS[r.submittedBy]}`}
                    time={formatDateTime(r.submittedAt)}
                  >
                    <div className="p-3 rounded-[4px] bg-blue-50/60 border border-blue-100 text-industrial-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                      {r.description}
                    </div>
                    {r.photoUrl && (
                      <div className="mt-3">
                        <PhotoGallery urls={r.photoUrl} label="整改后照片" compact />
                      </div>
                    )}
                  </TimelineItem>
                ))}
              </div>
            </div>
          )}

          {allReviews.length > 0 && (
            <div className="industrial-card p-6">
              <h3 className="section-title mb-4">
                <Shield size={18} className="text-success-green" />
                复查验收记录 <span className="text-xs font-normal text-industrial-gray-500">（共{allReviews.length}次）</span>
              </h3>
              <div className="space-y-4">
                {allReviews.map((r, idx) => (
                  <TimelineItem
                    key={r.id}
                    position={idx === allReviews.length - 1 ? 'last' : 'middle'}
                    icon={r.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    iconBg={
                      r.passed
                        ? 'bg-green-100 text-success-green border-green-300'
                        : 'bg-red-100 text-danger-red border-red-300'
                    }
                    title={
                      <>
                        <span className={r.passed ? 'text-success-green' : 'text-danger-red'}>
                          {r.passed ? '复查通过 ✅' : '复查打回 ❌'}
                        </span>
                        <span className="text-industrial-gray-500 font-normal text-xs ml-2">
                          {ROLE_LABELS[r.reviewedBy]}
                        </span>
                      </>
                    }
                    time={formatDateTime(r.reviewedAt)}
                  >
                    <div
                      className={`p-3 rounded-[4px] border text-sm leading-relaxed whitespace-pre-wrap ${
                        r.passed
                          ? 'bg-green-50/60 border-green-200 text-industrial-gray-800'
                          : 'bg-red-50/60 border-red-200 text-danger-red'
                      }`}
                    >
                      {r.comment || (
                        <span className="text-industrial-gray-400 italic">（无意见填写）</span>
                      )}
                    </div>
                  </TimelineItem>
                ))}
              </div>
            </div>
          )}

          {canRectify && (
            <div ref={rectRef} className="industrial-card p-6 ring-2 ring-pending-blue/20">
              <h3 className="section-title mb-4">
                <Wrench size={18} className="text-pending-blue" />
                电工提交整改
              </h3>
              <FormSection
                label="整改说明 <span class='text-danger-red'>*</span>"
                hint="请说明采取了哪些措施，更换了什么部件，处理后的具体情况"
                error={rectErr}
              >
                <textarea
                  rows={4}
                  className="input-base"
                  value={rectForm.description}
                  onChange={(e) => {
                    setRectForm((x) => ({ ...x, description: e.target.value }));
                    if (rectErr) setRectErr('');
                  }}
                  placeholder="例：已更换正泰品牌63A漏保；重新整理接线并标识回路；箱体门已修复并重新上锁..."
                />
              </FormSection>

              <FormSection label="整改后照片链接（选填）">
                <div className="flex gap-2">
                  <input
                    className="input-base flex-1"
                    value={rectForm.photoUrl}
                    onChange={(e) =>
                      setRectForm((x) => ({ ...x, photoUrl: e.target.value }))
                    }
                    placeholder="https://... 多张用逗号分隔"
                  />
                  {rectForm.photoUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => window.open(rectForm.photoUrl.split(',')[0], '_blank')}
                      className="btn-outline px-3"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                </div>
              </FormSection>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-industrial-gray-200">
                <p className="text-xs text-industrial-gray-500">
                  提交后将进入「待复查」状态，等待安全员验收
                </p>
                <button className="btn-steel px-6" onClick={handleSubmitRectification}>
                  <Send size={15} />
                  提交整改
                </button>
              </div>
            </div>
          )}

          {canReview && (
            <div ref={reviewRef} className="industrial-card p-6 ring-2 ring-safety-orange/30">
              <h3 className="section-title mb-4">
                <CheckSquare size={18} className="text-safety-orange" />
                安全员复查验收
              </h3>

              {lastRect && (
                <div className="mb-5 p-4 rounded-[4px] bg-blue-50/40 border border-blue-200">
                  <div className="text-xs font-semibold text-pending-blue mb-2 flex items-center gap-1.5">
                    <Wrench size={13} />
                    最近一次整改 · {ROLE_LABELS[lastRect.submittedBy]} ·{' '}
                    {formatDateTime(lastRect.submittedAt)}
                  </div>
                  <div className="text-sm text-industrial-gray-800 whitespace-pre-wrap leading-relaxed">
                    {lastRect.description}
                  </div>
                  {lastRect.photoUrl && (
                    <div className="mt-3">
                      <PhotoGallery urls={lastRect.photoUrl} label="整改后照片" compact />
                    </div>
                  )}
                </div>
              )}

              <FormSection label="复查结论">
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-[4px] border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      reviewForm.passed
                        ? 'border-success-green bg-green-50/60'
                        : 'border-industrial-gray-200 hover:border-industrial-gray-400 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={reviewForm.passed}
                      onChange={() => setReviewForm((x) => ({ ...x, passed: true }))}
                    />
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        reviewForm.passed
                          ? 'bg-success-green text-white'
                          : 'bg-industrial-gray-100 text-industrial-gray-400'
                      }`}
                    >
                      <CheckCircle2 size={20} strokeWidth={2.4} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-industrial-gray-900">
                        复查通过
                      </div>
                      <div className="text-[11px] text-industrial-gray-500">
                        隐患闭环，记录锁定 🔒
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-[4px] border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      !reviewForm.passed
                        ? 'border-danger-red bg-red-50/60'
                        : 'border-industrial-gray-200 hover:border-industrial-gray-400 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={!reviewForm.passed}
                      onChange={() => setReviewForm((x) => ({ ...x, passed: false }))}
                    />
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        !reviewForm.passed
                          ? 'bg-danger-red text-white'
                          : 'bg-industrial-gray-100 text-industrial-gray-400'
                      }`}
                    >
                      <XSquare size={20} strokeWidth={2.4} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-industrial-gray-900">
                        复查打回
                      </div>
                      <div className="text-[11px] text-industrial-gray-500">
                        打回重新整改，记录打回次数
                      </div>
                    </div>
                  </label>
                </div>
              </FormSection>

              <FormSection
                label={
                  <>
                    复查意见
                    {!reviewForm.passed && (
                      <span className="text-danger-red ml-1">*（打回必填）</span>
                    )}
                  </>
                }
                hint={
                  !reviewForm.passed
                    ? '请详细说明哪些方面仍不合格，需要如何重新整改'
                    : '选填，可记录对现场整改工作的总体评价'
                }
                error={reviewErr}
              >
                <textarea
                  rows={3}
                  className="input-base"
                  value={reviewForm.comment}
                  onChange={(e) => {
                    setReviewForm((x) => ({ ...x, comment: e.target.value }));
                    if (reviewErr) setReviewErr('');
                  }}
                  placeholder={
                    !reviewForm.passed
                      ? '例：接线端子标识仍未补齐；箱体门锁扣未装好，关不严密；漏保测试未做记录...'
                      : '例：整改到位，符合临电规范要求，同意关闭。'
                  }
                />
              </FormSection>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-industrial-gray-200">
                <p className="text-xs text-industrial-gray-500">
                  当前角色：{ROLE_LABELS[currentRole]}
                </p>
                <button
                  className={reviewForm.passed ? 'btn-primary px-6' : 'btn-danger px-6'}
                  onClick={handleSubmitReview}
                >
                  {reviewForm.passed ? (
                    <>
                      <CheckCircle2 size={15} />
                      确认通过 · 关闭隐患
                    </>
                  ) : (
                    <>
                      <RotateCcw size={15} />
                      确认打回 · 重新整改
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="industrial-card p-5 sticky top-20">
            <h3 className="section-title mb-4">
              <MessageSquare size={18} className="text-steel-blue" />
              操作权限指引
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { role: 'SAFETY_OFFICER' as UserRole, act: '可登记、复查、打回/通过', ok: true },
                { role: 'ELECTRICIAN' as UserRole, act: '可查看任务、提交整改', ok: currentRole === 'ELECTRICIAN' },
                { role: 'PROJECT_MANAGER' as UserRole, act: '可查看统计、导出整改单', ok: false },
                { role: 'SAFETY_INSPECTOR' as UserRole, act: '可安监例会筛查记录', ok: false },
              ].map((i) => (
                <div
                  key={i.role}
                  className={`p-3 rounded-[4px] border ${
                    currentRole === i.role
                      ? 'bg-steel-blue/5 border-steel-blue/30'
                      : 'bg-industrial-gray-50 border-industrial-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-industrial-gray-800 flex items-center gap-1.5">
                      {currentRole === i.role && (
                        <span className="w-2 h-2 rounded-full bg-safety-orange" />
                      )}
                      {ROLE_LABELS[i.role]}
                    </span>
                    {currentRole === i.role && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-safety-orange/15 text-safety-orange font-bold">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-industrial-gray-500">{i.act}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-dashed border-industrial-gray-200">
              <div className="text-xs text-industrial-gray-500 mb-2">当前状态</div>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={hazard.status} isOverdue={hazard.isOverdue} />
                {hazard.status !== 'CLOSED' && (
                  <span className="chip bg-industrial-gray-50 text-industrial-gray-600 border-industrial-gray-200">
                    {STATUS_LABELS[hazard.status]}
                  </span>
                )}
              </div>
              {!isLocked && !canRectify && !canReview && (
                <div className="p-3 rounded-[4px] bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <div className="font-bold mb-0.5 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    操作提示
                  </div>
                  {hazard.status === 'PENDING_REVIEW'
                    ? '当前角色不能复查，请切换为安全员。'
                    : hazard.status === 'PENDING_RECTIFICATION' || hazard.status === 'REJECTED'
                    ? '当前角色不能提交整改，请切换为电工。'
                    : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-7 h-7 rounded bg-industrial-gray-100 text-industrial-gray-500 flex items-center justify-center flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] uppercase tracking-wider text-industrial-gray-400 mb-0.5">
        {label}
      </div>
      <div className="text-sm text-industrial-gray-800 font-medium">{value}</div>
    </div>
  </div>
);

const FormSection: React.FC<{
  label: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, hint, error, children }) => (
  <div className="mb-4 last:mb-0">
    <div className="label-base" dangerouslySetInnerHTML={{ __html: typeof label === 'string' ? label : '' }}>
      {typeof label !== 'string' && label}
    </div>
    {children}
    {error ? (
      <p className="text-xs text-danger-red mt-1.5 flex items-center gap-1">
        <AlertTriangle size={11} /> {error}
      </p>
    ) : hint ? (
      <p className="text-[11px] text-industrial-gray-500 mt-1.5">{hint}</p>
    ) : null}
  </div>
);

const TimelineItem: React.FC<{
  position: 'first' | 'middle' | 'last';
  icon: React.ReactNode;
  iconBg: string;
  title: React.ReactNode;
  time: string;
  children: React.ReactNode;
}> = ({ position, icon, iconBg, title, time, children }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center flex-shrink-0">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white ${iconBg}`}
      >
        {icon}
      </div>
      {position !== 'last' && (
        <div className="w-0.5 flex-1 bg-industrial-gray-200 mt-1 min-h-[12px]" />
      )}
    </div>
    <div className="flex-1 pb-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="font-bold text-sm text-industrial-gray-900">{title}</div>
        <span className="text-[11px] text-industrial-gray-400 tabular-nums whitespace-nowrap">
          {time}
        </span>
      </div>
      {children}
    </div>
  </div>
);

const PhotoGallery: React.FC<{
  urls: string;
  label?: string;
  compact?: boolean;
}> = ({ urls, label, compact }) => {
  const list = urls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (!list.length) return null;
  return (
    <div>
      {label && (
        <div className="text-[11px] font-semibold text-industrial-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Image size={12} /> {label}
        </div>
      )}
      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {list.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`relative group block rounded-[4px] overflow-hidden border border-industrial-gray-200 bg-industrial-gray-100 ${
              compact ? 'h-20' : 'h-28'
            } hover:shadow-md transition-all`}
          >
            <img
              src={url}
              alt={`photo-${i}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) =>
                ((e.target as HTMLImageElement).style.display = 'none')
              }
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="px-2 py-1 rounded bg-black/60 text-white text-[11px] flex items-center gap-1">
                <Eye size={11} /> 查看原图
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};


