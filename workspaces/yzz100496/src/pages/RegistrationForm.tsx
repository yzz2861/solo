import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  UserPlus,
  Trash2,
  FileText,
  Shield,
  Home,
  CreditCard,
  Users,
  AlertCircle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  RELATION_LABELS, 
  ID_TYPE_LABELS, 
  INSURANCE_PLANS, 
  ROOM_TYPES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  type RelationType,
  type IdType,
  type PaymentMethod,
  type PaymentType
} from '@/types';
import { 
  formatCurrency, 
  generateId, 
  calculateDeposit,
  validatePhone,
  maskIdNumber,
  calculateAge
} from '@/utils';

const steps = [
  { id: 'family', label: '家庭信息', icon: Users },
  { id: 'members', label: '成员证件', icon: FileText },
  { id: 'health', label: '健康信息', icon: Shield },
  { id: 'insurance', label: '保险房型', icon: Home },
  { id: 'contract', label: '合同确认', icon: FileText },
  { id: 'payment', label: '付款记录', icon: CreditCard },
];

export default function RegistrationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registrations, trips, currentTripId, addRegistration, updateRegistration } = useStore();
  
  const existingReg = id ? registrations.find(r => r.id === id) : null;
  const isEdit = !!existingReg;
  
  const currentTrip = trips.find(t => t.id === (existingReg?.tripId || currentTripId));
  
  const [currentStep, setCurrentStep] = useState(0);
  const [tripId, setTripId] = useState(existingReg?.tripId || currentTripId || '');
  const [familyName, setFamilyName] = useState(existingReg?.familyName || '');
  const [contactPhone, setContactPhone] = useState(existingReg?.contactPhone || '');
  const [members, setMembers] = useState(existingReg?.members || []);
  const [selectedInsurance, setSelectedInsurance] = useState(existingReg?.insurance?.planType || '');
  const [roomType, setRoomType] = useState(existingReg?.roomBooking.roomType || '家庭房');
  const [roomCount, setRoomCount] = useState(existingReg?.roomBooking.roomCount || 1);
  const [hasExtraBed, setHasExtraBed] = useState(existingReg?.roomBooking.hasExtraBed || false);
  const [sharingRequest, setSharingRequest] = useState(existingReg?.roomBooking.sharingRequest || '');
  const [contractStatus, setContractStatus] = useState(existingReg?.contract.status || 'unsigned');
  const [signedBy, setSignedBy] = useState(existingReg?.contract.signedBy || '');
  const [specialNotes, setSpecialNotes] = useState(existingReg?.specialNotes || '');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [phoneError, setPhoneError] = useState('');

  const memberCount = members.length;
  const insurancePlan = INSURANCE_PLANS.find(p => p.type === selectedInsurance);
  const roomTypeInfo = ROOM_TYPES.find(r => r.name === roomType);
  
  const basePrice = currentTrip?.basePrice || 0;
  const baseTotal = basePrice * memberCount;
  const insuranceTotal = insurancePlan ? insurancePlan.premiumPerPerson * memberCount : 0;
  const roomTotal = (roomTypeInfo?.price || 0) * roomCount;
  const extraBedTotal = hasExtraBed ? 80 * roomCount : 0;
  const totalAmount = baseTotal + insuranceTotal + roomTotal + extraBedTotal;
  const depositAmount = calculateDeposit(totalAmount);
  const finalPaymentAmount = totalAmount - depositAmount;

  const handleNext = () => {
    if (currentStep === 0) {
      if (!familyName.trim()) {
        alert('请输入家庭名称');
        return;
      }
      const phoneValidation = validatePhone(contactPhone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.message);
        return;
      }
      setPhoneError('');
    }
    
    if (currentStep === 1 && members.length === 0) {
      alert('请至少添加一位家庭成员');
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (!tripId) {
      alert('请选择团期');
      return;
    }
    if (!familyName.trim()) {
      alert('请输入家庭名称');
      return;
    }
    if (members.length === 0) {
      alert('请至少添加一位家庭成员');
      return;
    }

    const trip = trips.find(t => t.id === tripId);
    
    const regData = {
      tripId,
      tripName: trip?.name || '',
      departureDate: trip?.startDate || '',
      returnDate: trip?.endDate || '',
      familyName,
      contactPhone,
      status: existingReg?.status || 'pending',
      members,
      basePrice: basePrice,
      totalAmount,
      depositAmount,
      finalPaymentAmount,
      finalPaymentDueDate: trip ? new Date(new Date(trip.startDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
      insurance: insurancePlan ? {
        planName: insurancePlan.name,
        planType: insurancePlan.type,
        premiumPerPerson: insurancePlan.premiumPerPerson,
        totalPremium: insuranceTotal,
        insurer: insurancePlan.insurer,
      } : undefined,
      roomBooking: {
        roomType,
        roomCount,
        roomPrice: roomTypeInfo?.price || 0,
        hasExtraBed,
        sharingRequest: sharingRequest || undefined,
      },
      contract: {
        status: contractStatus as any,
        signedDate: contractStatus === 'signed' ? new Date().toISOString().split('T')[0] : undefined,
        signedBy: contractStatus === 'signed' ? signedBy : undefined,
        contractNo: contractStatus === 'signed' ? `HT${Date.now()}` : undefined,
      },
      payments: existingReg?.payments || [],
      specialNotes: specialNotes || undefined,
    };

    if (isEdit && existingReg) {
      updateRegistration(existingReg.id, regData as any);
      alert('报名信息已更新');
      navigate(`/registration/${existingReg.id}`);
    } else {
      const newReg = addRegistration(regData as any);
      alert('报名创建成功');
      if (newReg && (newReg as any).id) {
        navigate(`/registration/${(newReg as any).id}`);
      } else {
        navigate('/registrations');
      }
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setShowMemberModal(true);
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setShowMemberModal(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirm('确定要删除这位成员吗？')) {
      setMembers(members.filter(m => m.id !== memberId));
    }
  };

  const handleSaveMember = (memberData: any) => {
    if (editingMember) {
      setMembers(members.map(m => m.id === editingMember.id ? { ...m, ...memberData } : m));
    } else {
      const newMember = {
        ...memberData,
        id: generateId('mem'),
        registrationId: '',
      };
      setMembers([...members, newMember]);
    }
    setShowMemberModal(false);
    setEditingMember(null);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-warm-800">
            {isEdit ? '编辑报名' : '新建报名'}
          </h1>
          <p className="text-warm-500 text-sm">
            {currentTrip?.name || '请选择团期'}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-success-500 text-white' 
                        : isActive 
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                          : 'bg-warm-100 text-warm-400'
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-success-500' : 'bg-warm-200'
                    }`} />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-success-600' : 'text-warm-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6 mb-6 min-h-[400px]">
        {currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-warm-800">家庭基本信息</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">选择团期 *</label>
                <select 
                  value={tripId} 
                  onChange={(e) => setTripId(e.target.value)}
                  className="input"
                >
                  <option value="">请选择团期</option>
                  {trips.map(trip => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name} - {formatCurrency(trip.basePrice)}/人
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">家庭名称 *</label>
                <input 
                  type="text" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="如：张伟家庭"
                  className="input"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="label">联系电话 *</label>
                <input 
                  type="tel" 
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    setPhoneError('');
                  }}
                  placeholder="请输入手机号码"
                  className={`input ${phoneError ? 'border-danger-400 focus:ring-danger-500' : ''}`}
                />
                {phoneError && (
                  <p className="text-danger-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {phoneError}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="label">特殊备注</label>
                <textarea 
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="如有特殊需求请在此备注"
                  rows={3}
                  className="input resize-none"
                />
              </div>
            </div>
            
            {currentTrip && (
              <div className="bg-primary-50 rounded-xl p-4 mt-6">
                <p className="text-sm text-primary-700">
                  <span className="font-medium">团期信息：</span>
                  {currentTrip.name} · {currentTrip.destination}
                  · {currentTrip.startDate} 至 {currentTrip.endDate}
                  · 儿童年龄要求 {currentTrip.minChildAge}-{currentTrip.maxChildAge}岁
                </p>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-warm-800">家庭成员及证件</h2>
              <button onClick={handleAddMember} className="btn-primary text-sm">
                <UserPlus size={16} />
                添加成员
              </button>
            </div>
            
            {members.length === 0 ? (
              <div className="text-center py-12 text-warm-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p>还没有添加家庭成员</p>
                <button onClick={handleAddMember} className="btn-primary mt-4 text-sm">
                  添加第一位成员
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-4 p-4 bg-warm-50 rounded-xl hover:bg-warm-100 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      member.relation === 'child' ? 'bg-primary-400' :
                      member.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                    }`}>
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-warm-800">{member.name}</h3>
                        <span className="badge-primary">{RELATION_LABELS[member.relation as RelationType]}</span>
                        {member.isPrimary && <span className="badge-success">主联系人</span>}
                      </div>
                      <p className="text-sm text-warm-500 mt-0.5">
                        {calculateAge(member.birthDate)}岁 · {member.gender === 'male' ? '男' : '女'}
                        {member.idCard && ` · ${ID_TYPE_LABELS[member.idCard.type as IdType]}: ${maskIdNumber(member.idCard.number)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditMember(member)}
                        className="btn-ghost p-2 text-sm"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        className="btn-ghost p-2 text-danger-500 hover:bg-danger-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="bg-warm-50 rounded-xl p-4">
              <p className="text-sm text-warm-600">
                已添加 <span className="font-semibold text-primary-600">{memberCount}</span> 位家庭成员
              </p>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-warm-800">健康信息</h2>
            <p className="text-warm-500 text-sm">请填写每位成员的健康信息，特别是过敏史和特殊照护需求</p>
            
            <div className="space-y-4">
              {members.map((member) => (
                <HealthInfoCard 
                  key={member.id} 
                  member={member} 
                  onUpdate={(health) => {
                    setMembers(members.map(m => 
                      m.id === member.id ? { ...m, health } : m
                    ));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-warm-800 mb-4">保险选择</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setSelectedInsurance('')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    !selectedInsurance 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      !selectedInsurance ? 'bg-primary-500 text-white' : 'bg-warm-100 text-warm-500'
                    }`}>
                      <Shield size={20} />
                    </div>
                    <span className="font-medium text-warm-800">不购买</span>
                  </div>
                  <p className="text-sm text-warm-500">客户自行购买保险</p>
                </div>
                
                {INSURANCE_PLANS.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedInsurance(plan.type)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedInsurance === plan.type 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-warm-800">{plan.name}</span>
                      <span className="text-primary-600 font-semibold">¥{plan.premiumPerPerson}/人</span>
                    </div>
                    <p className="text-xs text-warm-500 mb-2">{plan.insurer}</p>
                    <p className="text-xs text-warm-600">{plan.coverage}</p>
                  </div>
                ))}
              </div>
              {selectedInsurance && (
                <p className="text-sm text-warm-500 mt-3">
                  保险合计：<span className="font-semibold text-primary-600">{formatCurrency(insuranceTotal)}</span>
                  （{memberCount}人 × {formatCurrency(insurancePlan?.premiumPerPerson || 0)}）
                </p>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-warm-800 mb-4">房型选择</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROOM_TYPES.map(room => (
                  <div 
                    key={room.id}
                    onClick={() => setRoomType(room.name)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      roomType === room.name 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-warm-800">{room.name}</span>
                      <span className="text-primary-600 font-semibold">¥{room.price}/晚</span>
                    </div>
                    <p className="text-xs text-warm-500">可住 {room.capacity} 人</p>
                    {room.description && (
                      <p className="text-xs text-warm-600 mt-1">{room.description}</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="label">房间数量</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setRoomCount(Math.max(1, roomCount - 1))}
                      className="btn-secondary w-10 h-10 p-0"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-semibold text-lg">{roomCount}</span>
                    <button 
                      onClick={() => setRoomCount(roomCount + 1)}
                      className="btn-secondary w-10 h-10 p-0"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="label">加床</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasExtraBed}
                      onChange={(e) => setHasExtraBed(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-warm-700">需要加床（¥80/床/晚）</span>
                  </label>
                </div>
                
                <div className="md:col-span-2">
                  <label className="label">拼房/特殊要求</label>
                  <input 
                    type="text" 
                    value={sharingRequest}
                    onChange={(e) => setSharingRequest(e.target.value)}
                    placeholder="如有拼房需求或特殊要求请填写"
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-warm-800">合同确认</h2>
            
            <div className="bg-warm-50 rounded-xl p-6 border border-warm-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-primary-500" />
                <h3 className="font-medium text-warm-800">国内旅游合同</h3>
              </div>
              
              <div className="text-sm text-warm-600 space-y-3 max-h-60 overflow-y-auto pr-2">
                <p>甲方（旅游者）：{familyName}</p>
                <p>乙方（旅行社）：阳光亲子旅行社</p>
                <p>团期：{currentTrip?.name || ''}</p>
                <p>出发日期：{currentTrip?.startDate || ''}</p>
                <p>总人数：{memberCount} 人</p>
                <p>总费用：{formatCurrency(totalAmount)}</p>
                
                <div className="pt-3 border-t border-warm-200 mt-3">
                  <p className="font-medium text-warm-700 mb-2">服务标准：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>交通：全程空调旅游大巴</li>
                    <li>住宿：所选标准酒店</li>
                    <li>餐饮：行程所列餐食</li>
                    <li>门票：景点首道门票</li>
                    <li>导服：优秀亲子导游服务</li>
                    <li>保险：{selectedInsurance ? insurancePlan?.name : '客户自理'}</li>
                  </ul>
                </div>
                
                <div className="pt-3 border-t border-warm-200 mt-3">
                  <p className="font-medium text-warm-700 mb-2">退改政策：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>出发前30天及以上退团，扣10%费用</li>
                    <li>出发前15-29天退团，扣30%费用</li>
                    <li>出发前7-14天退团，扣50%费用</li>
                    <li>出发前3-6天退团，扣70%费用</li>
                    <li>出发前2天及以内退团，扣100%费用</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="label mb-0">合同状态：</label>
                <div className="flex gap-3">
                  {[
                    { value: 'unsigned', label: '未签署' },
                    { value: 'signed', label: '已签署' },
                    { value: 'waived', label: '豁免签署' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="contract"
                        value={option.value}
                        checked={contractStatus === option.value}
                        onChange={(e) => setContractStatus(e.target.value as 'unsigned' | 'signed' | 'waived')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-warm-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {contractStatus === 'signed' && (
                <div>
                  <label className="label">签署人姓名</label>
                  <input 
                    type="text" 
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                    placeholder="请输入签署人姓名"
                    className="input max-w-xs"
                  />
                </div>
              )}
            </div>
            
            {contractStatus !== 'signed' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <p className="text-amber-700 text-sm">
                  <AlertCircle size={16} className="inline mr-2" />
                  合同未签署，请尽快与客户确认签署，建议在收取尾款前完成合同签署。
                </p>
              </div>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-warm-800">费用明细</h2>
            
            <div className="bg-gradient-to-br from-primary-50 to-amber-50 rounded-xl p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-warm-600">
                  <span>团费（{memberCount}人 × {formatCurrency(basePrice)}）</span>
                  <span>{formatCurrency(baseTotal)}</span>
                </div>
                {selectedInsurance && (
                  <div className="flex justify-between text-warm-600">
                    <span>保险（{memberCount}人 × {formatCurrency(insurancePlan?.premiumPerPerson || 0)}）</span>
                    <span>{formatCurrency(insuranceTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-warm-600">
                  <span>房费（{roomCount}间 × {formatCurrency(roomTypeInfo?.price || 0)}）</span>
                  <span>{formatCurrency(roomTotal)}</span>
                </div>
                {hasExtraBed && (
                  <div className="flex justify-between text-warm-600">
                    <span>加床（{roomCount}床 × ¥80）</span>
                    <span>{formatCurrency(extraBedTotal)}</span>
                  </div>
                )}
                <div className="border-t border-primary-200 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold text-warm-800">
                    <span>总费用</span>
                    <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-primary-200">
                <div className="text-center">
                  <p className="text-sm text-warm-500">定金（30%）</p>
                  <p className="text-xl font-bold text-primary-600 mt-1">{formatCurrency(depositAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-warm-500">尾款</p>
                  <p className="text-xl font-bold text-warm-700 mt-1">{formatCurrency(finalPaymentAmount)}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-warm-800 mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                付款记录
              </h3>
              
              {existingReg?.payments && existingReg.payments.length > 0 ? (
                <div className="space-y-2">
                  {existingReg.payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-warm-50 rounded-lg">
                      <div>
                        <p className="font-medium text-warm-800">
                          {PAYMENT_TYPE_LABELS[payment.paymentType as PaymentType]}
                        </p>
                        <p className="text-xs text-warm-500">
                          {PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod]} · {payment.paymentDate}
                        </p>
                      </div>
                      <span className="text-success-600 font-semibold">+{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-warm-400 text-sm py-4 text-center">暂无付款记录</p>
              )}
              
              {isEdit && (
                <button className="btn-secondary w-full mt-4 text-sm">
                  添加付款记录
                </button>
              )}
            </div>
            
            {!isEdit && (
              <div className="bg-warm-50 rounded-xl p-4">
                <p className="text-sm text-warm-600">
                  💡 报名创建后，您可以在详情页中添加付款记录、申请退团或改期。
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button 
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} />
          上一步
        </button>
        
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost">
            取消
          </button>
          {currentStep === steps.length - 1 ? (
            <button onClick={handleSave} className="btn-primary">
              <Check size={18} />
              {isEdit ? '保存修改' : '创建报名'}
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary">
              下一步
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {showMemberModal && (
        <MemberModal
          member={editingMember}
          onClose={() => {
            setShowMemberModal(false);
            setEditingMember(null);
          }}
          onSave={handleSaveMember}
        />
      )}
    </div>
  );
}

function HealthInfoCard({ member, onUpdate }: { 
  member: any; 
  onUpdate: (health: any) => void 
}) {
  const health = member.health || {};
  
  return (
    <div className="bg-warm-50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
          member.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
        }`}>
          {member.name.charAt(0)}
        </div>
        <div>
          <h4 className="font-medium text-warm-800">{member.name}</h4>
          <p className="text-xs text-warm-500">{RELATION_LABELS[member.relation as RelationType]}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label text-xs">过敏史</label>
          <input 
            type="text" 
            value={health.allergies || ''}
            onChange={(e) => onUpdate({ ...health, allergies: e.target.value })}
            placeholder="如：海鲜、花粉等"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">特殊疾病</label>
          <input 
            type="text" 
            value={health.medicalConditions || ''}
            onChange={(e) => onUpdate({ ...health, medicalConditions: e.target.value })}
            placeholder="如：糖尿病、哮喘等"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">饮食禁忌</label>
          <input 
            type="text" 
            value={health.dietaryRestrictions || ''}
            onChange={(e) => onUpdate({ ...health, dietaryRestrictions: e.target.value })}
            placeholder="如：素食、清真等"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="label text-xs">特殊照护需求</label>
          <input 
            type="text" 
            value={health.specialCare || ''}
            onChange={(e) => onUpdate({ ...health, specialCare: e.target.value })}
            placeholder="需要特别注意的事项"
            className="input text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function MemberModal({ member, onClose, onSave }: {
  member: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(member?.name || '');
  const [relation, setRelation] = useState<RelationType>(member?.relation || 'child');
  const [gender, setGender] = useState<'male' | 'female'>(member?.gender || 'male');
  const [birthDate, setBirthDate] = useState(member?.birthDate || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [isPrimary, setIsPrimary] = useState(member?.isPrimary || false);
  const [idType, setIdType] = useState<IdType>(member?.idCard?.type || 'id_card');
  const [idNumber, setIdNumber] = useState(member?.idCard?.number || '');
  const [idExpiry, setIdExpiry] = useState(member?.idCard?.expiryDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('请输入姓名');
      return;
    }
    if (!birthDate) {
      alert('请选择出生日期');
      return;
    }
    
    onSave({
      name,
      relation,
      gender,
      birthDate,
      phone: phone || undefined,
      isPrimary,
      idCard: idNumber ? {
        type: idType,
        number: idNumber,
        expiryDate: idExpiry || undefined,
      } : undefined,
      health: member?.health,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6 border-b border-warm-100">
          <h3 className="text-lg font-semibold text-warm-800">
            {member ? '编辑成员' : '添加成员'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">姓名 *</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="label">与户主关系 *</label>
              <select 
                value={relation}
                onChange={(e) => setRelation(e.target.value as RelationType)}
                className="input"
              >
                {Object.entries(RELATION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">性别 *</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-warm-700">男</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-warm-700">女</span>
                </label>
              </div>
            </div>
            <div>
              <label className="label">出生日期 *</label>
              <input 
                type="date" 
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          
          <div>
            <label className="label">联系电话</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="选填，成员独立联系方式"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="primaryContact"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="primaryContact" className="text-warm-700 text-sm">
              设为主要联系人
            </label>
          </div>
          
          <div className="pt-4 border-t border-warm-100">
            <h4 className="font-medium text-warm-800 mb-3">证件信息</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-sm">证件类型</label>
                <select 
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IdType)}
                  className="input text-sm"
                >
                  {Object.entries(ID_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-sm">证件号码</label>
                <input 
                  type="text" 
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="input text-sm"
                  placeholder="请输入证件号码"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="label text-sm">证件有效期</label>
              <input 
                type="date" 
                value={idExpiry}
                onChange={(e) => setIdExpiry(e.target.value)}
                className="input text-sm max-w-xs"
              />
            </div>
          </div>
        </form>
        
        <div className="p-6 border-t border-warm-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
