import { useState, useEffect } from 'react';
import type { MemberWithPackages } from '../../shared/types';
import { memberApi } from '../lib/services';
import { useAppStore } from '../store/appStore';
import { Search, Plus, User, Phone, Car, CreditCard } from 'lucide-react';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithPackages[]>([]);
  const [keyword, setKeyword] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithPackages | null>(null);
  const [newMember, setNewMember] = useState({ name: '', phone: '', plateNumber: '' });
  const [newPackage, setNewPackage] = useState({ packageName: '', totalTimes: '', pricePerTime: '' });
  const [showAddPackage, setShowAddPackage] = useState(false);
  const { showToast } = useAppStore();

  const loadMembers = async () => {
    try {
      const data = await memberApi.search(keyword);
      setMembers(data);
    } catch {
      showToast('error', '加载会员失败');
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadMembers, 200);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleCreateMember = async () => {
    if (!newMember.name || !newMember.phone || !newMember.plateNumber) {
      showToast('warning', '请填写完整信息');
      return;
    }
    try {
      await memberApi.create(newMember);
      showToast('success', '会员创建成功');
      setShowAdd(false);
      setNewMember({ name: '', phone: '', plateNumber: '' });
      loadMembers();
    } catch {
      showToast('error', '创建失败');
    }
  };

  const handleAddPackage = async () => {
    if (!selectedMember || !newPackage.packageName || !newPackage.totalTimes || !newPackage.pricePerTime) {
      showToast('warning', '请填写完整信息');
      return;
    }
    try {
      await memberApi.addPackage(selectedMember.id, {
        packageName: newPackage.packageName,
        totalTimes: Number(newPackage.totalTimes),
        pricePerTime: Number(newPackage.pricePerTime),
      });
      showToast('success', '套餐添加成功');
      setShowAddPackage(false);
      setNewPackage({ packageName: '', totalTimes: '', pricePerTime: '' });
      const updated = await memberApi.getById(selectedMember.id);
      setSelectedMember(updated);
      loadMembers();
    } catch {
      showToast('error', '添加失败');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">会员管理</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理会员信息和套餐余额</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl font-medium hover:bg-brand-light transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            新增会员
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6 flex gap-6">
        <div className="w-96 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索姓名、手机号、车牌号..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all shadow-card"
            />
          </div>

          <div className="flex-1 overflow-auto space-y-3 pr-1">
            {members.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`p-4 bg-white rounded-xl shadow-card cursor-pointer transition-all border-2 ${
                  selectedMember?.id === m.id
                    ? 'border-brand bg-brand-50/50'
                    : 'border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand to-blue-400 rounded-xl flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {m.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {m.plateNumber}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {m.packages.length === 0 ? (
                    <span className="text-xs text-slate-400">暂无套餐</span>
                  ) : (
                    m.packages.map((p) => (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                          p.remainingTimes <= 0
                            ? 'bg-red-100 text-red-600'
                            : p.remainingTimes <= 2
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        <CreditCard className="w-3 h-3" />
                        {p.packageName} {p.remainingTimes}/{p.totalTimes}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>暂无会员</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-card overflow-hidden">
          {selectedMember ? (
            <div className="h-full flex flex-col">
              <div className="p-6 bg-gradient-to-r from-brand to-blue-500 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{selectedMember.name}</div>
                    <div className="text-white/80 text-sm flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedMember.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        {selectedMember.plateNumber}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/70">
                  注册于 {new Date(selectedMember.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>

              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">套餐列表</h3>
                  <button
                    onClick={() => setShowAddPackage(true)}
                    className="flex items-center gap-1 text-sm text-brand font-medium hover:text-brand-light"
                  >
                    <Plus className="w-4 h-4" />
                    新增套餐
                  </button>
                </div>

                {showAddPackage && (
                  <div className="mb-4 p-4 bg-brand-50 rounded-xl border border-brand-100 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="套餐名称"
                        value={newPackage.packageName}
                        onChange={(e) => setNewPackage((s) => ({ ...s, packageName: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        placeholder="总次数"
                        value={newPackage.totalTimes}
                        onChange={(e) => setNewPackage((s) => ({ ...s, totalTimes: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        placeholder="单价(元)"
                        value={newPackage.pricePerTime}
                        onChange={(e) => setNewPackage((s) => ({ ...s, pricePerTime: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddPackage}
                        className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light"
                      >
                        确认添加
                      </button>
                      <button
                        onClick={() => {
                          setShowAddPackage(false);
                          setNewPackage({ packageName: '', totalTimes: '', pricePerTime: '' });
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedMember.packages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      暂无套餐
                    </div>
                  ) : (
                    selectedMember.packages.map((p) => {
                      const percent = Math.round((p.remainingTimes / p.totalTimes) * 100);
                      return (
                        <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-bold text-slate-900">{p.packageName}</div>
                              <div className="text-xs text-slate-500">单价 ¥{p.pricePerTime}/次</div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-brand">{p.remainingTimes}</div>
                              <div className="text-xs text-slate-400">/ {p.totalTimes} 次</div>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percent <= 0
                                  ? 'bg-red-400'
                                  : percent <= 20
                                  ? 'bg-orange-400'
                                  : 'bg-gradient-to-r from-brand to-blue-400'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-500">选择左侧会员查看详情</p>
              <p className="text-slate-400 text-sm mt-1">可查看套餐余额和添加新套餐</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">新增会员</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                  placeholder="请输入会员姓名"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">手机号</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={(e) => setNewMember((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">车牌号</label>
                <input
                  type="text"
                  value={newMember.plateNumber}
                  onChange={(e) => setNewMember((s) => ({ ...s, plateNumber: e.target.value.toUpperCase() }))}
                  placeholder="例如：京A12345"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl text-sm font-medium hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleCreateMember}
                className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-light"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
