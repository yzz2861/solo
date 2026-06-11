import { RotateCcw, Clock } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function HistoryPanel() {
  const { history, rollbackToHistory, project } = useProjectStore();

  if (!project) {
    return (
      <Card variant="glass" className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-[#64748b] text-sm">创建方案后查看历史</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card variant="glass" className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#3b82f6]" />
            <CardTitle className="text-base">调整历史</CardTitle>
          </div>
          <Badge variant="default" size="sm">
            {history.length} 条记录
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <Clock className="w-8 h-8 text-[#3a4150] mb-2" />
            <p className="text-sm text-[#64748b]">暂无调整记录</p>
            <p className="text-xs text-[#3a4150] mt-1">
              添加或修改设备后会自动记录
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[#3a4150]" />
            
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`relative pl-14 pr-4 py-3 ${
                  index < history.length - 1 ? 'border-b border-[#3a4150]/50' : ''
                }`}
              >
                <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-[#23272f] border-2 border-[#3b82f6] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                </div>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#f8fafc] font-medium truncate">
                      {entry.description}
                    </p>
                    <p className="text-[10px] text-[#64748b] mt-0.5 font-mono">
                      {formatTime(entry.timestamp)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#64748b]">
                        设备: {entry.snapshot.devices.length}
                      </span>
                      <span className="text-[10px] text-[#64748b]">
                        风险: {entry.snapshot.risks.length}
                      </span>
                    </div>
                  </div>
                  
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`确定要回滚到此版本吗？\n${entry.description}`)) {
                          rollbackToHistory(entry.id);
                        }
                      }}
                      className="flex-shrink-0 p-1"
                      title="回滚到此版本"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
