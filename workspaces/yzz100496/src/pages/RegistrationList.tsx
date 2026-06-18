import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronRight,
  Phone,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { STATUS_LABELS, type RegistrationStatus } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

export default function RegistrationList() {
  const { registrations, trips } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tripFilter, setTripFilter] = useState<string>('all');

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = reg.familyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.contactPhone.includes(searchQuery) ||
      reg.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesTrip = tripFilter === 'all' || reg.tripId === tripFilter;
    
    return matchesSearch && matchesStatus && matchesTrip;
  });

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待确认' },
    { value: 'confirmed', label: '已确认' },
    { value: 'deposit_paid', label: '已付定金' },
    { value: 'fully_paid', label: '已付清' },
    { value: 'departed', label: '已出行' },
    { value: 'cancelled', label: '已取消' },
    { value: 'refunded', label: '已退款' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">报名列表</h1>
          <p className="text-warm-500 mt-1">共 {filteredRegistrations.length} 条报名记录</p>
        </div>
        <Link to="/registration/new" className="btn-primary">
          新建报名
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input 
              type="text"
              placeholder="搜索家庭名称、联系人、手机号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-warm-500" />
              <select 
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
                className="input min-w-[150px]"
              >
                <option value="all">全部团期</option>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>{trip.name}</option>
                ))}
              </select>
            </div>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input min-w-[130px]"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRegistrations.length === 0 ? (
          <div className="card p-12 text-center">
            <Users size={48} className="mx-auto text-warm-300 mb-3" />
            <p className="text-warm-500">暂无匹配的报名记录</p>
          </div>
        ) : (
          filteredRegistrations.map(reg => (
            <RegistrationCard key={reg.id} registration={reg} />
          ))
        )}
      </div>
    </div>
  );
}

function RegistrationCard({ registration }: { registration: any }) {
  const paidAmount = registration.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const unpaidAmount = registration.totalAmount - paidAmount;
  
  return (
    <Link 
      to={`/registration/${registration.id}`}
      className="card-hover p-5 block"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {registration.familyName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-warm-800 text-lg truncate">
                {registration.familyName}
              </h3>
              <span className={`badge ${getStatusBadge(registration.status)} flex-shrink-0`}>
                {STATUS_LABELS[registration.status as RegistrationStatus]}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-warm-500">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {registration.members.length}人
              </span>
              <span className="flex items-center gap-1">
                <Phone size={14} />
                {registration.contactPhone}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center hidden sm:block">
            <p className="text-xs text-warm-500 flex items-center gap-1">
              <Calendar size={12} />
              团期
            </p>
            <p className="text-sm font-medium text-warm-700 mt-0.5 max-w-[140px] truncate">
              {registration.tripName}
            </p>
            <p className="text-xs text-warm-500">
              {formatDate(registration.departureDate)}出发
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-warm-500 flex items-center gap-1 justify-center">
              <DollarSign size={12} />
              费用
            </p>
            <p className="text-lg font-bold text-primary-600 mt-0.5">
              {formatCurrency(registration.totalAmount)}
            </p>
            <p className={`text-xs ${unpaidAmount > 0 ? 'text-amber-600' : 'text-success-600'}`}>
              {unpaidAmount > 0 ? `未付 ${formatCurrency(unpaidAmount)}` : '已付清'}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <ChevronRight size={20} className="text-warm-400" />
          </div>
        </div>
      </div>
      
      {registration.specialNotes && (
        <div className="mt-4 pt-4 border-t border-warm-100">
          <p className="text-sm text-warm-600">
            <span className="text-warm-500">备注：</span>
            {registration.specialNotes}
          </p>
        </div>
      )}
    </Link>
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
