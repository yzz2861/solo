import { useProjectStore } from '../../store/useProjectStore';
import { Badge } from '../ui/Badge';

export function RiskStats() {
  const { project } = useProjectStore();

  if (!project) return null;

  const criticalCount = project.risks.filter(r => r.level === 'critical').length;
  const warningCount = project.risks.filter(r => r.level === 'warning').length;
  const infoCount = project.risks.filter(r => r.level === 'info').length;
  const totalCount = project.risks.length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#94a3b8]">总计:</span>
        <Badge variant="default" size="md">
          {totalCount}
        </Badge>
      </div>
      {criticalCount > 0 && (
        <Badge variant="danger" size="md">
          严重 {criticalCount}
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge variant="warning" size="md">
          警告 {warningCount}
        </Badge>
      )}
      {infoCount > 0 && (
        <Badge variant="info" size="md">
          提示 {infoCount}
        </Badge>
      )}
      {totalCount === 0 && (
        <Badge variant="success" size="md">
          暂无风险
        </Badge>
      )}
    </div>
  );
}
