import React from 'react';
import { FileText, Layers, AlertTriangle, Copy } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import Badge from '../common/Badge';

const StatsBar: React.FC = () => {
  const { currentProject } = useProjectStore();

  if (!currentProject) return null;

  const stats = [
    {
      label: '导入回答',
      value: currentProject.stats.totalAnswers,
      icon: <FileText className="w-4 h-4" />,
      color: 'primary',
    },
    {
      label: '去重后',
      value: currentProject.stats.uniqueAnswers,
      icon: <Layers className="w-4 h-4" />,
      color: 'success',
    },
    {
      label: '重复内容',
      value: currentProject.stats.duplicateAnswers,
      icon: <Copy className="w-4 h-4" />,
      color: 'default',
    },
    {
      label: '主题数量',
      value: currentProject.topics?.length || 0,
      icon: <Layers className="w-4 h-4" />,
      color: 'info',
    },
    {
      label: '风险主题',
      value: currentProject.topics?.filter((t) => t.isRisk).length || 0,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'danger',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 mb-6">
      <div className="flex flex-wrap items-center gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'primary'
                  ? 'bg-primary-100 text-primary-600'
                  : stat.color === 'success'
                  ? 'bg-success-100 text-success-600'
                  : stat.color === 'danger'
                  ? 'bg-red-100 text-red-600'
                  : stat.color === 'info'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-xs text-neutral-500">{stat.label}</p>
              <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
            </div>
          </div>
        ))}

        {currentProject.stats.averageSentiment !== undefined && (
          <div className="ml-auto">
            <Badge
              variant={
                currentProject.stats.averageSentiment > 0
                  ? 'success'
                  : currentProject.stats.averageSentiment < 0
                  ? 'danger'
                  : 'default'
              }
              size="md"
            >
              情感倾向：
              {currentProject.stats.averageSentiment > 0
                ? '正面'
                : currentProject.stats.averageSentiment < 0
                ? '负面'
                : '中性'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsBar;
