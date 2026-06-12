import { useState } from 'react';
import {
  Upload,
  Search,
  FileText,
  Users,
  Sparkles,
  AlertTriangle,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store';
import type { DataCategory } from '../types';

const categories: { key: DataCategory; label: string; icon: typeof FileText; color: string }[] = [
  { key: 'inspection', label: '巡检记录', icon: FileText, color: 'text-blue-500 bg-blue-50' },
  { key: 'cleaning', label: '保洁打卡', icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
  { key: 'passenger', label: '客流统计', icon: Users, color: 'text-green-500 bg-green-50' },
  { key: 'complaint', label: '群众投诉', icon: AlertTriangle, color: 'text-orange-500 bg-orange-50' },
];

export default function DataManagement() {
  const {
    toilets,
    inspections,
    cleaningRecords,
    passengerFlows,
    complaints,
    aliases,
    initMockData,
    addAlias,
    removeAlias,
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<DataCategory>('inspection');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [newAlias, setNewAlias] = useState({ toiletId: '', aliasName: '', source: '' });

  const getDataCount = (category: DataCategory) => {
    switch (category) {
      case 'inspection': return inspections.length;
      case 'cleaning': return cleaningRecords.length;
      case 'passenger': return passengerFlows.length;
      case 'complaint': return complaints.length;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`文件 "${file.name}" 已上传，正在解析...`);
    }
  };

  const handleAddAlias = () => {
    if (newAlias.toiletId && newAlias.aliasName) {
      addAlias({
        id: `alias_${Date.now()}`,
        toiletId: newAlias.toiletId,
        aliasName: newAlias.aliasName,
        source: newAlias.source || '手动添加',
      });
      setNewAlias({ toiletId: '', aliasName: '', source: '' });
      setShowAliasModal(false);
    }
  };

  const filteredAliases = aliases.filter(
    (a) =>
      a.aliasName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toilets.find((t) => t.id === a.toiletId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">数据管理</h1>
          <p className="text-navy-500 mt-1">管理巡检、保洁、客流、投诉四类数据及点位别名</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            导入数据
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={initMockData}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:bg-navy-50 transition-colors text-navy-600"
          >
            <FileText className="w-4 h-4" />
            生成示例数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.map((cat, index) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`p-4 rounded-xl text-left transition-all ${
                activeCategory === cat.key
                  ? 'bg-primary-50 border-2 border-primary-500 shadow-md'
                  : 'bg-white border-2 border-transparent shadow-sm hover:shadow-md'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-navy-800">{cat.label}</p>
                  <p className="text-2xl font-bold text-navy-900">{getDataCount(cat.key)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-navy-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy-800">
                {categories.find((c) => c.key === activeCategory)?.label}
              </h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase">
                    公厕名称
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase">
                    人员
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase">
                    状态/类型
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {activeCategory === 'inspection' &&
                  inspections.slice(0, 10).map((record) => {
                    const toilet = toilets.find((t) => t.id === record.toiletId);
                    return (
                      <tr key={record.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3 text-sm text-navy-700">{toilet?.name}</td>
                        <td className="px-4 py-3 text-sm text-navy-500">{record.inspectTime}</td>
                        <td className="px-4 py-3 text-sm text-navy-700">{record.inspector}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              record.status === '正常'
                                ? 'bg-green-100 text-green-700'
                                : record.status === '异常'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeCategory === 'cleaning' &&
                  cleaningRecords.slice(0, 10).map((record) => {
                    const toilet = toilets.find((t) => t.id === record.toiletId);
                    return (
                      <tr key={record.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3 text-sm text-navy-700">{toilet?.name}</td>
                        <td className="px-4 py-3 text-sm text-navy-500">{record.checkinTime}</td>
                        <td className="px-4 py-3 text-sm text-navy-700">{record.cleaner}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                            {record.checkType}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeCategory === 'passenger' &&
                  passengerFlows.slice(0, 10).map((record) => {
                    const toilet = toilets.find((t) => t.id === record.toiletId);
                    return (
                      <tr key={record.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3 text-sm text-navy-700">{toilet?.name}</td>
                        <td className="px-4 py-3 text-sm text-navy-500">
                          {record.flowDate} {record.hour}:00
                        </td>
                        <td className="px-4 py-3 text-sm text-navy-700">{record.count} 人次</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            {record.source}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {activeCategory === 'complaint' &&
                  complaints.slice(0, 10).map((record) => {
                    const toilet = toilets.find((t) => t.id === record.toiletId);
                    return (
                      <tr key={record.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3 text-sm text-navy-700">
                          {toilet?.name}
                          {record.isDuplicate && (
                            <span className="ml-2 text-xs text-navy-400">(重复)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-navy-500">{record.complaintTime}</td>
                        <td className="px-4 py-3 text-sm text-navy-700">{record.type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              record.status === '已解决'
                                ? 'bg-green-100 text-green-700'
                                : record.status === '处理中'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-navy-100 flex items-center justify-between">
            <p className="text-sm text-navy-500">
              显示 1-10 条，共 {getDataCount(activeCategory)} 条
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm text-navy-500 border border-navy-200 rounded-md hover:bg-navy-50">
                上一页
              </button>
              <button className="px-3 py-1 text-sm text-white bg-primary-500 rounded-md">
                1
              </button>
              <button className="px-3 py-1 text-sm text-navy-500 border border-navy-200 rounded-md hover:bg-navy-50">
                下一页
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-navy-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-500" />
                点位别名管理
              </h3>
              <button
                onClick={() => setShowAliasModal(true)}
                className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-navy-400 mt-1">
              统一点位名称，处理不同系统的别名映射
            </p>
          </div>

          <div className="divide-y divide-navy-100 max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredAliases.map((alias) => {
              const toilet = toilets.find((t) => t.id === alias.toiletId);
              return (
                <div key={alias.id} className="p-3 hover:bg-navy-50 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-700 truncate">
                        {alias.aliasName}
                      </p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        → {toilet?.name}
                      </p>
                      <span className="text-xs text-navy-300">{alias.source}</span>
                    </div>
                    <button
                      onClick={() => removeAlias(alias.id)}
                      className="p-1 text-navy-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAliasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl animate-slide-up">
            <h3 className="text-lg font-semibold text-navy-800 mb-4">添加别名</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-navy-600 mb-1 block">
                  选择公厕
                </label>
                <select
                  value={newAlias.toiletId}
                  onChange={(e) => setNewAlias({ ...newAlias, toiletId: e.target.value })}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">请选择公厕</option>
                  {toilets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-navy-600 mb-1 block">
                  别名名称
                </label>
                <input
                  type="text"
                  value={newAlias.aliasName}
                  onChange={(e) => setNewAlias({ ...newAlias, aliasName: e.target.value })}
                  placeholder="请输入别名"
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-navy-600 mb-1 block">
                  来源
                </label>
                <input
                  type="text"
                  value={newAlias.source}
                  onChange={(e) => setNewAlias({ ...newAlias, source: e.target.value })}
                  placeholder="请输入来源"
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAliasModal(false)}
                className="flex-1 px-4 py-2 border border-navy-200 rounded-lg text-navy-600 hover:bg-navy-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddAlias}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
