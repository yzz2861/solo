import { Shield, Settings } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export function SafetySettings() {
  const { project, updateSafetySettings } = useProjectStore();

  if (!project) {
    return (
      <Card variant="glass" className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-[#64748b] text-sm">创建方案后设置安全参数</p>
        </CardContent>
      </Card>
    );
  }

  const { safetySettings } = project;

  const handleMaxLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateSafetySettings({ maxHoistLoad: value });
    }
  };

  const handleMinDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateSafetySettings({ minAudienceDistance: value });
    }
  };

  const handleMaxVarianceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateSafetySettings({ maxLoadVariance: value });
    }
  };

  const criticalCount = project.risks.filter(r => r.level === 'critical').length;
  const warningCount = project.risks.filter(r => r.level === 'warning').length;

  return (
    <Card variant="glass" className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#3b82f6]" />
          <CardTitle className="text-base">安全参数设置</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        <div className="p-3 bg-[#1a1d23] rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#10b981]" />
            <span className="text-xs font-medium text-[#94a3b8]">当前安全状态</span>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 ? (
              <Badge variant="danger">{criticalCount} 项严重风险</Badge>
            ) : warningCount > 0 ? (
              <Badge variant="warning">{warningCount} 项警告</Badge>
            ) : (
              <Badge variant="success">安全</Badge>
            )}
          </div>
        </div>

        <div>
          <Input
            label="单吊点最大承重 (kg)"
            type="number"
            value={safetySettings.maxHoistLoad}
            onChange={handleMaxLoadChange}
            min="0"
            step="10"
          />
          <p className="text-[10px] text-[#64748b] mt-1">
            单个吊点允许承载的最大重量
          </p>
        </div>

        <div>
          <Input
            label="观众区最小安全距离 (m)"
            type="number"
            value={safetySettings.minAudienceDistance}
            onChange={handleMinDistanceChange}
            min="0"
            step="0.1"
          />
          <p className="text-[10px] text-[#64748b] mt-1">
            设备与观众区的最小允许距离
          </p>
        </div>

        <div>
          <Input
            label="最大负载分布方差"
            type="number"
            value={safetySettings.maxLoadVariance}
            onChange={handleMaxVarianceChange}
            min="0"
            step="0.05"
          />
          <p className="text-[10px] text-[#64748b] mt-1">
            吊点间负载分布的最大允许差异
          </p>
        </div>

        <div className="p-3 bg-[#1a1d23] rounded-sm">
          <p className="text-[10px] text-[#64748b] leading-relaxed">
            ⚠️ 修改安全参数后，系统会自动重新检测所有风险。
            请根据实际场地条件和设备规格合理设置这些参数。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
