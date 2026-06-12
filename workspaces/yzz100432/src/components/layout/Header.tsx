import { TreePine, Bell, User, LogOut, Moon, Sun } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  showNightMode: boolean;
  onToggleNightMode: () => void;
}

export function Header({ showNightMode, onToggleNightMode }: HeaderProps) {
  const { user, role, logout } = useAppStore();
  const navigate = useNavigate();

  const roleLabels: Record<string, string> = {
    admin: "物业管理员",
    gardener: "园林施工队",
    supervisor: "主管",
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-forest-500 to-forest-700 rounded-lg flex items-center justify-center">
          <TreePine className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-forest-700">园区树木修剪预览</h1>
          <p className="text-xs text-gray-500">智慧园林管理系统</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onToggleNightMode}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={showNightMode ? "切换到日间模式" : "切换到夜间模式"}
        >
          {showNightMode ? (
            <Sun className="w-5 h-5 text-warning-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-forest-100 rounded-full flex items-center justify-center text-xl">
                {user.avatar || <User className="w-5 h-5 text-forest-600" />}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{roleLabels[role || ""]}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-danger-500"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
