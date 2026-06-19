import { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, Play, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { DETECTION_TYPE_LABELS, SEVERITY_LABELS, type DetectionType, type Severity } from '../../types';

const DetectionPanel = () => {
  const { currentCase, runAllDetections, resolveDetection } = useCaseStore();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [isRunning, setIsRunning] = useState(false);

  const typeIcons: Record<DetectionType, typeof AlertTriangle> = {
    cropped_screenshot: AlertTriangle,
    duplicate_file: AlertCircle,
    contradictory_statement: AlertTriangle,
    missing_signature: AlertTriangle,
    missing_evidence: Info,
  };

  const severityColors: Record<Severity, { bg: string; text: string; tag: string }> = {
    high: { bg: 'bg-red-50', text: 'text-red-700', tag: 'tag-high' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', tag: 'tag-medium' },
    low: { bg: 'bg-green-50', text: 'text-green-700', tag: 'tag-low' },
  };

  const handleRunDetection = () => {
    setIsRunning(true);
    setTimeout(() => {
      runAllDetections();
      setIsRunning(false);
    }, 800);
  };

  const filteredDetections = currentCase.detections.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !d.resolved;
    return d.resolved;
  });

  const stats = {
    total: currentCase.detections.length,
    high: currentCase.detections.filter((d) => d.severity === 'high' && !d.resolved).length,
    medium: currentCase.detections.filter((d) => d.severity === 'medium' && !d.resolved).length,
    low: currentCase.detections.filter((d) => d.severity === 'low' && !d.resolved).length,
    resolved: currentCase.detections.filter((d) => d.resolved).length,
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-primary-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            智能检测
          </h2>
          <button
            onClick={handleRunDetection}
            disabled={isRunning}
            className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 disabled:opacity-50"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? '检测中...' : '开始检测'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-gray-700">{stats.total}</div>
            <div className="text-[10px] text-gray-500">总计</div>
          </div>
          <div className="bg-red-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-red-600">{stats.high}</div>
            <div className="text-[10px] text-red-500">高</div>
          </div>
          <div className="bg-yellow-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-yellow-600">{stats.medium}</div>
            <div className="text-[10px] text-yellow-500">中</div>
          </div>
          <div className="bg-green-50 rounded p-2 text-center">
            <div className="text-lg font-semibold text-green-600">{stats.resolved}</div>
            <div className="text-[10px] text-green-500">已处理</div>
          </div>
        </div>

        <div className="flex gap-1 mt-3 border-b border-gray-200">
          {(['all', 'unresolved', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                filter === f
                  ? 'border-primary-900 text-primary-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? '全部' : f === 'unresolved' ? '待处理' : '已处理'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-2">
        {currentCase.detections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-1">暂无检测结果</p>
            <p className="text-xs">点击"开始检测"分析证据</p>
          </div>
        ) : filteredDetections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-sm">
              {filter === 'unresolved' ? '所有问题已处理' : '暂无问题'}
            </p>
          </div>
        ) : (
          filteredDetections.map((detection) => {
            const Icon = typeIcons[detection.type];
            const colors = severityColors[detection.severity];
            
            return (
              <div
                key={detection.id}
                className={`rounded border p-3 transition-all ${
                  detection.resolved
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : `${colors.bg} border-transparent hover:shadow-sm`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${colors.text} bg-white/60`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`tag ${colors.tag}`}>
                        {SEVERITY_LABELS[detection.severity]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {DETECTION_TYPE_LABELS[detection.type]}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-800 mb-1">
                      {detection.description}
                    </h4>
                    <p className="text-xs text-gray-600">
                      建议：{detection.suggestion}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
                      {detection.resolved ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          已处理
                        </span>
                      ) : (
                        <button
                          onClick={() => resolveDetection(detection.id)}
                          className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          标记已处理
                        </button>
                      )}
                      {detection.evidenceId && (
                        <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 ml-auto">
                          <Eye className="w-3 h-3" />
                          查看证据
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500">
          <p className="mb-1 font-medium">检测项目：</p>
          <ul className="space-y-0.5 text-[11px]">
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              截图完整性检测
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              重复附件检测
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              说法矛盾检测
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              签名缺失检测
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
              证据缺口分析
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DetectionPanel;
