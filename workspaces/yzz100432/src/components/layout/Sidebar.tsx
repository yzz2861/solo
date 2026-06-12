import { NavLink, useLocation } from "react-router-dom";
import { 
  TreePine, 
  Layers, 
  ClipboardList, 
  CalendarCheck, 
  UserCog 
} from "lucide-react";
import type { User } from "../../types";
import { useAppStore } from "../../store/useAppStore";

interface SidebarProps {
  user: User | null;
  role: string | null;
}

export function Sidebar({ user, role }: SidebarProps) {
  const location = useLocation();
  const { selectTree } = useAppStore();

  const navItems = [
    {
      path: "/preview",
      label: "3D预览",
      icon: TreePine,
      roles: ["admin", "supervisor"],
      end: false,
    },
    {
      path: "/schemes",
      label: "方案管理",
      icon: Layers,
      roles: ["admin", "supervisor"],
      end: false,
    },
    {
      path: "/tasks",
      label: "任务执行",
      icon: ClipboardList,
      roles: ["gardener", "admin", "supervisor"],
      end: false,
    },
    {
      path: "/review",
      label: "复查安排",
      icon: CalendarCheck,
      roles: ["supervisor", "admin"],
      end: false,
    },
    {
      path: "/profile",
      label: "个人设置",
      icon: UserCog,
      roles: ["admin", "gardener", "supervisor"],
      end: false,
    },
  ];

  const visibleItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : true
  );

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => selectTree(null)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-gradient-to-r from-forest-500 to-forest-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50 hover:text-forest-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-forest-50 to-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-forest-500 rounded-lg flex items-center justify-center">
              <TreePine className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-forest-700">夏季提示</span>
          </div>
          <p className="text-xs text-forest-600 leading-relaxed">
            夏季树木生长旺盛，建议每2周检查一次路灯遮挡情况，确保夜间照明安全。
          </p>
        </div>
      </div>
    </aside>
  );
}
