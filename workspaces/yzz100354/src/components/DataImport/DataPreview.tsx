import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ImportPreview } from '@/types';
import { formatDateTime } from '@/utils/timeParser';
import { formatBrix, formatTemperature } from '@/utils/unitConverter';

interface DataPreviewProps {
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type TabType = 'temperature' | 'sugar' | 'feeding' | 'badRows';

export const DataPreview: React.FC<DataPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('temperature');
  const [expandedBadRows, setExpandedBadRows] = useState(false);

  const tabs = [
    { key: 'temperature' as TabType, label: '温度日志', count: preview.temperatureLogs.length },
    { key: 'sugar' as TabType, label: '糖度记录', count: preview.sugarReadings.length },
    { key: 'feeding' as TabType, label: '投料记录', count: preview.feedingRecords.length },
    { key: 'badRows' as TabType, label: '待复核', count: preview.badRows.length },
  ];

  const totalRows = preview.temperatureLogs.length + preview.sugarReadings.length + preview.feedingRecords.length;
  const goodRows = preview.temperatureLogs.filter(l => !l.isBadRow).length +
                    preview.sugarReadings.filter(r => !r.isBadRow).length +
                    preview.feedingRecords.length;
  const badRows = preview.badRows.length;

  return (
    <div className="w-full bg-white rounded-xl border border-amber-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-50 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-bold text-amber-900">数据预览</h3>
            <p className="text-sm text-amber-600 mt-1">请确认解析结果，坏行会保留供酿酒师复核</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              有效 {goodRows} 行
            </Badge>
            {badRows > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                待复核 {badRows} 行
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-amber-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2',
              activeTab === tab.key
                ? 'border-brand-500 text-brand-700 bg-amber-50/50'
                : 'border-transparent text-amber-600 hover:text-amber-800 hover:bg-amber-50/30'
            )}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-96">
        {activeTab === 'temperature' && (
          <TemperatureTable logs={preview.temperatureLogs} />
        )}
        {activeTab === 'sugar' && (
          <SugarTable readings={preview.sugarReadings} />
        )}
        {activeTab === 'feeding' && (
          <FeedingTable records={preview.feedingRecords} />
        )}
        {activeTab === 'badRows' && (
          <BadRowsTable 
            badRows={preview.badRows} 
            expanded={expandedBadRows}
            onToggle={() => setExpandedBadRows(!expandedBadRows)}
          />
        )}
      </div>

      <div className="px-6 py-4 border-t border-amber-50 bg-amber-50/30 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          取消
        </Button>
        <Button onClick={onConfirm} loading={isLoading}>
          确认导入
        </Button>
      </div>
    </div>
  );
};

function TemperatureTable({ logs }: { logs: ImportPreview['temperatureLogs'] }) {
  return (
    <table className="w-full">
      <thead className="bg-amber-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">行号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">缸号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">时间</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">温度</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">状态</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-amber-50">
        {logs.map((log, idx) => (
          <tr 
            key={log.id}
            className={cn(
              'transition-colors hover:bg-amber-50/50',
              log.isBadRow && 'bg-yellow-50'
            )}
          >
            <td className="px-4 py-3 text-sm text-amber-900">{idx + 1}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{log.tankNo || '-'}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{formatDateTime(log.timestamp)}</td>
            <td className="px-4 py-3 text-sm">
              {log.isBadRow ? (
                <span className="text-red-500 line-through">{log.rawValue}</span>
              ) : (
                <span className="text-amber-900">{formatTemperature(log.temperature)}</span>
              )}
            </td>
            <td className="px-4 py-3">
              {log.isBadRow ? (
                <Badge variant="warning">待复核</Badge>
              ) : (
                <Badge variant="success">正常</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SugarTable({ readings }: { readings: ImportPreview['sugarReadings'] }) {
  return (
    <table className="w-full">
      <thead className="bg-amber-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">行号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">缸号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">时间</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">糖度</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">原单位</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">状态</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-amber-50">
        {readings.map((reading, idx) => (
          <tr 
            key={reading.id}
            className={cn(
              'transition-colors hover:bg-amber-50/50',
              reading.isBadRow && 'bg-yellow-50'
            )}
          >
            <td className="px-4 py-3 text-sm text-amber-900">{idx + 1}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{reading.tankNo || '-'}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{formatDateTime(reading.timestamp)}</td>
            <td className="px-4 py-3 text-sm">
              {reading.isBadRow ? (
                <span className="text-red-500 line-through">{reading.rawValue}</span>
              ) : (
                <span className="text-amber-900">{formatBrix(reading.brix)}</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-amber-600">{reading.originalUnit}</td>
            <td className="px-4 py-3">
              {reading.isBadRow ? (
                <Badge variant="warning">待复核</Badge>
              ) : (
                <Badge variant="success">正常</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedingTable({ records }: { records: ImportPreview['feedingRecords'] }) {
  return (
    <table className="w-full">
      <thead className="bg-amber-50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">行号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">缸号</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">时间</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">投料类型</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">数量</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-amber-50">
        {records.map((record, idx) => (
          <tr key={record.id} className="transition-colors hover:bg-amber-50/50">
            <td className="px-4 py-3 text-sm text-amber-900">{idx + 1}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{record.tankNo || '-'}</td>
            <td className="px-4 py-3 text-sm text-amber-900">{formatDateTime(record.timestamp)}</td>
            <td className="px-4 py-3 text-sm text-amber-900">
              <Badge variant="amber">{record.type}</Badge>
            </td>
            <td className="px-4 py-3 text-sm text-amber-900">{record.amount} {record.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BadRowsTable({ 
  badRows, 
  expanded, 
  onToggle 
}: { 
  badRows: ImportPreview['badRows'];
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayRows = expanded ? badRows : badRows.slice(0, 5);

  return (
    <div>
      {badRows.length === 0 ? (
        <div className="p-8 text-center text-amber-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>没有待复核的数据行</p>
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead className="bg-yellow-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-yellow-700 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-yellow-700 uppercase tracking-wider">行号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-yellow-700 uppercase tracking-wider">错误原因</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-yellow-700 uppercase tracking-wider">原始数据</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-yellow-100">
              {displayRows.map((badRow, idx) => (
                <tr key={idx} className="bg-yellow-50/50">
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="warning">
                      {badRow.type === 'temperature' ? '温度' : badRow.type === 'sugar' ? '糖度' : '投料'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-900 font-mono">{badRow.row}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{badRow.reason}</td>
                  <td className="px-4 py-3 text-sm text-amber-700 font-mono text-xs">
                    <code className="bg-yellow-100 px-2 py-1 rounded">{badRow.rawData}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {badRows.length > 5 && (
            <div className="p-3 text-center border-t border-yellow-100">
              <button
                onClick={onToggle}
                className="text-sm text-amber-600 hover:text-amber-800 inline-flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    收起 <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    查看全部 {badRows.length} 行 <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
