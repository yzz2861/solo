import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-wood-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-parchment-texture bg-ivory">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
