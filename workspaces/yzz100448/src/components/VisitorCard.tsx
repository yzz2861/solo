import { Car, User, Building2, Clock, MapPin, Printer, Edit2, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import type { Visitor } from '../types';
import { useStore } from '../store/useStore';
import { printGatePass } from '../utils/print';
import { getTimeSlotLabel, getStatusLabel, formatDateTime } from '../utils/dateUtils';

interface VisitorCardProps {
  visitor: Visitor;
  onEdit?: (visitor: Visitor) => void;
  onChangePlate?: (visitor: Visitor) => void;
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending/10 text-status-pending border-status-pending/30',
  arrived: 'bg-status-arrived/10 text-status-arrived border-status-arrived/30',
  checked_out: 'bg-status-checked_out/10 text-status-checked_out border-status-checked_out/30',
  overdue: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30 animate-pulse-soft',
};

export function VisitorCard({ visitor, onEdit, onChangePlate, showActions = true }: VisitorCardProps) {
  const { checkInVisitor, checkOutVisitor, deleteVisitor } = useStore();

  const handlePrint = () => {
    printGatePass(visitor);
  };

  const handleCheckIn = () => {
    if (confirm(`确认 ${visitor.plateNumber} 已到场？`)) {
      checkInVisitor(visitor.id);
    }
  };

  const handleCheckOut = () => {
    if (confirm(`确认 ${visitor.plateNumber} 已离场？`)) {
      checkOutVisitor(visitor.id);
    }
  };

  const handleDelete = () => {
    if (confirm(`确定要删除 ${visitor.company} 的预约吗？`)) {
      deleteVisitor(visitor.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            {visitor.company.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 size={16} className="text-primary-500" />
              {visitor.company}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <User size={14} />
              被访人：{visitor.contactPerson}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[visitor.status]}`}>
          {getStatusLabel(visitor.status)}
        </span>
      </div>

      <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center gap-2">
          <Car size={24} className="text-accent-600" />
          <span className="text-2xl font-bold text-accent-700 tracking-wider">
            {visitor.plateNumber}
          </span>
        </div>
        {visitor.isPlateChanged && (
          <div className="mt-2 text-center text-xs text-accent-600">
            <RefreshCw size={12} className="inline mr-1" />
            由 {visitor.originalPlateNumber} 变更（批准人：{visitor.plateChangeApprover}）
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={16} className="text-primary-500" />
          <span>车位：<strong className="text-primary-700">{visitor.parkingSpot}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={16} className="text-primary-500" />
          <span>时段：<strong className="text-primary-700">{getTimeSlotLabel(visitor.timeSlot)}</strong></span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-gray-600">
          <span className="text-gray-500">时间：</span>
          <span className="font-medium">{visitor.visitDate} {visitor.startTime} - {visitor.endTime}</span>
        </div>
      </div>

      {visitor.remarks && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
          <span className="text-gray-500">备注：</span>{visitor.remarks}
        </div>
      )}

      {visitor.checkInTime && (
        <div className="text-xs text-gray-500 mb-2">
          到场时间：{formatDateTime(new Date(visitor.checkInTime))}
        </div>
      )}
      {visitor.checkOutTime && (
        <div className="text-xs text-gray-500 mb-4">
          离场时间：{formatDateTime(new Date(visitor.checkOutTime))}
        </div>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Printer size={16} />
            放行单
          </button>

          {visitor.status === 'pending' && (
            <button
              onClick={handleCheckIn}
              className="flex items-center gap-1.5 px-3 py-2 bg-status-arrived text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={16} />
              确认到场
            </button>
          )}

          {visitor.status === 'arrived' && (
            <button
              onClick={handleCheckOut}
              className="flex items-center gap-1.5 px-3 py-2 bg-status-pending text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              <XCircle size={16} />
              确认离场
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(visitor)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Edit2 size={16} />
              编辑
            </button>
          )}

          {onChangePlate && (
            <button
              onClick={() => onChangePlate(visitor)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent-500 text-white text-sm rounded-lg hover:bg-accent-600 transition-colors"
            >
              <RefreshCw size={16} />
              换车
            </button>
          )}

          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors ml-auto"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      )}
    </div>
  );
}
