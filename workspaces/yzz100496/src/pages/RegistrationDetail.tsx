import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Edit, 
  Trash2, 
  Calendar,
  CreditCard,
  FileText,
  Shield,
  Home,
  RotateCcw,
  XCircle,
  Plus,
  Clock,
  AlertTriangle,
  Check,
  User,
  Phone,
  FileX,
  FilePlus
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  STATUS_LABELS, 
  CONTRACT_STATUS_LABELS,
  RELATION_LABELS,
  ID_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  type PaymentMethod,
  type PaymentType
} from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  calculateRefund,
  calculateTotalAmount,
  maskIdNumber,
  calculateAge
} from '@/utils';

type TabType = 'info' | 'payments' | 'operations';

export default function RegistrationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getRegistration, 
    addPayment, 
    cancelRegistration,
    deleteRegistration,
    updateRegistration,
    trips
  } = useStore();
  
  const registration = getRegistration(id || '');
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);

  if (!registration) {
    return (
      <div className="text-center py-12">
        <p className="text-warm-500">报名记录不存在</p>
        <Link to="/registrations" className="btn-primary mt-4">
          返回列表
        </Link>
      </div>
    );
  }

  const paidAmount = registration.payments.reduce((sum, p) => sum + p.amount, 0);
  const unpaidAmount = registration.totalAmount - paidAmount;
  const trip = trips.find(t => t.id === registration.tripId);

  const handleDelete = () => {
    if (confirm('确定要删除这条报名记录吗？此操作不可恢复。')) {
      deleteRegistration(registration.id);
      navigate('/registrations');
    }
  };

  const handleCancel = (reason: string) => {
    const refundInfo = calculateRefund(
      registration.totalAmount,
      registration.departureDate
    );
    
    cancelRegistration(registration.id, {
      refundDate: new Date().toISOString().split('T')[0],
      refundAmount: refundInfo.refundAmount,
      deductionAmount: refundInfo.deductionAmount,
      deductionReason: refundInfo.reason,
      refundMethod: 'wechat',
      operator: '管理员',
    });
    
    setShowCancelModal(false);
    alert('退团操作已完成');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-warm-800">{registration.familyName}</h1>
              <span className={`badge ${getStatusBadge(registration.status)}`}>
                {STATUS_LABELS[registration.status]}
              </span>
            </div>
            <p className="text-warm-500 mt-1">
              {registration.tripName} · {formatDate(registration.departureDate)}出发
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(`/registration/${registration.id}/edit`)}
            className="btn-secondary"
          >
            <Edit size={16} />
            编辑
          </button>
          <button 
            onClick={() => setShowCancelModal(true)}
            className="btn-danger"
            disabled={registration.status === 'cancelled' || registration.status === 'refunded'}
          >
            <XCircle size={16} />
            退团
          </button>
          <button 
            onClick={handleDelete}
            className="btn-ghost text-danger-500 hover:bg-danger-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-1 bg-warm-100 p-1 rounded-xl w-fit">
            {[
              { id: 'info', label: '详细信息', icon: FileText },
              { id: 'payments', label: '付款记录', icon: CreditCard },
              { id: 'operations', label: '操作日志', icon: Clock },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-warm-600 hover:text-warm-800'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-warm-800 mb-4 flex items-center gap-2">
                  <Users size={20} className="text-primary-500" />
                  家庭成员
                </h2>
                <div className="space-y-4">
                  {registration.members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-start gap-4 p-4 bg-warm-50 rounded-xl"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                        member.relation === 'child' ? 'bg-primary-400' :
                        member.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-warm-800">{member.name}</h3>
                          <span className="badge-primary">{RELATION_LABELS[member.relation as keyof typeof RELATION_LABELS]}</span>
                          {member.isPrimary && <span className="badge-success">主联系人</span>}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-warm-500">年龄：</span>
                            <span className="text-warm-700">{calculateAge(member.birthDate)}岁</span>
                          </div>
                          <div>
                            <span className="text-warm-500">性别：</span>
                            <span className="text-warm-700">{member.gender === 'male' ? '男' : '女'}</span>
                          </div>
                          {member.phone && (
                            <div>
                              <span className="text-warm-500">电话：</span>
                              <span className="text-warm-700">{member.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {member.idCard && (
                          <div className="mt-3 pt-3 border-t border-warm-200">
                            <div className="flex items-center gap-1 text-sm text-warm-600">
                              <FileText size={14} />
                              {ID_TYPE_LABELS[member.idCard.type as keyof typeof ID_TYPE_LABELS]}：
                              {maskIdNumber(member.idCard.number, member.idCard.type)}
                              {member.idCard.expiryDate && (
                                <span className="text-warm-400 ml-2">
                                  有效期至 {formatDate(member.idCard.expiryDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {member.health && (member.health.allergies || member.health.specialCare || member.health.medicalConditions || member.health.dietaryRestrictions) && (
                          <div className="mt-3 pt-3 border-t border-warm-200 space-y-1">
                            {member.health.allergies && (
                              <p className="text-sm text-danger-600">
                                <span className="font-medium">过敏：</span>{member.health.allergies}
                              </p>
                            )}
                            {member.health.medicalConditions && (
                              <p className="text-sm text-amber-600">
                                <span className="font-medium">疾病：</span>{member.health.medicalConditions}
                              </p>
                            )}
                            {member.health.dietaryRestrictions && (
                              <p className="text-sm text-warm-600">
                                <span className="font-medium">饮食：</span>{member.health.dietaryRestrictions}
                              </p>
                            )}
                            {member.health.specialCare && (
                              <p className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded mt-1">
                                <span className="font-medium">特殊照护：</span>{member.health.specialCare}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-warm-800 mb-3 flex items-center gap-2">
                    <Shield size={18} className="text-primary-500" />
                    保险信息
                  </h3>
                  {registration.insurance ? (
                    <div className="space-y-2">
                      <p className="text-warm-700 font-medium">{registration.insurance.planName}</p>
                      <p className="text-sm text-warm-500">{registration.insurance.insurer}</p>
                      <p className="text-primary-600 font-semibold">
                        {formatCurrency(registration.insurance.totalPremium)}
                        <span className="text-warm-400 text-sm font-normal ml-1">
                          ({registration.members.length}人 × {formatCurrency(registration.insurance.premiumPerPerson)})
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-warm-400 text-sm">未购买保险</p>
                  )}
                </div>
                
                <div className="card p-5">
                  <h3 className="font-semibold text-warm-800 mb-3 flex items-center gap-2">
                    <Home size={18} className="text-primary-500" />
                    房间信息
                  </h3>
                  <div className="space-y-2">
                    <p className="text-warm-700">{registration.roomBooking.roomType} × {registration.roomBooking.roomCount}间</p>
                    {registration.roomBooking.hasExtraBed && (
                      <p className="text-sm text-warm-500">含加床</p>
                    )}
                    {registration.roomBooking.sharingRequest && (
                      <p className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {registration.roomBooking.sharingRequest}
                      </p>
                    )}
                    {registration.roomNo && (
                      <p className="text-sm text-warm-500">
                        分配房号：<span className="font-medium text-warm-700">{registration.roomNo}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-warm-800 mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-primary-500" />
                  合同信息
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`badge ${registration.contract.status === 'signed' ? 'badge-success' : 'badge-warning'}`}>
                      {CONTRACT_STATUS_LABELS[registration.contract.status as keyof typeof CONTRACT_STATUS_LABELS]}
                    </span>
                    {registration.contract.signedDate && (
                      <p className="text-sm text-warm-500 mt-2">
                        签署人：{registration.contract.signedBy} · {formatDate(registration.contract.signedDate)}
                      </p>
                    )}
                    {registration.contract.contractNo && (
                      <p className="text-sm text-warm-500">
                        合同编号：{registration.contract.contractNo}
                      </p>
                    )}
                  </div>
                  {registration.contract.status !== 'signed' && registration.status !== 'cancelled' && (
                    <button className="btn-primary text-sm">
                      签署合同
                    </button>
                  )}
                </div>
              </div>

              {registration.specialNotes && (
                <div className="card p-5">
                  <h3 className="font-semibold text-warm-800 mb-2">特殊备注</h3>
                  <p className="text-warm-600">{registration.specialNotes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-warm-800">付款记录</h2>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="btn-primary text-sm"
                    disabled={registration.status === 'cancelled' || registration.status === 'refunded'}
                  >
                    <Plus size={16} />
                    添加付款
                  </button>
                </div>
                
                {registration.payments.length === 0 ? (
                  <div className="text-center py-8 text-warm-400">
                    <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
                    <p>暂无付款记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registration.payments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-warm-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center">
                            <Check size={20} className="text-success-600" />
                          </div>
                          <div>
                            <p className="font-medium text-warm-800">
                              {PAYMENT_TYPE_LABELS[payment.paymentType as PaymentType]}
                            </p>
                            <p className="text-sm text-warm-500">
                              {PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod]}
                              {' · '}
                              {payment.operator}
                            </p>
                            {payment.receiptNumber && (
                              <p className="text-xs text-warm-400">票据号：{payment.receiptNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-success-600">+{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-warm-500">{formatDate(payment.paymentDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {registration.refund && (
                  <div className="mt-6 pt-6 border-t border-warm-200">
                    <h3 className="font-medium text-warm-800 mb-3 flex items-center gap-2">
                      <RotateCcw size={16} className="text-danger-500" />
                      退款记录
                    </h3>
                    <div className="p-4 bg-danger-50 rounded-xl border border-danger-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-danger-700">退团退款</p>
                          <p className="text-sm text-danger-600">{registration.refund.deductionReason}</p>
                          <p className="text-xs text-danger-500 mt-1">
                            扣费：{formatCurrency(registration.refund.deductionAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-danger-600">-{formatCurrency(registration.refund.refundAmount)}</p>
                          <p className="text-xs text-danger-500">{formatDate(registration.refund.refundDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="card p-6 animate-fade-in">
              <h2 className="text-lg font-semibold text-warm-800 mb-4">操作日志</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                    <div className="w-0.5 flex-1 bg-warm-200 mt-1"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-warm-800">创建报名</p>
                    <p className="text-sm text-warm-500">{formatDateTime(registration.createdAt)}</p>
                  </div>
                </div>
                
                {registration.payments.map(payment => (
                  <div key={payment.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-success-500"></div>
                      <div className="w-0.5 flex-1 bg-warm-200 mt-1"></div>
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-warm-800">
                        收取{PAYMENT_TYPE_LABELS[payment.paymentType as PaymentType]} {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-warm-500">
                        {payment.operator} · {formatDateTime(payment.paymentDate)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {registration.refund && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-danger-500"></div>
                    </div>
                    <div>
                      <p className="font-medium text-warm-800">
                        退团退款 {formatCurrency(registration.refund.refundAmount)}
                      </p>
                      <p className="text-sm text-warm-500">
                        {registration.refund.operator} · {formatDateTime(registration.refund.refundDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <h3 className="font-medium text-white/80 text-sm">总费用</h3>
            <p className="text-3xl font-bold mt-1">{formatCurrency(registration.totalAmount)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">已收款</span>
                <span className="font-medium">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">待收款</span>
                <span className="font-medium">{formatCurrency(Math.max(0, unpaidAmount))}</span>
              </div>
            </div>
          </div>
          
          <div className="card p-5">
            <h3 className="font-semibold text-warm-800 mb-3">费用构成</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-warm-500">团费</span>
                <span className="text-warm-700">{formatCurrency(registration.basePrice * registration.members.length)}</span>
              </div>
              {registration.insurance && (
                <div className="flex justify-between">
                  <span className="text-warm-500">保险</span>
                  <span className="text-warm-700">{formatCurrency(registration.insurance.totalPremium)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-warm-500">房费</span>
                <span className="text-warm-700">{formatCurrency(registration.roomBooking.roomPrice * registration.roomBooking.roomCount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-warm-200">
                <span className="text-warm-700 font-medium">合计</span>
                <span className="text-primary-600 font-semibold">{formatCurrency(registration.totalAmount)}</span>
              </div>
            </div>
          </div>
          
          <div className="card p-5">
            <h3 className="font-semibold text-warm-800 mb-3">定金与尾款</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-warm-600">定金（30%）</span>
                <span className="font-medium text-warm-800">{formatCurrency(registration.depositAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-warm-600">尾款</span>
                <span className="font-medium text-warm-800">{formatCurrency(registration.finalPaymentAmount)}</span>
              </div>
              <div className="text-xs text-warm-500 flex items-center gap-1">
                <Calendar size={12} />
                尾款截止：{formatDate(registration.finalPaymentDueDate)}
              </div>
            </div>
          </div>
          
          {registration.status !== 'cancelled' && registration.status !== 'refunded' && (
            <div className="space-y-3">
              <button 
                onClick={() => setShowRescheduleModal(true)}
                className="btn-secondary w-full"
              >
                <RotateCcw size={16} />
                申请改期
              </button>
              <button 
                onClick={() => setShowSupplementModal(true)}
                className="btn-secondary w-full"
              >
                <FilePlus size={16} />
                补材料
              </button>
              <button 
                onClick={() => setShowCancelModal(true)}
                className="btn-danger w-full"
              >
                <XCircle size={16} />
                申请退团
              </button>
            </div>
          )}
          
          {trip && (
            <div className="card p-5">
              <h3 className="font-semibold text-warm-800 mb-3">团期信息</h3>
              <div className="space-y-2 text-sm">
                <p className="text-warm-700">{trip.name}</p>
                <p className="text-warm-500 flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
                <p className="text-warm-500">{trip.destination}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal 
          registrationId={registration.id}
          totalAmount={registration.totalAmount}
          paidAmount={paidAmount}
          onClose={() => setShowPaymentModal(false)}
          onSave={(payment) => {
            addPayment(registration.id, payment);
            setShowPaymentModal(false);
          }}
        />
      )}

      {showCancelModal && (
        <CancelModal 
          registration={registration}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
        />
      )}

      {showRescheduleModal && (
        <RescheduleModal 
          registration={registration}
          trips={trips}
          onClose={() => setShowRescheduleModal(false)}
          onSave={(newTripId) => {
            const newTrip = trips.find(t => t.id === newTripId);
            if (newTrip) {
              const updates: any = {
                tripId: newTrip.id,
                tripName: newTrip.name,
                departureDate: newTrip.startDate,
                returnDate: newTrip.endDate,
                finalPaymentDueDate: new Date(new Date(newTrip.startDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              };
              try {
                const newTotal = calculateTotalAmount(registration.members.length, newTrip.basePrice, registration.insurance?.totalPremium || 0, registration.roomBooking.roomPrice * registration.roomBooking.roomCount);
                updates.totalAmount = newTotal;
                updates.depositAmount = Math.round(newTotal * 0.3);
                updates.finalPaymentAmount = newTotal - Math.round(newTotal * 0.3);
              } catch(e) {}
              updateRegistration(registration.id, updates);
              alert('改期成功！费用信息请根据实际情况调整。');
              setShowRescheduleModal(false);
            }
          }}
        />
      )}

      {showSupplementModal && (
        <SupplementModal 
          registration={registration}
          onClose={() => setShowSupplementModal(false)}
          onSave={(supplementData) => {
            updateRegistration(registration.id, supplementData);
            alert('材料补充成功！');
            setShowSupplementModal(false);
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({ registrationId, totalAmount, paidAmount, onClose, onSave }: {
  registrationId: string;
  totalAmount: number;
  paidAmount: number;
  onClose: () => void;
  onSave: (payment: any) => void;
}) {
  const [paymentType, setPaymentType] = useState<PaymentType>('final');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [operator, setOperator] = useState('管理员');
  const [notes, setNotes] = useState('');

  const remaining = totalAmount - paidAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效的金额');
      return;
    }
    
    onSave({
      paymentType,
      amount: amountNum,
      paymentMethod,
      paymentDate,
      receiptNumber: receiptNumber || undefined,
      operator,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-warm-100">
          <h3 className="text-lg font-semibold text-warm-800">添加付款记录</h3>
          <p className="text-sm text-warm-500 mt-1">
            待收款：<span className="text-primary-600 font-medium">{formatCurrency(remaining)}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">款项类型</label>
            <select 
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              className="input"
            >
              {Object.entries(PAYMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label">金额 (元) *</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(remaining)}
              className="input text-lg font-semibold"
            />
            <button 
              type="button"
              onClick={() => setAmount(String(remaining))}
              className="text-sm text-primary-600 hover:text-primary-700 mt-1"
            >
              填入剩余金额
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">付款方式</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">付款日期</label>
              <input 
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">票据号</label>
              <input 
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="选填"
                className="input"
              />
            </div>
            <div>
              <label className="label">操作人</label>
              <input 
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="input"
              />
            </div>
          </div>
          
          <div>
            <label className="label">备注</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="选填"
            />
          </div>
        </form>
        
        <div className="p-6 border-t border-warm-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            确认收款
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ registration, onClose, onConfirm }: {
  registration: any;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const refundInfo = calculateRefund(
    registration.totalAmount,
    registration.departureDate
  );
  
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-warm-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-danger-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-warm-800">确认退团</h3>
              <p className="text-sm text-warm-500">{registration.familyName}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-medium mb-2">退团扣费规则</p>
            <p className="text-sm text-amber-700">
              距离出发还有 <span className="font-bold">{refundInfo.daysBeforeDeparture}</span> 天，
              按规定扣除 <span className="font-bold">{refundInfo.feePercentage}%</span> 费用
            </p>
          </div>
          
          <div className="bg-warm-50 rounded-xl p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-warm-500">总费用</span>
                <span className="text-warm-700">{formatCurrency(registration.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-warm-500">扣除费用</span>
                <span className="text-danger-600">-{formatCurrency(refundInfo.deductionAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-warm-200">
                <span className="font-medium text-warm-700">应退金额</span>
                <span className="text-lg font-bold text-success-600">{formatCurrency(refundInfo.refundAmount)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="label">退团原因</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="请输入退团原因"
              className="input resize-none"
            />
          </div>
          
          <p className="text-xs text-warm-500">
            ⚠️ 退团操作将自动计算退款金额，确认后无法撤销。
          </p>
        </div>
        
        <div className="p-6 border-t border-warm-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleConfirm} className="btn-danger">
            确认退团
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ registration, trips, onClose, onSave }: {
  registration: any;
  trips: any[];
  onClose: () => void;
  onSave?: (newTripId: string) => void;
}) {
  const [newTripId, setNewTripId] = useState('');
  
  const availableTrips = trips.filter(t => t.id !== registration.tripId && t.status === 'upcoming');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-warm-100">
          <h3 className="text-lg font-semibold text-warm-800">申请改期</h3>
          <p className="text-sm text-warm-500 mt-1">当前团期：{registration.tripName}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="label">选择新团期</label>
            <select 
              value={newTripId}
              onChange={(e) => setNewTripId(e.target.value)}
              className="input"
            >
              <option value="">请选择新团期</option>
              {availableTrips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} - {formatDate(trip.startDate)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <p className="text-primary-700 text-sm">
              改期可能产生费用差额，具体费用请与客户确认后在付款记录中调整。
            </p>
          </div>
        </div>
        
        <div className="p-6 border-t border-warm-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button 
            onClick={() => {
              if (onSave) onSave(newTripId);
            }} 
            className="btn-primary"
            disabled={!newTripId}
          >
            确认改期
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplementModal({ registration, onClose, onSave }: {
  registration: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [supplementType, setSupplementType] = useState<'id_card' | 'contract' | 'insurance' | 'other'>('id_card');
  const [notes, setNotes] = useState('');
  const [signedBy, setSignedBy] = useState('');

  const handleSubmit = () => {
    const updates: any = {};

    if (supplementType === 'contract') {
      updates.contract = {
        ...registration.contract,
        status: 'signed',
        signedDate: new Date().toISOString().split('T')[0],
        signedBy: signedBy || registration.familyName,
        contractNo: registration.contract?.contractNo || `HT${Date.now()}`,
      };
    } else if (supplementType === 'insurance') {
      // 保险信息需要在编辑页面补充
      alert('请进入编辑页面补充保险信息');
      return;
    } else if (supplementType === 'id_card') {
      // 证件信息需要在编辑页面补录
      alert('请进入编辑页面补充证件信息');
      return;
    }

    if (notes.trim()) {
      updates.specialNotes = registration.specialNotes 
        ? `${registration.specialNotes}\n[${formatDate(new Date())}] ${notes}`
        : `[${formatDate(new Date())}] ${notes}`;
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg animate-slide-up">
        <div className="p-6 border-b border-warm-100">
          <h3 className="text-lg font-semibold text-warm-800">补充材料</h3>
          <p className="text-sm text-warm-500 mt-1">{registration.familyName}</p>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="label">补充类型</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'id_card', label: '补录证件', desc: '进入编辑页面' },
                { value: 'contract', label: '补签合同', desc: '设置为已签署' },
                { value: 'insurance', label: '补充保险', desc: '进入编辑页面' },
                { value: 'other', label: '补充备注', desc: '添加备注' },
              ].map(opt => (
                <label 
                  key={opt.value}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    supplementType === opt.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio"
                      name="supplementType"
                      checked={supplementType === opt.value}
                      onChange={() => setSupplementType(opt.value as any)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <div>
                      <p className="font-medium text-warm-800 text-sm">{opt.label}</p>
                      <p className="text-xs text-warm-500">{opt.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {supplementType === 'contract' && (
            <div>
              <label className="label">签署人姓名</label>
              <input 
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="请输入签署人姓名"
                className="input"
              />
            </div>
          )}
          
          <div>
            <label className="label">补充说明（可选）</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="请输入补充说明内容..."
              className="input resize-none"
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-warm-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            保存补充
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-primary',
    deposit_paid: 'badge-primary',
    fully_paid: 'badge-success',
    departed: 'badge-gray',
    cancelled: 'badge-danger',
    refunded: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

// 注意：这里需要导入 Users 组件，因为上面用到了但没有导入
import { Users } from 'lucide-react';
