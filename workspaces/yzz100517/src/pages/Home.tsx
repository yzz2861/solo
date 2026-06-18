import TopBar from "@/components/layout/TopBar";
import StatsSidebar from "@/components/layout/StatsSidebar";
import ExportPanel from "@/components/layout/ExportPanel";
import BatchActionBar from "@/components/bookings/BatchActionBar";
import BookingTable from "@/components/bookings/BookingTable";
import BookingDrawer from "@/components/modals/BookingDrawer";
import StopConfirmModal from "@/components/modals/StopConfirmModal";
import ToastContainer from "@/components/alerts/ToastContainer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-court-50/30">
      <TopBar />

      <div className="flex">
        <aside className="w-[280px] shrink-0 p-4 border-r border-gray-100/80 min-h-[calc(100vh-64px)] sticky top-16 self-start hidden lg:block">
          <StatsSidebar />
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-6 space-y-4">
          <BatchActionBar />
          <BookingTable />
        </main>

        <aside className="w-[320px] shrink-0 p-4 border-l border-gray-100/80 min-h-[calc(100vh-64px)] sticky top-16 self-start hidden xl:block">
          <ExportPanel />
        </aside>
      </div>

      <BookingDrawer />
      <StopConfirmModal />
      <ToastContainer />
    </div>
  );
}
