import { useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { OrderForm } from '@/components/order/OrderForm';
import { OrderKanban } from '@/components/order/OrderKanban';
import { FloristPrepList } from '@/components/florist/FloristPrepList';
import { AlertCenter } from '@/components/alerts/AlertCenter';
import { InventoryModal } from '@/components/inventory/InventoryModal';
import { useAppStore } from '@/store/useAppStore';

export const Workbench = () => {
  const { refreshAlerts, currentRole } = useAppStore();

  // 定时刷新预警（每分钟）
  useEffect(() => {
    refreshAlerts();
    const t = setInterval(refreshAlerts, 60 * 1000);
    return () => clearInterval(t);
  }, [refreshAlerts]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <AlertCenter />
      <InventoryModal />

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-5 py-5">
        {currentRole === 'florist' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-[calc(100vh-6rem)]">
            <div className="h-full min-h-0">
              <OrderKanban />
            </div>
            <div className="h-full min-h-0">
              <FloristPrepList />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5 h-[calc(100vh-6rem)]">
            <div className="col-span-12 xl:col-span-3 h-full min-h-0">
              <OrderForm />
            </div>
            <div className="col-span-12 xl:col-span-6 h-full min-h-0">
              <OrderKanban />
            </div>
            <div className="col-span-12 xl:col-span-3 h-full min-h-0">
              <FloristPrepList />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
