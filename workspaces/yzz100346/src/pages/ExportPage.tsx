import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Printer, Copy, Check, Shield, AlertTriangle, Calendar, Layers } from 'lucide-react';
import { loadProject } from '../utils/storage';
import { generateMarkdownReport, exportProjectReport, exportProjectJSON, printReport } from '../utils/exportReport';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useSafetyStore } from '../store/useSafetyStore';
import type { Project } from '../types/project';
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_COLORS } from '../constants/colors';
import { getRiskLevelLabel, getRiskTypeLabel } from '../types/safety';
import { isLoadBearingDevice, isHoistPoint } from '../types/devices';
import { normalizeWeightToKg, formatWeightDisplay } from '../utils/unitConversion';

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFilteredRisks } = useSafetyStore();
  const [project, setProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'summary'>('preview');

  useEffect(() => {
    if (id) {
      const loaded = loadProject(id);
      if (loaded) {
        setProject(loaded);
      } else {
        setNotFound(true);
      }
    }
  }, [id]);

  const markdownReport = useMemo(() => {
    if (!project) return '';
    return generateMarkdownReport(project);
  }, [project]);

  const filteredRisks = project ? getFilteredRisks(project.risks) : [];

  const handleCopyMarkdown = async () => {
    if (markdownReport) {
      await navigator.clipboard.writeText(markdownReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportReport = () => {
    if (project) {
      exportProjectReport(project);
    }
  };

  const handleExportJSON = () => {
    if (project) {
      exportProjectJSON(project);
    }
  };

  const handlePrint = () => {
    if (project) {
      printReport(project);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#1a1d23] text-[#f8fafc] flex items-center justify-center">
        <Card variant="glass" className="max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#2d323b] flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-[#f59e0b]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">方案不存在</h2>
            <p className="text-sm text-[#64748b] mb-6">该方案可能已被删除或ID无效</p>
            <Button variant="primary" onClick={() => navigate('/projects')}>
              返回方案列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#1a1d23] text-[#f8fafc] flex items-center justify-center">
        <div className="text-[#64748b]">加载中...</div>
      </div>
    );
  }

  const riskSummary = {
    critical: project.risks.filter(r => r.level === 'critical').length,
    warning: project.risks.filter(r => r.level === 'warning').length,
    info: project.risks.filter(r => r.level === 'info').length,
  };

  const deviceGroups = useMemo(() => {
    const groups: Map<string, { count: number; weight: number }> = new Map();
    project.devices.forEach(d => {
      const existing = groups.get(d.type) || { count: 0, weight: 0 };
      existing.count++;
      if (isLoadBearingDevice(d)) {
        existing.weight += normalizeWeightToKg(d.weight, d.weightUnit);
      }
      groups.set(d.type, existing);
    });
    return groups;
  }, [project]);

  const totalWeight = project.devices
    .filter(isLoadBearingDevice)
    .reduce((sum, d) => sum + normalizeWeightToKg(d.weight, d.weightUnit), 0);

  const tabs = [
    { id: 'preview', label: '报告预览', icon: FileText },
    { id: 'markdown', label: 'Markdown 源码', icon: FileText },
    { id: 'summary', label: '审批摘要', icon: Layers },
  ] as const;

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#f8fafc]">
      <header className="h-14 bg-[#23272f] border-b border-[#3a4150] flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
            返回详情
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#3b82f6]" />
            <h1 className="text-lg font-semibold">导出安全报告</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyMarkdown}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制 Markdown'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            打印
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJSON}
          >
            <Download className="w-4 h-4" />
            导出 JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportReport}
          >
            <Download className="w-4 h-4" />
            下载报告
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <Card variant="glass" className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">{project.name}</h2>
                <div className="flex items-center gap-4 text-sm text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    报告生成时间: {formatDate(Date.now())}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#ef4444]">{riskSummary.critical}</p>
                  <p className="text-xs text-[#64748b]">严重风险</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#f59e0b]">{riskSummary.warning}</p>
                  <p className="text-xs text-[#64748b]">警告</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#3b82f6]">{riskSummary.info}</p>
                  <p className="text-xs text-[#64748b]">提示</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border-b border-[#3a4150] mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'text-[#3b82f6] border-[#3b82f6]'
                      : 'text-[#64748b] border-transparent hover:text-[#94a3b8]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'preview' && (
          <Card variant="glass">
            <CardContent className="prose prose-invert max-w-none p-6">
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b82f6]">1. 方案基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">方案名称</span>
                      <p className="font-mono mt-1">{project.name}</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">方案ID</span>
                      <p className="font-mono mt-1 text-xs">{project.id}</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">创建时间</span>
                      <p className="font-mono mt-1">{formatDate(project.createdAt)}</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">最后更新</span>
                      <p className="font-mono mt-1">{formatDate(project.updatedAt)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b82f6]">2. 安全参数设置</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">单吊点最大承重</span>
                      <p className="font-mono mt-1">{project.safetySettings.maxHoistLoad} kg</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">观众区最小安全距离</span>
                      <p className="font-mono mt-1">{project.safetySettings.minAudienceDistance} m</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-3 rounded">
                      <span className="text-[#64748b]">最大负载方差</span>
                      <p className="font-mono mt-1">{project.safetySettings.maxLoadVariance}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b82f6]">3. 风险评估</h3>
                  
                  {riskSummary.critical > 0 && (
                    <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 p-4 rounded mb-4">
                      <p className="text-[#ef4444] font-medium">
                        ⚠️ 警告: 发现 {riskSummary.critical} 项严重风险，请务必在搭台前解决！
                      </p>
                    </div>
                  )}

                  {project.risks.length === 0 && (
                    <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-4 rounded mb-4">
                      <p className="text-[#10b981] font-medium">
                        ✅ 安全: 未检测到安全风险。
                      </p>
                    </div>
                  )}

                  {filteredRisks.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#3a4150] bg-[#2d323b]/50">
                            <th className="text-left py-3 px-4 font-medium">风险等级</th>
                            <th className="text-left py-3 px-4 font-medium">风险类型</th>
                            <th className="text-left py-3 px-4 font-medium">关联设备</th>
                            <th className="text-left py-3 px-4 font-medium">描述</th>
                            <th className="text-left py-3 px-4 font-medium">调整建议</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRisks
                            .sort((a, b) => {
                              const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
                              return order[a.level] - order[b.level];
                            })
                            .map(risk => {
                              const device = project.devices.find(d => d.id === risk.deviceId);
                              return (
                                <tr
                                  key={risk.id}
                                  className={`border-b border-[#3a4150]/50 ${
                                    risk.level === 'critical' ? 'bg-[#ef4444]/5' :
                                    risk.level === 'warning' ? 'bg-[#f59e0b]/5' : ''
                                  }`}
                                >
                                  <td className="py-3 px-4">
                                    <Badge
                                      variant={risk.level === 'critical' ? 'danger' : risk.level === 'warning' ? 'warning' : 'info'}
                                      size="sm"
                                    >
                                      {getRiskLevelLabel(risk.level)}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4">{getRiskTypeLabel(risk.type)}</td>
                                  <td className="py-3 px-4 font-mono text-xs">
                                    {device ? device.name : '全局'}
                                  </td>
                                  <td className="py-3 px-4">{risk.description}</td>
                                  <td className="py-3 px-4 text-[#94a3b8]">{risk.suggestion}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b82f6]">4. 设备清单</h3>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#64748b] mb-2">设备统计</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#3a4150] bg-[#2d323b]/50">
                            <th className="text-left py-2 px-4 font-medium">设备类型</th>
                            <th className="text-left py-2 px-4 font-medium">数量</th>
                            <th className="text-left py-2 px-4 font-medium">总重量 (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(deviceGroups.entries()).map(([type, data]) => (
                            <tr key={type} className="border-b border-[#3a4150]/50">
                              <td className="py-2 px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: DEVICE_TYPE_COLORS[type as keyof typeof DEVICE_TYPE_COLORS] }}
                                  />
                                  {DEVICE_TYPE_LABELS[type as keyof typeof DEVICE_TYPE_LABELS]}
                                </div>
                              </td>
                              <td className="py-2 px-4 font-mono">{data.count}</td>
                              <td className="py-2 px-4 font-mono">{data.weight.toFixed(1)}</td>
                            </tr>
                          ))}
                          <tr className="bg-[#2d323b]/50 font-medium">
                            <td className="py-2 px-4">合计</td>
                            <td className="py-2 px-4 font-mono">{project.devices.length}</td>
                            <td className="py-2 px-4 font-mono">{totalWeight.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#3a4150] bg-[#2d323b]/50">
                          <th className="text-left py-2 px-4 font-medium">设备类型</th>
                          <th className="text-left py-2 px-4 font-medium">设备名称</th>
                          <th className="text-left py-2 px-4 font-medium">位置 (x, y, z)</th>
                          <th className="text-left py-2 px-4 font-medium">重量</th>
                          <th className="text-left py-2 px-4 font-medium">备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.devices.map(device => {
                          const pos = device.position;
                          const hasRisk = project.risks.some(r => r.deviceId === device.id);
                          return (
                            <tr
                              key={device.id}
                              className={`border-b border-[#3a4150]/50 ${hasRisk ? 'bg-[#f59e0b]/5' : ''}`}
                            >
                              <td className="py-2 px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: DEVICE_TYPE_COLORS[device.type] }}
                                  />
                                  {DEVICE_TYPE_LABELS[device.type]}
                                </div>
                              </td>
                              <td className="py-2 px-4 font-mono">{device.name}</td>
                              <td className="py-2 px-4 font-mono text-xs">
                                ({pos.x.toFixed(1)}, {pos.y.toFixed(1)}, {pos.z.toFixed(1)})
                              </td>
                              <td className="py-2 px-4 font-mono">
                                {isLoadBearingDevice(device)
                                  ? formatWeightDisplay(device.weight, device.weightUnit)
                                  : '-'}
                              </td>
                              <td className="py-2 px-4 text-xs text-[#64748b]">
                                {isHoistPoint(device) ? `最大承重: ${device.maxLoad}kg` : ''}
                                {hasRisk && ' ⚠️ 有风险'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b82f6]">5. 调整建议</h3>
                  {project.risks.length === 0 ? (
                    <p className="text-[#10b981]">当前方案符合安全要求，可以按此方案进行搭台。</p>
                  ) : (
                    <ul className="space-y-2">
                      {Array.from(new Set(project.risks.map(r => r.suggestion))).map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-[#3b82f6] mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="border-t border-[#3a4150] pt-4 text-xs text-[#64748b]">
                  <p>此报告由舞台吊点安全预演工具自动生成。</p>
                  <p>方案ID: {project.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'markdown' && (
          <Card variant="glass">
            <CardContent className="p-0">
              <div className="bg-[#0d1117] p-4 rounded-t border-b border-[#3a4150] flex items-center justify-between">
                <span className="text-xs text-[#64748b] font-mono">Markdown 源码</span>
                <Button variant="ghost" size="sm" onClick={handleCopyMarkdown}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <pre className="p-4 text-xs font-mono text-[#e6edf3] overflow-x-auto max-h-[70vh] overflow-y-auto whitespace-pre-wrap">
                {markdownReport}
              </pre>
            </CardContent>
          </Card>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base">审批摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#2d323b]/50 p-4 rounded">
                  <h4 className="font-medium mb-2">安全评估结论</h4>
                  <p className={`text-lg font-bold ${
                    riskSummary.critical > 0 ? 'text-[#ef4444]' :
                    riskSummary.warning > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'
                  }`}>
                    {riskSummary.critical > 0 ? '❌ 不通过 - 存在严重安全风险' :
                     riskSummary.warning > 0 ? '⚠️ 有条件通过 - 需关注警告项' : '✅ 通过 - 符合安全要求'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#2d323b]/50 p-4 rounded">
                    <h4 className="text-sm font-medium text-[#64748b] mb-2">设备信息</h4>
                    <p className="text-2xl font-bold">{project.devices.length} 台设备</p>
                    <p className="text-sm text-[#64748b] mt-1">总重量: {totalWeight.toFixed(1)} kg</p>
                  </div>
                  <div className="bg-[#2d323b]/50 p-4 rounded">
                    <h4 className="text-sm font-medium text-[#64748b] mb-2">风险汇总</h4>
                    <p className="text-2xl font-bold">{project.risks.length} 项风险</p>
                    <p className="text-sm mt-1">
                      <span className="text-[#ef4444]">{riskSummary.critical} 严重</span>
                      <span className="mx-2 text-[#3a4150]">|</span>
                      <span className="text-[#f59e0b]">{riskSummary.warning} 警告</span>
                      <span className="mx-2 text-[#3a4150]">|</span>
                      <span className="text-[#3b82f6]">{riskSummary.info} 提示</span>
                    </p>
                  </div>
                </div>

                {riskSummary.critical > 0 && (
                  <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 p-4 rounded">
                    <h4 className="text-[#ef4444] font-medium mb-2">必须整改项</h4>
                    <ul className="space-y-2 text-sm">
                      {project.risks
                        .filter(r => r.level === 'critical')
                        .map(risk => {
                          const device = project.devices.find(d => d.id === risk.deviceId);
                          return (
                            <li key={risk.id} className="flex items-start gap-2">
                              <span className="text-[#ef4444]">•</span>
                              <span>
                                <strong>{device?.name || '全局'}:</strong> {risk.description}
                                <br />
                                <span className="text-[#94a3b8] text-xs">建议: {risk.suggestion}</span>
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}

                <div className="border-t border-[#3a4150] pt-4">
                  <h4 className="text-sm font-medium text-[#64748b] mb-3">审批人签字</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#2d323b]/50 p-4 rounded text-center">
                      <p className="text-xs text-[#64748b] mb-2">技术负责人</p>
                      <div className="h-12 border-b border-[#3a4150]" />
                      <p className="text-xs text-[#64748b] mt-1">日期: ____________</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-4 rounded text-center">
                      <p className="text-xs text-[#64748b] mb-2">校务处</p>
                      <div className="h-12 border-b border-[#3a4150]" />
                      <p className="text-xs text-[#64748b] mt-1">日期: ____________</p>
                    </div>
                    <div className="bg-[#2d323b]/50 p-4 rounded text-center">
                      <p className="text-xs text-[#64748b] mb-2">剧场管理</p>
                      <div className="h-12 border-b border-[#3a4150]" />
                      <p className="text-xs text-[#64748b] mt-1">日期: ____________</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
