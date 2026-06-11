import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Calendar, Shield, AlertTriangle, Info, Layers, FileText, Printer } from 'lucide-react';
import { loadProject, getHistoryForProject } from '../utils/storage';
import { exportProjectReport, exportProjectJSON } from '../utils/exportReport';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { RiskItem } from '../components/risk/RiskItem';
import { RiskStats } from '../components/risk/RiskStats';
import { RiskFilter } from '../components/risk/RiskFilter';
import { useSafetyStore } from '../store/useSafetyStore';
import type { Project, HistoryEntry } from '../types/project';
import type { Risk } from '../types/safety';
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_COLORS } from '../constants/colors';
import { getRiskLevelColor, getRiskLevelLabel } from '../types/safety';
import { isLoadBearingDevice, isHoistPoint } from '../types/devices';
import { formatWeightDisplay } from '../utils/unitConversion';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFilteredRisks } = useSafetyStore();
  const [project, setProject] = useState<Project | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'risks' | 'history'>('overview');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) {
      const loaded = loadProject(id);
      if (loaded) {
        setProject(loaded);
        setHistory(getHistoryForProject(id));
      } else {
        setNotFound(true);
      }
    }
  }, [id]);

  const filteredRisks: Risk[] = project ? getFilteredRisks(project.risks) : [];

  const handleEdit = () => {
    if (project) {
      navigate('/');
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
    window.print();
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

  const deviceSummary: Record<string, number> = {};
  project.devices.forEach(d => {
    deviceSummary[d.type] = (deviceSummary[d.type] || 0) + 1;
  });

  const totalWeight = project.devices
    .filter(isLoadBearingDevice)
    .reduce((sum, d) => sum + (d.weight || 0), 0);

  const tabs = [
    { id: 'overview', label: '概览', icon: Info },
    { id: 'devices', label: '设备清单', icon: Layers },
    { id: 'risks', label: '风险检测', icon: AlertTriangle },
    { id: 'history', label: '历史记录', icon: Calendar },
  ] as const;

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#f8fafc] print:bg-white print:text-black">
      <header className="h-14 bg-[#23272f] border-b border-[#3a4150] flex items-center justify-between px-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#3b82f6]" />
            <h1 className="text-lg font-semibold">方案详情</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            导出数据
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportReport}
          >
            <FileText className="w-4 h-4" />
            导出报告
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleEdit}
          >
            <Edit className="w-4 h-4" />
            编辑方案
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
          <div className="flex items-center gap-4 text-sm text-[#64748b]">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              更新时间: {new Date(project.updatedAt).toLocaleString('zh-CN')}
            </span>
            <span>设备: {project.devices.length} 个</span>
            <span>风险: {project.risks.length} 项</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-xs text-[#64748b] mb-1">设备总数</p>
              <p className="text-2xl font-bold text-[#3b82f6]">{project.devices.length}</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-xs text-[#64748b] mb-1">总重量</p>
              <p className="text-2xl font-bold text-[#10b981]">{totalWeight.toFixed(1)} kg</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-xs text-[#64748b] mb-1">严重风险</p>
              <p className="text-2xl font-bold text-[#ef4444]">{riskSummary.critical}</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <p className="text-xs text-[#64748b] mb-1">安全状态</p>
              <p className={`text-2xl font-bold ${
                riskSummary.critical > 0 ? 'text-[#ef4444]' :
                riskSummary.warning > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'
              }`}>
                {riskSummary.critical > 0 ? '需整改' : riskSummary.warning > 0 ? '需关注' : '良好'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="border-b border-[#3a4150] mb-6 print:hidden">
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
                  {tab.id === 'risks' && project.risks.length > 0 && (
                    <Badge variant="danger" size="sm">{project.risks.length}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base">设备分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(deviceSummary).map(([type, count]) => (
                    <Badge key={type} variant="default" size="md">
                      <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: DEVICE_TYPE_COLORS[type as keyof typeof DEVICE_TYPE_COLORS] }}
                      />
                      {DEVICE_TYPE_LABELS[type as keyof typeof DEVICE_TYPE_LABELS]}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base">安全设置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">吊点最大承重</p>
                    <p className="text-sm font-mono">{project.safetySettings.maxHoistLoad} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">观众区安全距离</p>
                    <p className="text-sm font-mono">{project.safetySettings.minAudienceDistance} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b] mb-1">最大负载方差</p>
                    <p className="text-sm font-mono">{project.safetySettings.maxLoadVariance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base">风险概览</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskStats />
                {project.risks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {project.risks.slice(0, 3).map(risk => (
                      <RiskItem key={risk.id} risk={risk} />
                    ))}
                    {project.risks.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setActiveTab('risks')}
                      >
                        查看全部 {project.risks.length} 项风险
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'devices' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-base">设备清单</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3a4150]">
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">类型</th>
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">名称</th>
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">位置 (X, Y, Z)</th>
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">重量</th>
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">最大承重</th>
                      <th className="text-left py-3 px-4 font-medium text-[#64748b]">风险</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.devices.map((device) => {
                      const deviceRisks = project.risks.filter(r => r.deviceId === device.id);
                      const hasRisk = deviceRisks.length > 0;
                      const maxRiskLevel = deviceRisks.reduce((max, r) => {
                        const order = { critical: 3, warning: 2, info: 1 };
                        return order[r.level] > order[max as keyof typeof order] ? r.level : max;
                      }, 'info' as any);

                      return (
                        <tr key={device.id} className="border-b border-[#3a4150]/50 hover:bg-[#2d323b]/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: DEVICE_TYPE_COLORS[device.type] }}
                              />
                              {DEVICE_TYPE_LABELS[device.type]}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">{device.name}</td>
                          <td className="py-3 px-4 font-mono text-xs">
                            ({device.position.x.toFixed(1)}, {device.position.y.toFixed(1)}, {device.position.z.toFixed(1)})
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {isLoadBearingDevice(device)
                              ? formatWeightDisplay(device.weight, device.weightUnit)
                              : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {isHoistPoint(device) ? `${device.maxLoad} kg` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            {hasRisk ? (
                              <Badge
                                variant={maxRiskLevel === 'critical' ? 'danger' : maxRiskLevel === 'warning' ? 'warning' : 'info'}
                                size="sm"
                              >
                                {deviceRisks.length} 项
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm">正常</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'risks' && (
          <Card variant="glass" className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">风险检测报告</CardTitle>
              <div className="flex items-center gap-4 mt-3">
                <RiskStats />
                <div className="flex-1 max-w-xs">
                  <RiskFilter />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRisks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-[#10b981]" />
                  </div>
                  <p className="text-[#10b981] font-medium">当前筛选条件下无风险</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRisks
                    .sort((a, b) => {
                      const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
                      return order[a.level] - order[b.level];
                    })
                    .map(risk => (
                      <RiskItem key={risk.id} risk={risk} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-base">调整历史</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-[#64748b] py-8">暂无历史记录</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#3a4150]" />
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="relative pl-10">
                        <div
                          className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                            index === 0
                              ? 'bg-[#3b82f6] border-[#3b82f6]'
                              : 'bg-[#23272f] border-[#3a4150]'
                          }`}
                        />
                        <div className="bg-[#2d323b]/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{entry.description}</span>
                            <span className="text-xs text-[#64748b]">
                              {new Date(entry.timestamp).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748b]">
                            设备: {entry.snapshot.devices.length} 个 | 
                            风险: {entry.snapshot.risks.length} 项
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
