import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, AlertTriangle, Car } from 'lucide-react';
import type { MemberWithPackages, Worker, PayType } from '../../../shared/types';
import { memberApi, workerApi } from '../../lib/services';
import { useAppStore } from '../../store/appStore';
import clsx from 'clsx';

interface VehicleFormProps {
  onSubmit: (data: {
    plateNumber: string;
    memberId?: string;
    packageId?: string;
    payType: PayType;
    cashAmount?: number;
    workerId?: string;
  }) => void;
  loading?: boolean;
}

interface SimilarPlate {
  plateNumber: string;
  id?: string;
  name?: string;
  similarity: number;
}

export function VehicleForm({ onSubmit, loading }: VehicleFormProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [similarPlates, setSimilarPlates] = useState<SimilarPlate[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberWithPackages | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [payType, setPayType] = useState<PayType>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [workerId, setWorkerId] = useState<string>('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showNewMember, setShowNewMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', phone: '' });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { showToast } = useAppStore();

  useEffect(() => {
    workerApi.getList().then(setWorkers);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (plateNumber.length >= 4) {
      debounceRef.current = setTimeout(async () => {
        try {
          const similar = await memberApi.findSimilarPlates(plateNumber);
          setSimilarPlates(similar.slice(0, 3));
          const exact = await memberApi.getByPlate(plateNumber).catch(() => null);
          setSelectedMember(exact);
          if (exact && exact.packages.length > 0) {
            setSelectedPackageId(exact.packages[0].id);
            setPayType('member');
          } else {
            setSelectedPackageId('');
            setPayType('cash');
          }
        } catch {
          setSimilarPlates([]);
          setSelectedMember(null);
        }
      }, 300);
    } else {
      setSimilarPlates([]);
      setSelectedMember(null);
      setSelectedPackageId('');
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [plateNumber]);

  const handleSelectSimilar = async (plate: SimilarPlate) => {
    setPlateNumber(plate.plateNumber);
    setSimilarPlates([]);
    if (plate.id) {
      const member = await memberApi.getById(plate.id);
      setSelectedMember(member);
      if (member.packages.length > 0) {
        setSelectedPackageId(member.packages[0].id);
        setPayType('member');
      }
    }
  };

  const handleCreateMember = async () => {
    if (!newMember.name || !newMember.phone) {
      showToast('warning', '请填写会员姓名和手机号');
      return;
    }
    try {
      const member = await memberApi.create({ ...newMember, plateNumber: plateNumber.toUpperCase() });
      setSelectedMember(member);
      setShowNewMember(false);
      setNewMember({ name: '', phone: '' });
      showToast('success', '会员创建成功');
    } catch {
      showToast('error', '创建会员失败');
    }
  };

  const handleSubmit = () => {
    if (!plateNumber.trim()) {
      showToast('warning', '请输入车牌号');
      return;
    }
    if (payType === 'member' && !selectedPackageId) {
      showToast('warning', '请选择套餐');
      return;
    }
    if (payType === 'cash' && !cashAmount) {
      showToast('warning', '请输入现金金额');
      return;
    }
    onSubmit({
      plateNumber: plateNumber.toUpperCase(),
      memberId: selectedMember?.id,
      packageId: selectedPackageId || undefined,
      payType,
      cashAmount: payType === 'cash' ? Number(cashAmount) : undefined,
      workerId: workerId || undefined,
    });
  };

  const selectedPkg = selectedMember?.packages.find((p) => p.id === selectedPackageId);

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
        <Car className="w-5 h-5 text-brand" />
        车辆登记
      </h2>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">车牌号</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="例如：京A12345"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          {similarPlates.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
              <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 text-xs text-orange-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                检测到相似车牌，请确认：
              </div>
              {similarPlates.map((p) => (
                <button
                  key={p.plateNumber}
                  onClick={() => handleSelectSimilar(p)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between border-b last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-slate-900">{p.plateNumber}</span>
                    {p.name && <span className="ml-2 text-sm text-slate-500">{p.name}</span>}
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(p.similarity * 100)}% 相似</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMember && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">✓ 已识别会员</span>
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setSelectedPackageId('');
                  setPayType('cash');
                }}
                className="text-xs text-green-600 hover:text-green-800"
              >
                清除
              </button>
            </div>
            <div className="font-bold text-slate-900">{selectedMember.name}</div>
            <div className="text-sm text-slate-600">{selectedMember.phone}</div>
            {selectedMember.packages.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-green-800">选择套餐</label>
                {selectedMember.packages.map((pkg) => (
                  <label
                    key={pkg.id}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                      selectedPackageId === pkg.id
                        ? 'border-green-500 bg-white'
                        : 'border-green-200 bg-white/60 hover:bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedPackageId === pkg.id}
                        onChange={() => {
                          setSelectedPackageId(pkg.id);
                          setPayType('member');
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{pkg.packageName}</div>
                        <div className="text-xs text-slate-500">单价 ¥{pkg.pricePerTime}/次</div>
                      </div>
                    </div>
                    <div className={clsx(
                      'text-sm font-bold px-2.5 py-1 rounded-md',
                      pkg.remainingTimes <= 0 ? 'bg-red-100 text-red-600' : pkg.remainingTimes <= 2 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    )}>
                      剩余 {pkg.remainingTimes}/{pkg.totalTimes} 次
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedMember && plateNumber.length >= 4 && similarPlates.length === 0 && (
          <button
            onClick={() => setShowNewMember(true)}
            className="w-full p-3 border border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-brand hover:text-brand hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            新会员？快速注册
          </button>
        )}

        {showNewMember && (
          <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 space-y-3 animate-fade-in">
            <div className="font-medium text-brand-800">注册新会员</div>
            <input
              type="text"
              placeholder="姓名"
              value={newMember.name}
              onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand"
            />
            <input
              type="tel"
              placeholder="手机号"
              value={newMember.phone}
              onChange={(e) => setNewMember((s) => ({ ...s, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateMember}
                className="flex-1 py-2 bg-brand text-white rounded-lg hover:bg-brand-light transition-colors text-sm font-medium"
              >
                确认注册
              </button>
              <button
                onClick={() => setShowNewMember(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {!selectedMember && (
          <div className="flex gap-2">
            <button
              onClick={() => setPayType('cash')}
              className={clsx(
                'flex-1 py-3 rounded-xl font-medium transition-all',
                payType === 'cash' ? 'bg-brand text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              现金支付
            </button>
            <button
              onClick={() => {
                showToast('info', '会员支付需先识别或注册会员');
              }}
              className={clsx(
                'flex-1 py-3 rounded-xl font-medium transition-all',
                payType === 'member' ? 'bg-brand text-white shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
              disabled
            >
              会员扣次
            </button>
          </div>
        )}

        {payType === 'cash' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">金额 (元)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">¥</span>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="35"
                className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">分配洗车工 (可选)</label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all bg-white"
          >
            <option value="">不分配（先排队）</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPkg && selectedPkg.remainingTimes <= 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">套餐已用完</div>
              <div className="text-red-600/80 text-xs">该套餐剩余次数为 0，无法扣次核销。请选择现金支付或续费套餐。</div>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || (selectedPkg && selectedPkg.remainingTimes <= 0)}
          className={clsx(
            'w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg',
            loading || (selectedPkg && selectedPkg.remainingTimes <= 0)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand to-brand-light text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
          )}
        >
          {loading ? '提交中...' : '🚗 创建核销单并排队'}
        </button>
      </div>
    </div>
  );
}
