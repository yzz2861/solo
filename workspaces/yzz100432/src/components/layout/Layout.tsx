import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const { user, role } = useAppStore();
  const [showNightMode, setShowNightMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        showNightMode={showNightMode} 
        onToggleNightMode={() => setShowNightMode(!showNightMode)} 
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar user={user} role={role} />
        <main className="flex-1 overflow-hidden">
          <Outlet context={{ showNightMode }} />
        </main>
      </div>
    </div>
  );
}
