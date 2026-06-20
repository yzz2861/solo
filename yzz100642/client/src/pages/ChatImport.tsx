import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpTrayIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import CommitmentCard from '../components/CommitmentCard';
import { importChat, getCustomers, getOpportunities, createCustomer, createOpportunity } from '../api';
import type { Commitment, ChatMessage, Customer, Opportunity } from '../types';
import { getTypeIcon, getTypeLabel } from '../utils';

const SAMPLE_CHAT = `2024-01-15 09:30:00 销售-小陈：张总您好，关于咱们的SaaS系统采购项目
2024-01-15 09:31:00 客户-张伟：好的，你说
2024-01-15 09:32:00 销售-小陈：首先是价格方面，原价32万一年，我这边申请到了88折优惠，折后281600元
2024-01-15 09:33:00 销售-小陈：另外赠送您价值2万元的实施服务和一年的免费上门培训
2024-01-15 09:38:00 销售-小陈：签约后15个工作日内可以完成部署和上线
2024-01-15 09:39:00 销售-小陈：质保期是1年，期间免费维修和升级，还有7x24小时技术支持
2024-01-15 09:40:00 销售-小陈：需要确认一下你们的服务器是用我们的云服务还是自己部署？`;

export default function ChatImport() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [source, setSource] = useState('微信');
  const [opportunityId, setOpportunityId] = useState<number | ''>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newOpportunityName, setNewOpportunityName] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [extractedCommitments, setExtractedCommitments] = useState<Commitment[]>([]);
  const [extractedMessages, setExtractedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    loadSelectData();
  }, []);

  const loadSelectData = async () => {
    try {
      const [custRes, oppRes] = await Promise.all([
        getCustomers(),
        getOpportunities(),
      ]);
      setCustomers(custRes.data);
      setOpportunities(oppRes.data);
    } catch (error) {
      console.error('Failed to load select data:', error);
    }
  };

  const handleExtract = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await importChat({
        opportunity_id: opportunityId || undefined,
        salesperson,
        source,
        content,
      });
      setExtractedCommitments(res.data.commitments);
      setExtractedMessages(res.data.messages);
    } catch (error) {
      console.error('Extract failed:', error);
      alert('提取失败，请检查聊天格式');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) return;
    if (mode === 'new') {
      if (!newCustomerName || !newOpportunityName) {
        alert('请填写客户名称和机会名称');
        return;
      }
      setImporting(true);
      try {
        const customerRes = await createCustomer({ name: newCustomerName });
        const opportunityRes = await createOpportunity({
          customer_id: customerRes.data.id,
          name: newOpportunityName,
        });
        await importChat({
          opportunity_id: opportunityRes.data.id,
          salesperson,
          source,
          content,
        });
        setImported(true);
      } catch (error) {
        console.error('Import failed:', error);
        alert('导入失败');
      } finally {
        setImporting(false);
      }
    } else {
      await handleExtract();
      setImported(true);
    }
  };

  const loadSample = () => {
    setContent(SAMPLE_CHAT);
    setSalesperson('销售-小陈');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setContent(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const commitmentGroups = extractedCommitments.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, Commitment[]>);

  return (
    <div>
      <PageHeader
        title="导入聊天记录"
        description="粘贴或上传聊天记录，系统将自动提取承诺内容"
      />

      {imported ? (
        <div className="card p-8 text-center animate-fade-in">
          <CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">导入成功！</h2>
          <p className="text-slate-500 mb-6">
            成功提取 {extractedCommitments.length} 条承诺，请前往审批
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate('/approvals')} className="btn-primary">
              去审批
            </button>
            <button onClick={() => { setImported(false); setContent(''); setExtractedCommitments([]); }} className="btn-secondary">
              继续导入
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-slate-800 mb-4">聊天内容</h3>

              <div className="mb-4">
                <label className="label">上传聊天记录文件</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                    <ArrowUpTrayIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-500">点击或拖拽文件到此处</span>
                    <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button onClick={loadSample} className="btn-secondary whitespace-nowrap">
                    加载示例
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="label">或粘贴聊天内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请粘贴聊天记录，格式示例：&#10;2024-01-15 09:30:00 销售-小陈：您好张总...&#10;2024-01-15 09:31:00 客户-张伟：你好..."
                  rows={12}
                  className="input font-mono text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">销售人员</label>
                  <input
                    type="text"
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                    placeholder="如：销售-小陈"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">聊天来源</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="input">
                    <option value="微信">微信</option>
                    <option value="企业微信">企业微信</option>
                    <option value="钉钉">钉钉</option>
                    <option value="QQ">QQ</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'existing'}
                      onChange={() => setMode('existing')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700">关联已有机会</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'new'}
                      onChange={() => setMode('new')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700">新建客户和机会</span>
                  </label>
                </div>

                {mode === 'existing' ? (
                  <div>
                    <label className="label">选择机会（可选）</label>
                    <select
                      value={opportunityId}
                      onChange={(e) => setOpportunityId(e.target.value ? Number(e.target.value) : '')}
                      className="input"
                    >
                      <option value="">-- 不关联（仅提取不入库）--</option>
                      {opportunities.map((opp) => (
                        <option key={opp.id} value={opp.id}>
                          {opp.name} - {opp.customer_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">客户名称</label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="如：科技创新有限公司"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">机会名称</label>
                      <input
                        type="text"
                        value={newOpportunityName}
                        onChange={(e) => setNewOpportunityName(e.target.value)}
                        placeholder="如：SaaS系统采购项目"
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={!content.trim() || importing || loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {importing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    {mode === 'new' ? '导入并提取承诺' : '提取承诺'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">提取预览</h3>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <SparklesIcon className="w-12 h-12 text-primary-500 mx-auto mb-3 animate-pulse" />
                  <p className="text-slate-500">正在提取承诺...</p>
                </div>
              </div>
            ) : extractedCommitments.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                  <span className="text-emerald-700">
                    成功提取 <strong>{extractedCommitments.length}</strong> 条承诺
                  </span>
                </div>

                {extractedMessages.length > 0 && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      共解析 <strong>{extractedMessages.length}</strong> 条消息
                    </p>
                  </div>
                )}

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(commitmentGroups).map(([type, commitments]) => (
                    <div key={type}>
                      <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                        <span>{getTypeIcon(type as any)}</span>
                        {getTypeLabel(type as any)} ({commitments.length})
                      </h4>
                      <div className="space-y-2">
                        {commitments.map((c, idx) => (
                          <CommitmentCard key={c.id || `preview-${idx}`} commitment={c} animationDelay={idx * 30} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {extractedCommitments.some(c => c.confidence < 0.5) && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium">注意：部分承诺置信度较低</p>
                      <p className="text-amber-600 mt-1">
                        可能包含不确定表述、表情、语音转写或客户复述内容，请仔细核对
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <div className="text-center text-slate-400">
                  <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>导入聊天记录后将显示提取结果</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
