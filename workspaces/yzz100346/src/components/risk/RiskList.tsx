import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useSafetyStore } from '../../store/useSafetyStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { RiskItem } from './RiskItem';
import { RiskFilter } from './RiskFilter';
import { RiskStats } from './RiskStats';
import { getRiskLevelColor } from '../../types/safety';

export function RiskList() {
  const { project, runSafetyCheck } = useProjectStore();
  const { getFilteredRisks } = useSafetyStore();

  const filteredRisks = useMemo(() => {
    if (!project) return [];
    return getFilteredRisks(project.risks);
  }, [project, getFilteredRisks]);

  const sortedRisks = useMemo(() => {
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    return [...filteredRisks].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  }, [filteredRisks]);

  if (!project) {
    return (
      <Card variant="glass" className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-[#64748b] text-sm">创建方案后查看风险</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base flex items-center gap-2">
            安全风险
            <Button
              variant="ghost"
              size="sm"
              onClick={runSafetyCheck}
              className="p-1"
              title="重新检测"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </div>
        <div className="space-y-2">
          <RiskStats />
          <RiskFilter />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {sortedRisks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${getRiskLevelColor('critical')}10` }}
            >
              <RefreshCw className="w-6 h-6" style={{ color: '#10b981' }} />
            </div>
            <p className="text-sm text-[#10b981] font-medium">
              当前筛选条件下无风险
            </p>
            <p className="text-xs text-[#64748b] mt-1">
              点击重新检测或调整筛选条件
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#3a4150]">
            {sortedRisks.map(risk => (
              <RiskItem key={risk.id} risk={risk} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
