import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { GradingBadge } from '@/components/common/GradingBadge';
import { HighlightedContent } from '@/components/common/HighlightedContent';
import { 
  GradingLevel, 
  GRADING_LEVEL_LABELS, 
  REQUEST_STATUS_LABELS,
  ReferralType,
  REFERRAL_TYPE_LABELS,
  ProcessLog
} from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Send, 
  User, 
  Clock, 
  AlertCircle,
  RefreshCw,
  MessageSquare,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GradingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    requests, 
    referrals,
    loadData, 
    confirmGrading, 
    closeRequest, 
    createReferral,
    gradeSingleRequest,
    getLogsByRequestId
  } = useAppStore();
  
  const [adjustedLevel, setAdjustedLevel] = useState<GradingLevel | null>(null);
  const [remark, setRemark] = useState('');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralType, setReferralType] = useState<ReferralType>('psychology');
  const [referralTo, setReferralTo] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  
  const request = requests.find(r => r.id === id);
  const requestReferrals = referrals.filter(r => r.requestId === id);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  useEffect(() => {
    if (id) {
      setLogs(getLogsByRequestId(id));
    }
  }, [id, getLogsByRequestId, requests]);
  
  useEffect(() => {
    if (request?.gradingResult && !request.confirmedLevel) {
      setAdjustedLevel(request.gradingResult.level);
    }
  }, [request]);
  
  if (!request) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 mb-4">未找到该求助记录</p>
          <button
            onClick={() => navigate('/intake')}
            className="text-[#1e3a5f] font-medium hover:underline"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }
  
  const currentLevel = request.confirmedLevel || request.gradingResult?.level || 'general';
  const canConfirm = request.status === 'graded' || request.status === 'pending';
  const canEdit = request.status !== 'closed';
  
  const handleConfirm = () => {
    if (!adjustedLevel) return;
    confirmGrading(request.id, adjustedLevel, remark || undefined);
    setRemark('');
  };
  
  const handleClose = () => {
    if (remark) {
      closeRequest(request.id, remark);
      setRemark('');
    }
  };
  
  const handleReferral = () => {
    if (!referralTo || !referralReason) return;
    createReferral(request.id, referralType, referralTo, referralReason);
    setShowReferralModal(false);
    setReferralTo('');
    setReferralReason('');
  };
  
  const handleRegrade = () => {
    gradeSingleRequest(request.id);
  };
  
  const levels: GradingLevel[] = ['emergency', 'psychology', 'headteacher', 'general', 'review'];
  const referralTargets = [
    { type: 'psychology' as ReferralType, role: '心理老师', name: '张老师' },
    { type: 'psychology' as ReferralType, role: '心理老师', name: '李老师' },
    { type: 'headteacher' as ReferralType, role: '班主任', name: '王老师（高一1班）' },
    { type: 'headteacher' as ReferralType, role: '班主任', name: '刘老师（高一2班）' },
    { type: 'headteacher' as ReferralType, role: '班主任', name: '陈老师（高一3班）' },
  ];
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/intake')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#1e3a5f] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <GradingBadge level={currentLevel} size="lg" pulse={request.status === 'graded'} />
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    request.status === 'closed' ? 'bg-gray-100 text-gray-500' :
                    request.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    request.status === 'referred' ? 'bg-purple-100 text-purple-700' :
                    'bg-orange-100 text-orange-700'
                  )}>
                    {REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  提交时间：{format(new Date(request.submitTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                </p>
              </div>
              
              {request.status === 'pending' && (
                <button
                  onClick={handleRegrade}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#1e3a5f] bg-[#1e3a5f]/5 rounded-lg hover:bg-[#1e3a5f]/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  开始分级
                </button>
              )}
              
              {request.gradingResult && canEdit && (
                <button
                  onClick={handleRegrade}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新分级
                </button>
              )}
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                求助内容
              </h3>
              
              {request.gradingResult ? (
                <HighlightedContent
                  content={request.content}
                  triggeredSentences={request.gradingResult.triggeredSentences}
                  className="bg-gray-50 rounded-lg p-4 text-sm"
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {request.content}
                </div>
              )}
            </div>
            
            {request.gradingResult && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">触发的规则</h3>
                <div className="flex flex-wrap gap-2">
                  {request.gradingResult.triggeredSentences.length > 0 ? (
                    request.gradingResult.triggeredSentences.map((sentence, index) => (
                      <div
                        key={index}
                        className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100"
                      >
                        <span className="font-medium text-gray-700">{sentence.ruleName}</span>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className="text-gray-500">"{sentence.text.substring(0, 20)}..."</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-100">
                      无匹配规则，已按默认规则分级
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {requestReferrals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-500" />
                转介记录
              </h3>
              <div className="space-y-3">
                {requestReferrals.map((referral) => (
                  <div key={referral.id} className="p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-purple-700">
                          {REFERRAL_TYPE_LABELS[referral.referralType]}
                        </span>
                        <span className="text-sm text-gray-500 mx-2">→</span>
                        <span className="text-sm text-gray-700">{referral.toRole}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(referral.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">转介原因：{referral.reason}</p>
                    <p className="text-xs text-gray-500 mt-2">转介人：{referral.fromRole}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {logs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#1e3a5f]" />
                处理日志
              </h3>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      {log !== logs[logs.length - 1] && (
                        <div className="w-px h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700">{log.operator}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{log.action}</p>
                      {log.remark && (
                        <p className="text-xs text-gray-500 mt-1">备注：{log.remark}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {request.gradingResult && canEdit && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">人工确认</h3>
              
              {request.status !== 'graded' && request.status !== 'pending' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    <AlertCircle className="w-4 h-4 inline mr-1.5" />
                    当前状态为「{REQUEST_STATUS_LABELS[request.status]}」，分级仅作参考
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  系统分级
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <GradingBadge level={request.gradingResult.level} size="sm" />
                    <span className="text-sm text-gray-500">
                      置信度 {request.gradingResult.confidence}%
                    </span>
                  </div>
                </div>
              </div>
              
              {canConfirm && (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      确认分级
                    </label>
                    <div className="space-y-2">
                      {levels.map((level) => (
                        <button
                          key={level}
                          onClick={() => setAdjustedLevel(level)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200',
                            adjustedLevel === level
                              ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <GradingBadge level={level} size="sm" />
                          {adjustedLevel === level && (
                            <CheckCircle2 className="w-4 h-4 text-[#1e3a5f]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      处理备注
                    </label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="输入处理备注..."
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={handleConfirm}
                      disabled={!adjustedLevel}
                      className={cn(
                        'w-full py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2',
                        adjustedLevel
                          ? 'bg-[#1e3a5f] text-white hover:bg-[#2d5a8f]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      确认分级
                    </button>
                    
                    <button
                      onClick={() => setShowReferralModal(true)}
                      className="w-full py-2.5 rounded-lg font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      转介处理
                    </button>
                    
                    <button
                      onClick={handleClose}
                      disabled={!remark}
                      className={cn(
                        'w-full py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2',
                        remark
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      标记已处理
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {!canEdit && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
                <p className="text-gray-700 font-medium">已处理完成</p>
                <p className="text-sm text-gray-500 mt-1">
                  处理人：{request.confirmedBy}
                </p>
                {request.confirmedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(request.confirmedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">转介处理</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">转介类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['psychology', 'headteacher'] as ReferralType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setReferralType(type)}
                      className={cn(
                        'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                        referralType === type
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {REFERRAL_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">转介给</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {referralTargets
                    .filter(t => t.type === referralType)
                    .map((target, index) => (
                      <button
                        key={index}
                        onClick={() => setReferralTo(target.name)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                          referralTo === target.name
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <span className="font-medium text-gray-700">{target.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{target.role}</span>
                      </button>
                    ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">转介原因</label>
                <textarea
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="请输入转介原因..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReferralModal(false)}
                className="flex-1 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReferral}
                disabled={!referralTo || !referralReason}
                className={cn(
                  'flex-1 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  referralTo && referralReason
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
                确认转介
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
