import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Star,
  MessageSquare,
  ChevronRight,
  X,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { socialWorkerApi } from '../../services/api';
import { FRAUD_TYPE_LABELS, type FraudType } from '../../../shared/types';

interface ElderlyItem {
  id: number;
  name: string;
  phoneLast4: string;
  age?: number;
  community?: string;
  isFocus: boolean;
  totalGames: number;
  correctRate: number;
  lastPlayTime?: string;
  weakFraudTypes: FraudType[];
}

interface FollowUpRecord {
  id: number;
  socialWorkerName: string;
  notes: string;
  createdAt: string;
}

export default function ElderlyManagement() {
  const [elderlyList, setElderlyList] = useState<ElderlyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFocus, setFilterFocus] = useState(false);
  const [selectedElderly, setSelectedElderly] = useState<ElderlyItem | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await socialWorkerApi.listElderly();
      setElderlyList(data as ElderlyItem[]);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFocus = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await socialWorkerApi.toggleFocus(id);
      loadData();
    } catch (err) {
      alert('操作失败');
    }
  };

  const openDetail = async (elderly: ElderlyItem) => {
    setSelectedElderly(elderly);
    setShowModal(true);
    setNewNote('');
    
    try {
      const data = await socialWorkerApi.getElderlyDetail(elderly.id);
      setFollowUps(data.followUps || []);
    } catch (err) {
      console.error('加载详情失败:', err);
    }
  };

  const addFollowUp = async () => {
    if (!newNote.trim() || !selectedElderly) return;
    
    setSavingNote(true);
    try {
      await socialWorkerApi.addFollowUp(selectedElderly.id, newNote.trim());
      setNewNote('');
      const data = await socialWorkerApi.getElderlyDetail(selectedElderly.id);
      setFollowUps(data.followUps || []);
    } catch (err) {
      alert('添加失败');
    } finally {
      setSavingNote(false);
    }
  };

  const filteredList = elderlyList.filter((e) => {
    if (filterFocus && !e.isFocus) return false;
    if (search && !e.name.includes(search) && !e.phoneLast4.includes(search)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">老人管理</h1>
        <p className="text-gray-500">查看老人学习情况，标记重点关注对象，添加跟进记录</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名或手机号后四位..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={filterFocus}
              onChange={(e) => setFilterFocus(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            只看重点关注
          </label>
        </div>

        <div className="divide-y">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              暂无老人数据
            </div>
          ) : (
            filteredList.map((elderly) => (
              <div
                key={elderly.id}
                onClick={() => openDetail(elderly)}
                className="p-5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {elderly.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-800">{elderly.name}</h3>
                    {elderly.isFocus && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-500" />
                        重点关注
                      </span>
                    )}
                    {elderly.age && (
                      <span className="text-sm text-gray-500">{elderly.age}岁</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3">
                    <span>手机尾号：{elderly.phoneLast4}</span>
                    {elderly.community && <span>{elderly.community}</span>}
                    <span>答题 {elderly.totalGames} 次</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xl font-bold ${
                      elderly.correctRate >= 70
                        ? 'text-green-600'
                        : elderly.correctRate >= 40
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {elderly.correctRate}%
                  </div>
                  <div className="text-xs text-gray-500">正确率</div>
                </div>
                <button
                  onClick={(e) => handleToggleFocus(elderly.id, e)}
                  className={`p-2 rounded-lg transition-colors ${
                    elderly.isFocus
                      ? 'text-yellow-500 hover:bg-yellow-50'
                      : 'text-gray-300 hover:bg-gray-50 hover:text-yellow-500'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${elderly.isFocus ? 'fill-yellow-500' : ''}`}
                  />
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t text-sm text-gray-500">
          共 {filteredList.length} 位老人
        </div>
      </div>

      {showModal && selectedElderly && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedElderly.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedElderly.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedElderly.age ? `${selectedElderly.age}岁 · ` : ''}
                    手机尾号 {selectedElderly.phoneLast4}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">{selectedElderly.totalGames}</p>
                  <p className="text-sm text-blue-600">答题次数</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-700">{selectedElderly.correctRate}%</p>
                  <p className="text-sm text-green-600">正确率</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl text-center">
                  <p className="text-xl font-bold text-orange-700">
                    {selectedElderly.lastPlayTime
                      ? new Date(selectedElderly.lastPlayTime).toLocaleDateString()
                      : '无'}
                  </p>
                  <p className="text-sm text-orange-600">上次学习</p>
                </div>
              </div>

              {selectedElderly.weakFraudTypes.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">薄弱骗局类型</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedElderly.weakFraudTypes.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                      >
                        {FRAUD_TYPE_LABELS[type]}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-red-600 mt-3">
                    建议重点跟进和辅导，针对性讲解这些类型的防骗知识
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  跟进记录
                </h3>
                <div className="space-y-3">
                  {followUps.length === 0 ? (
                    <p className="text-gray-400 text-center py-6">暂无跟进记录</p>
                  ) : (
                    followUps.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                          <span className="font-medium text-gray-700">
                            {record.socialWorkerName}
                          </span>
                          <span>{new Date(record.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="添加跟进记录..."
                  rows={2}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <button
                  onClick={addFollowUp}
                  disabled={!newNote.trim() || savingNote}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
