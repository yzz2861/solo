import { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Download, 
  FileSpreadsheet, 
  DollarSign, 
  Hotel,
  Users,
  Filter
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { 
  RELATION_LABELS, 
  ID_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  STATUS_LABELS
} from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  calculateAge,
  maskIdNumber
} from '@/utils';

export default function ExportPage() {
  const { registrations, trips, currentTripId, setCurrentTrip, roomAssignments } = useStore();
  const [selectedTrip, setSelectedTrip] = useState(currentTripId || '');
  
  const currentTrip = trips.find(t => t.id === selectedTrip);
  
  const tripRegistrations = registrations.filter(
    r => r.tripId === selectedTrip && r.status !== 'cancelled' && r.status !== 'refunded'
  );

  const handleTripChange = (tripId: string) => {
    setSelectedTrip(tripId);
    setCurrentTrip(tripId);
  };

  const exportTripList = () => {
    if (!selectedTrip) {
      alert('请先选择团期');
      return;
    }

    const data: any[] = [];
    let index = 1;

    for (const reg of tripRegistrations) {
      for (const member of reg.members) {
        data.push({
          '序号': index++,
          '家庭': reg.familyName,
          '姓名': member.name,
          '关系': RELATION_LABELS[member.relation as keyof typeof RELATION_LABELS],
          '性别': member.gender === 'male' ? '男' : '女',
          '年龄': calculateAge(member.birthDate),
          '出生日期': member.birthDate,
          '证件类型': member.idCard ? ID_TYPE_LABELS[member.idCard.type as keyof typeof ID_TYPE_LABELS] : '-',
          '证件号码': member.idCard ? maskIdNumber(member.idCard.number, member.idCard.type) : '-',
          '联系电话': member.phone || reg.contactPhone,
          '保险': reg.insurance?.planName || '无',
          '房型': reg.roomBooking.roomType,
          '房号': reg.roomNo || '-',
          '车牌号': reg.busNo || '-',
          '过敏史': member.health?.allergies || '-',
          '特殊疾病': member.health?.medicalConditions || '-',
          '饮食禁忌': member.health?.dietaryRestrictions || '-',
          '特殊照护': member.health?.specialCare || '-',
          '备注': reg.specialNotes || '-',
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '出行名单');
    
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 6 }, { wch: 6 }, { wch: 12 }, { wch: 10 },
      { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }
    ];

    const fileName = `${currentTrip?.name || '出行名单'}_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportPayments = () => {
    const data: any[] = [];
    let index = 1;

    for (const reg of registrations) {
      for (const payment of reg.payments) {
        data.push({
          '序号': index++,
          '日期': payment.paymentDate,
          '报名编号': reg.id,
          '家庭名称': reg.familyName,
          '团期': reg.tripName,
          '类型': PAYMENT_TYPE_LABELS[payment.paymentType as keyof typeof PAYMENT_TYPE_LABELS],
          '金额': payment.amount,
          '付款方式': PAYMENT_METHOD_LABELS[payment.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS],
          '操作人': payment.operator,
          '票据号': payment.receiptNumber || '-',
          '备注': payment.notes || '-',
        });
      }
      
      if (reg.refund) {
        data.push({
          '序号': index++,
          '日期': reg.refund.refundDate,
          '报名编号': reg.id,
          '家庭名称': reg.familyName,
          '团期': reg.tripName,
          '类型': '退款',
          '金额': -reg.refund.refundAmount,
          '付款方式': reg.refund.refundMethod,
          '操作人': reg.refund.operator,
          '票据号': '-',
          '备注': reg.refund.deductionReason,
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '收款退款明细');
    
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 14 }, { wch: 20 }
    ];

    const fileName = `收款退款明细_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportRooming = () => {
    if (!selectedTrip) {
      alert('请先选择团期');
      return;
    }

    const tripRoomAssignments = roomAssignments.filter(a => a.tripId === selectedTrip);
    
    const data: any[] = [];
    let index = 1;

    for (const room of tripRoomAssignments) {
      const members = room.memberIds.map(mid => {
        for (const reg of tripRegistrations) {
          const member = reg.members.find(m => m.id === mid);
          if (member) {
            return { member, family: reg.familyName };
          }
        }
        return null;
      }).filter(Boolean);

      for (const item of members) {
        if (item) {
          data.push({
            '序号': index++,
            '房号': room.roomNo,
            '房型': room.roomType,
            '入住人': item.member.name,
            '性别': item.member.gender === 'male' ? '男' : '女',
            '家庭': item.family,
            '关系': RELATION_LABELS[item.member.relation as keyof typeof RELATION_LABELS],
            '特殊需求': room.notes || '-',
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '分房表');
    
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 20 }
    ];

    const fileName = `${currentTrip?.name || '分房表'}_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportStatistics = () => {
    if (!selectedTrip) {
      alert('请先选择团期');
      return;
    }

    const totalFamilies = tripRegistrations.length;
    const totalPeople = tripRegistrations.reduce((sum, r) => sum + r.members.length, 0);
    const totalRevenue = tripRegistrations.reduce((sum, r) => sum + r.totalAmount, 0);
    const paidAmount = tripRegistrations.reduce(
      (sum, r) => sum + r.payments.reduce((s, p) => s + p.amount, 0), 
      0
    );
    const unpaidAmount = totalRevenue - paidAmount;
    const signedContractCount = tripRegistrations.filter(r => r.contract.status === 'signed').length;
    const insuranceCount = tripRegistrations.filter(r => r.insurance).length;
    const specialCareCount = tripRegistrations.reduce(
      (sum, r) => sum + r.members.filter(m => m.health?.specialCare).length, 
      0
    );

    const data = [
      { '项目': '报名家庭数', '数值': totalFamilies, '单位': '个' },
      { '项目': '出行总人数', '数值': totalPeople, '单位': '人' },
      { '项目': '总营收', '数值': formatCurrency(totalRevenue), '单位': '' },
      { '项目': '已收款', '数值': formatCurrency(paidAmount), '单位': '' },
      { '项目': '待收款', '数值': formatCurrency(unpaidAmount), '单位': '' },
      { '项目': '已签合同', '数值': signedContractCount, '单位': '个' },
      { '项目': '购买保险', '数值': insuranceCount, '单位': '个家庭' },
      { '项目': '特殊照护', '数值': specialCareCount, '单位': '人' },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '统计数据');
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 10 }
    ];

    const fileName = `${currentTrip?.name || '报名统计'}_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportCards = [
    {
      id: 'trip-list',
      title: '出行名单',
      description: '导出完整的出行人员名单，包含证件信息、保险、房型、特殊照护等',
      icon: Users,
      color: 'primary',
      action: exportTripList,
      requiresTrip: true,
    },
    {
      id: 'payments',
      title: '收款退款明细',
      description: '导出所有收款和退款记录，包含金额、方式、操作人等',
      icon: DollarSign,
      color: 'success',
      action: exportPayments,
      requiresTrip: false,
    },
    {
      id: 'rooming',
      title: '分房明细表',
      description: '导出房间分配明细，包含房号、房型、入住人等',
      icon: Hotel,
      color: 'blue',
      action: exportRooming,
      requiresTrip: true,
    },
    {
      id: 'statistics',
      title: '报名统计表',
      description: '导出报名统计数据，包含人数、金额、合同等汇总',
      icon: FileSpreadsheet,
      color: 'purple',
      action: exportStatistics,
      requiresTrip: true,
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; icon: string; border: string; text: string }> = {
      primary: { 
        bg: 'bg-primary-50 hover:bg-primary-100', 
        icon: 'bg-primary-100 text-primary-600',
        border: 'border-primary-200',
        text: 'text-primary-600'
      },
      success: { 
        bg: 'bg-success-50 hover:bg-success-100', 
        icon: 'bg-success-100 text-success-600',
        border: 'border-success-200',
        text: 'text-success-600'
      },
      blue: { 
        bg: 'bg-blue-50 hover:bg-blue-100', 
        icon: 'bg-blue-100 text-blue-600',
        border: 'border-blue-200',
        text: 'text-blue-600'
      },
      purple: { 
        bg: 'bg-purple-50 hover:bg-purple-100', 
        icon: 'bg-purple-100 text-purple-600',
        border: 'border-purple-200',
        text: 'text-purple-600'
      },
    };
    return colorMap[color] || colorMap.primary;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-warm-800">数据导出</h1>
        <p className="text-warm-500 mt-1">导出各类报表和名单</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-warm-500" />
          <span className="text-warm-600">选择团期：</span>
          <select 
            value={selectedTrip}
            onChange={(e) => handleTripChange(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">请选择团期</option>
            {trips.map(trip => (
              <option key={trip.id} value={trip.id}>{trip.name}</option>
            ))}
          </select>
          {selectedTrip && (
            <span className="text-sm text-warm-500">
              {tripRegistrations.length} 个家庭，
              {tripRegistrations.reduce((sum, r) => sum + r.members.length, 0)} 人
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportCards.map(card => {
          const Icon = card.icon;
          const colors = getColorClasses(card.color);
          const disabled = card.requiresTrip && !selectedTrip;
          
          return (
            <div 
              key={card.id}
              className={`card p-6 transition-all duration-300 border-2 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-card cursor-pointer border-transparent hover:' + colors.border
              }`}
              onClick={() => !disabled && card.action()}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-warm-800">{card.title}</h3>
                  <p className="text-sm text-warm-500 mt-1">{card.description}</p>
                  {card.requiresTrip && !selectedTrip && (
                    <p className="text-xs text-amber-600 mt-2">请先选择团期</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Download size={20} className={colors.text} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-warm-800 mb-4">导出说明</h2>
        <div className="space-y-3 text-sm text-warm-600">
          <div className="flex items-start gap-2">
            <FileSpreadsheet size={16} className="text-warm-400 mt-0.5 flex-shrink-0" />
            <p>所有导出文件均为 Excel 格式（.xlsx），可直接用 Excel 或 WPS 打开</p>
          </div>
          <div className="flex items-start gap-2">
            <Users size={16} className="text-warm-400 mt-0.5 flex-shrink-0" />
            <p>出行名单包含所有出行人员的详细信息，供领队和随队老师使用</p>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign size={16} className="text-warm-400 mt-0.5 flex-shrink-0" />
            <p>收款退款明细包含所有历史记录，供财务人员对账使用</p>
          </div>
          <div className="flex items-start gap-2">
            <Hotel size={16} className="text-warm-400 mt-0.5 flex-shrink-0" />
            <p>分房表按房间整理，可打印后分发给领队</p>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">快捷操作</h3>
            <p className="text-white/70 text-sm mt-1">一键导出当前团期全部数据</p>
          </div>
          <button 
            onClick={() => {
              exportTripList();
              setTimeout(exportRooming, 500);
              setTimeout(exportStatistics, 1000);
            }}
            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors"
            disabled={!selectedTrip}
          >
            全部导出
          </button>
        </div>
      </div>
    </div>
  );
}
