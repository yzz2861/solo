import { useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  ChevronDown,
  MailPlus,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useCommitmentStore } from "@/stores/commitmentStore";

export default function Topbar() {
  const navigate = useNavigate();
  const { currentUser } = useUIStore();
  const pendingCount = useCommitmentStore((s) => s.getPendingCount());

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-steel-100 flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="relative flex-1 max-w-xl">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400"
        />
        <input
          type="text"
          placeholder="搜索承诺、订单号、供应商..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-steel-50/60 border border-transparent text-sm text-steel-700 placeholder:text-steel-400 focus:bg-white focus:border-steel-200 focus:ring-2 focus:ring-steel-700/10 transition-all outline-none"
        />
      </div>

      <button
        onClick={() => navigate("/email/import")}
        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-steel-700 text-white text-sm font-medium shadow-md shadow-steel-700/20 hover:bg-steel-600 active:bg-steel-800 transition-colors"
      >
        <MailPlus size={16} />
        导入邮件
      </button>

      <div className="h-8 w-px bg-steel-100" />

      <button className="relative p-2 rounded-xl hover:bg-steel-50 text-steel-600 hover:text-steel-800 transition-colors">
        <Bell size={18} />
        {pendingCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-confidence-low ring-2 ring-white" />
        )}
      </button>

      <div className="flex items-center gap-3 pl-2 border-l border-steel-100">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-md"
          style={{ backgroundColor: currentUser.avatarBg }}
        >
          {currentUser.name.slice(0, 1)}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-steel-800 leading-tight">
            {currentUser.name}
          </p>
          <p className="text-xs text-steel-500 leading-tight mt-0.5">
            {currentUser.role}
          </p>
        </div>
        <ChevronDown size={14} className="text-steel-400" />
      </div>
    </header>
  );
}
