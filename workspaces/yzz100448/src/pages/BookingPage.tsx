import { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AlertList } from '../components/AlertBanner';
import { VisitorGroup } from '../components/VisitorGroup';
import { VisitorForm } from '../components/VisitorForm';
import { PlateChangeModal } from '../components/PlateChangeModal';
import type { Visitor } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

export default function BookingPage() {
  const { visitors, alerts, clearDismissedAlerts, updateOverdueStatus, currentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | undefined>();
  const [changingPlateVisitor, setChangingPlateVisitor] = useState<Visitor | undefined>();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      updateOverdueStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [updateOverdueStatus]);

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => v.visitDate === selectedDate);
  }, [visitors, selectedDate]);

  const morningVisitors = useMemo(() => {
    return filteredVisitors.filter((v) => v.timeSlot === 'morning' && v.status !== 'arrived' && v.status !== 'overdue' && v.status !== 'checked_out');
  }, [filteredVisitors]);

  const afternoonVisitors = useMemo(() => {
    return filteredVisitors.filter((v) => v.timeSlot === 'afternoon' && v.status !== 'arrived' && v.status !== 'overdue' && v.status !== 'checked_out');
  }, [filteredVisitors]);

  const arrivedVisitors = useMemo(() => {
    return filteredVisitors.filter((v) => v.status === 'arrived');
  }, [filteredVisitors]);

  const overdueVisitors = useMemo(() => {
    return filteredVisitors.filter((v) => v.status === 'overdue');
  }, [filteredVisitors]);

  const handleEdit = (visitor: Visitor) => {
    setEditingVisitor(visitor);
    setShowForm(true);
  };

  const handleChangePlate = (visitor: Visitor) => {
    setChangingPlateVisitor(visitor);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVisitor(undefined);
  };

  const canEdit = currentUser?.role === 'reception';

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">预约管理</h1>
          <p className="text-gray-500 mt-1">管理访客预约，查看实时状态</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
            <Calendar size={18} className="text-primary-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none outline-none text-gray-700 font-medium bg-transparent"
            />
          </div>

          {alerts.filter((a) => !a.dismissed).length > 0 && (
            <button
              onClick={clearDismissedAlerts}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Trash2 size={16} />
              清除已读提醒
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-all shadow-lg shadow-accent-500/30 hover:shadow-accent-500/40"
            >
              <Plus size={20} />
              新增预约
            </button>
          )}
        </div>
      </div>

      <AlertList alerts={alerts} />

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-status-morning">{morningVisitors.length}</div>
          <div className="text-sm text-gray-500">上午待到场</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-status-afternoon">{afternoonVisitors.length}</div>
          <div className="text-sm text-gray-500">下午待到场</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-status-arrived">{arrivedVisitors.length}</div>
          <div className="text-sm text-gray-500">已到场</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-status-overdue">{overdueVisitors.length}</div>
          <div className="text-sm text-gray-500">超时</div>
        </div>
      </div>

      <div className="space-y-6">
        {overdueVisitors.length > 0 && (
          <VisitorGroup
            title="超时未离场"
            type="overdue"
            visitors={overdueVisitors}
            onEdit={canEdit ? handleEdit : undefined}
            onChangePlate={handleChangePlate}
          />
        )}

        {arrivedVisitors.length > 0 && (
          <VisitorGroup
            title="已到场"
            type="arrived"
            visitors={arrivedVisitors}
            onEdit={canEdit ? handleEdit : undefined}
            onChangePlate={handleChangePlate}
          />
        )}

        <VisitorGroup
          title="上午预约"
          type="morning"
          visitors={morningVisitors}
          onEdit={canEdit ? handleEdit : undefined}
          onChangePlate={handleChangePlate}
        />

        <VisitorGroup
          title="下午预约"
          type="afternoon"
          visitors={afternoonVisitors}
          onEdit={canEdit ? handleEdit : undefined}
          onChangePlate={handleChangePlate}
        />
      </div>

      {showForm && (
        <VisitorForm
          onClose={handleCloseForm}
          editingVisitor={editingVisitor}
        />
      )}

      {changingPlateVisitor && (
        <PlateChangeModal
          visitor={changingPlateVisitor}
          onClose={() => setChangingPlateVisitor(undefined)}
        />
      )}
    </div>
  );
}
