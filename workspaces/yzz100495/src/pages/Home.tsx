import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { MonthView } from '@/components/calendar/MonthView';
import { DayView } from '@/components/calendar/DayView';
import { BatchView } from '@/components/calendar/BatchView';
import { Modal } from '@/components/common/Modal';
import { ToastContainer } from '@/components/common/Toast';
import { OrderForm } from '@/components/order/OrderForm';
import { useToast } from '@/hooks/useToast';

const Home = () => {
  const { currentView, showOrderModal, setShowOrderModal, editingOrder } = useAppStore();
  const { toasts, hideToast } = useToast();

  const renderView = () => {
    switch (currentView) {
      case 'calendar':
        return <MonthView />;
      case 'day':
        return <DayView />;
      case 'batch':
        return <BatchView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.2) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")
          `,
        }}
      />

      <div className="relative z-10">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="transition-all duration-300">
            {renderView()}
          </div>
        </main>

        <footer className="py-6 text-center text-sm text-gray-500">
          <p>🥖 面包预订日历 · 让每一份新鲜都准时送达</p>
        </footer>
      </div>

      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={editingOrder ? '编辑订单' : '新建订单'}
        size="lg"
      >
        <OrderForm />
      </Modal>

      <ToastContainer toasts={toasts} onClose={hideToast} />

      <style>{`
        @font-face {
          font-family: 'Noto Serif SC';
          src: local('Noto Serif SC'), local('NotoSerifSC-Regular');
          font-display: swap;
        }
        
        .font-serif {
          font-family: 'Noto Serif SC', Georgia, serif;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #fef3c7;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #d97706;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #b45309;
        }
      `}</style>
    </div>
  );
};

export default Home;
