import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Calendar,
  Droplets,
  Clock,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDryingStore } from '@/store/useDryingStore';
import { formatTime } from '@/utils/calculator';
import type { DryingRecord } from '@/types';

export default function History() {
  const navigate = useNavigate();
  const { records, loadRecords, useRecordParams, deleteRecord } = useDryingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = searchTerm
    ? records.filter(
        (r) =>
          r.params.materialName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          r.notes.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  const groupedRecords = filteredRecords.reduce<Record<string, DryingRecord[]>>((acc, record) => {
    const name = record.params.materialName || '未命名物料';
    if (!acc[name]) acc[name] = [];
    acc[name].push(record);
    return acc;
  }, {});

  const handleUseRecord = (record: DryingRecord) => {
    useRecordParams(record);
    navigate('/');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteRecord(id);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-warm-600 hover:text-primary-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            返回估算器
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Archive className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-warm-800">烘干经验档案</h1>
              <p className="text-sm text-warm-500">
                共 {records.length} 条记录 · {Object.keys(groupedRecords).length} 种物料
              </p>
            </div>
          </div>
        </header>

        <div className="card mb-6">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索物料名称或备注..."
                className="input-field pl-12"
              />
            </div>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="card">
            <div className="p-16 text-center">
              <Archive className="w-16 h-16 mx-auto mb-4 text-warm-200" />
              <p className="text-warm-500 mb-2">暂无烘干记录</p>
              <p className="text-sm text-warm-400">
                在估算器中记录实际烘干数据后，会保存在这里
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary mt-6 inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                去估算
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRecords).map(([materialName, materialRecords]) => (
              <div key={materialName} className="card overflow-hidden">
                <div className="card-header !py-3 !px-5">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5" />
                    <h2 className="font-bold text-lg">{materialName}</h2>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">
                      {materialRecords.length} 条记录
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-warm-100">
                  {materialRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 hover:bg-warm-50/50 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === record.id ? null : record.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-warm-500">
                            <Calendar className="w-4 h-4" />
                            {record.date}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-warm-600">
                              <Droplets className="w-4 h-4 text-primary-500" />
                              {record.params.initialMoisture}% → {record.params.targetMoisture}%
                            </span>
                            <span className="flex items-center gap-1 text-warm-600">
                              <Clock className="w-4 h-4 text-primary-500" />
                              实际 {record.actualTime}h
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseRecord(record);
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                          >
                            一键复用
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, record.id)}
                            className="text-warm-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedId === record.id ? (
                            <ChevronUp className="w-5 h-5 text-warm-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-warm-400" />
                          )}
                        </div>
                      </div>

                      {expandedId === record.id && (
                        <div className="mt-4 pt-4 border-t border-warm-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <DetailItem
                            label="物料重量"
                            value={`${record.params.weight} kg`}
                          />
                          <DetailItem
                            label="烘房温度"
                            value={`${record.params.temperature} ℃`}
                          />
                          <DetailItem
                            label="排风量"
                            value={`${record.params.airFlow} m³/h`}
                          />
                          <DetailItem
                            label="环境湿度"
                            value={`${record.params.ambientHumidity}%`}
                          />
                          <DetailItem
                            label="预估排湿"
                            value={`${record.result.waterToRemove} kg`}
                          />
                          <DetailItem
                            label="预估时长"
                            value={formatTime(record.result.estimatedTime)}
                          />
                          <DetailItem
                            label="实际水分"
                            value={`${record.actualMoisture}%`}
                          />
                          <DetailItem
                            label="实际时长"
                            value={`${record.actualTime} 小时`}
                          />
                          {record.notes && (
                            <div className="col-span-full bg-warm-50 rounded-lg p-3">
                              <div className="text-xs text-warm-500 mb-1">备注</div>
                              <div className="text-sm text-warm-700">{record.notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-warm-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-warm-700 font-mono">{value}</div>
    </div>
  );
}
