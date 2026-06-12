import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-bg-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto scrollbar-thin p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
