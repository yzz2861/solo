import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Alert, LeaveRecord, Member } from '../types';
import { StarRating } from './StarRating';
import { useStore, useMembers } from '../store/useStore';
import { getDefaultNextRehearsalDate, formatDate } from '../utils/date';
import { getVoicePartName } from '../utils/voiceParts';
import { generateAlertsForNewLeave } from '../utils/alerts';
import { AlertCard } from './AlertCard';

interface LeaveFormProps {
  onClose: () => void;
  preselectedMemberId?: string;
}

const leaveReasons = [
  '生病',
  '工作加班',
  '出差',
  '家中有事',
  '个人原因',
  '其他',
];

export const LeaveForm = ({ onClose, preselectedMemberId }: LeaveFormProps) => {
  const addLeave = useStore((state) => state.addLeave);
  const members = useMembers();
  const activeMembers = members.filter((m) => m.status === 'active');

  const [formData, setFormData] = useState({
    memberId: preselectedMemberId || '',
    rehearsalDate: getDefaultNextRehearsalDate(),
    reason: '',
    customReason: '',
    proficiency: 3,
    willPerform: true,
    notes: '',
  });

  const [generatedAlerts, setGeneratedAlerts] = useState<Alert[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (formData.memberId && formData.rehearsalDate && formData.reason) {
      const tempLeave: Omit<LeaveRecord, 'id' | 'createdAt'> = {
        memberId: formData.memberId,
        rehearsalDate: formData.rehearsalDate,
        reason: formData.reason === '其他' ? formData.customReason : formData.reason,
        proficiency: formData.proficiency,
        willPerform: formData.willPerform,
        notes: formData.notes,
      };
      
      const tempState = useStore.getState();
      const alerts = generateAlertsForNewLeave(tempLeave, tempState.members, tempState.leaveRecords);
      
      if (alerts.length > 0) {
        setGeneratedAlerts(alerts);
      }
    }
  }, [formData.memberId, formData.rehearsalDate, formData.reason, formData.customReason, formData.proficiency, formData.notes, formData.willPerform]);

  const selectedMember = activeMembers.find((m) => m.id === formData.memberId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const leaveData: Omit<LeaveRecord, 'id' | 'createdAt'> = {
      memberId: formData.memberId,
      rehearsalDate: formData.rehearsalDate,
      reason: formData.reason === '其他' ? formData.customReason : formData.reason,
      proficiency: formData.proficiency,
      willPerform: formData.willPerform,
      notes: formData.notes,
    };

    const alerts = addLeave(leaveData);
    if (alerts.length > 0) {
      setGeneratedAlerts(alerts);
    }
    
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 1:
        return formData.memberId && formData.rehearsalDate;
      case 2:
        return formData.reason && (formData.reason !== '其他' || formData.customReason);
      default:
        return true;
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-bounce-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold font-serif text-burgundy-900 mb-2">
            请假提交成功！
          </h3>
          <p className="text-charcoal/60">
            {selectedMember?.name} 的请假已记录
          </p>
          {generatedAlerts.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
              <Info className="w-4 h-4 inline mr-1" />
              同时产生 {generatedAlerts.length} 条相关提醒
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-bounce-in max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-burgundy-100 z-10">
          <div className="flex items-center justify-between p-6">
            <h3 className="text-xl font-bold font-serif text-burgundy-900">
              提交请假
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-burgundy-50 transition-colors"
            >
              <X className="w-5 h-5 text-charcoal/50" />
            </button>
          </div>

          {/* 步骤指示器 */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      currentStep >= step
                        ? 'bg-burgundy-700 text-white'
                        : 'bg-burgundy-100 text-burgundy-400'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-16 sm:w-24 h-1 mx-2 rounded transition-all ${
                        currentStep > step ? 'bg-burgundy-700' : 'bg-burgundy-100'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-charcoal/50">
              <span>基本信息</span>
              <span>请假详情</span>
              <span>确认提交</span>
            </div>
          </div>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 步骤1：基本信息 */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="label">选择成员</label>
                <select
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  className="select-field"
                >
                  <option value="">请选择成员</option>
                  {activeMembers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {getVoicePartName(member.voicePart)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label">排练日期</label>
                <input
                  type="date"
                  value={formData.rehearsalDate}
                  onChange={(e) => setFormData({ ...formData, rehearsalDate: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-charcoal/50 mt-1">
                  {formData.rehearsalDate && formatDate(formData.rehearsalDate)}
                </p>
              </div>
            </div>
          )}

          {/* 步骤2：请假详情 */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="label">请假原因</label>
                <div className="grid grid-cols-2 gap-2">
                  {leaveReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setFormData({ ...formData, reason })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        formData.reason === reason
                          ? 'border-burgundy-700 bg-burgundy-50 text-burgundy-700'
                          : 'border-burgundy-100 hover:border-burgundy-300 text-charcoal/70'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {formData.reason === '其他' && (
                <div>
                  <label className="label">请说明原因</label>
                  <textarea
                    value={formData.customReason}
                    onChange={(e) => setFormData({ ...formData, customReason: e.target.value })}
                    className="input-field min-h-[80px] resize-none"
                    placeholder="请简要说明请假原因..."
                  />
                </div>
              )}

              <div>
                <label className="label">曲目熟练度自评</label>
                <StarRating
                  value={formData.proficiency}
                  onChange={(value) => setFormData({ ...formData, proficiency: value })}
                  size="lg"
                />
                <p className="text-xs text-charcoal/50 mt-1">
                  1星=完全不会，5星=非常熟练
                </p>
              </div>

              <div>
                <label className="label">是否参加演出</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="willPerform"
                      checked={formData.willPerform === true}
                      onChange={() => setFormData({ ...formData, willPerform: true })}
                      className="w-4 h-4 text-burgundy-700 focus:ring-burgundy-500"
                    />
                    <span className="text-sm">参加</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="willPerform"
                      checked={formData.willPerform === false}
                      onChange={() => setFormData({ ...formData, willPerform: false })}
                      className="w-4 h-4 text-burgundy-700 focus:ring-burgundy-500"
                    />
                    <span className="text-sm">不参加</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="label">备注（选填）</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="如有特殊情况请在此说明..."
                />
                <p className="text-xs text-charcoal/50 mt-1">
                  如需线上练习请在此说明
                </p>
              </div>
            </div>
          )}

          {/* 步骤3：确认提交 */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-burgundy-50 rounded-xl p-5">
                <h4 className="font-semibold text-burgundy-900 mb-3">请确认请假信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">成员：</span>
                    <span className="font-medium">{selectedMember?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">声部：</span>
                    <span className="font-medium">
                      {selectedMember && getVoicePartName(selectedMember.voicePart)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">排练日期：</span>
                    <span className="font-medium">
                      {formData.rehearsalDate && formatDate(formData.rehearsalDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">请假原因：</span>
                    <span className="font-medium">
                      {formData.reason === '其他' ? formData.customReason : formData.reason}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal/60">曲目熟练度：</span>
                    <StarRating value={formData.proficiency} readOnly size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">参加演出：</span>
                    <span className={`font-medium ${formData.willPerform ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formData.willPerform ? '是' : '否'}
                    </span>
                  </div>
                  {formData.notes && (
                    <div className="pt-2 border-t border-burgundy-200">
                      <span className="text-charcoal/60">备注：</span>
                      <p className="mt-1 text-charcoal">{formData.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 智能提醒预览 */}
              {generatedAlerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      智能提醒（{generatedAlerts.length}条）
                    </span>
                  </div>
                  <div className="space-y-2">
                    {generatedAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 btn-outline"
              >
                上一步
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-outline"
              >
                取消
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed(currentStep)}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            ) : (
              <button
                type="submit"
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                确认提交
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
