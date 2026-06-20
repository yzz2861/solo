import { Link, useLocation } from "react-router-dom";
import { Calculator, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "稀释计算", icon: Calculator },
  { to: "/records", label: "配制记录", icon: ClipboardList },
  { to: "/presets", label: "用途预设", icon: Settings },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center h-12 px-4">
        <span className="font-bold text-gray-800 whitespace-nowrap">
          消毒液稀释复核器
        </span>
        <div className="flex flex-1 justify-end gap-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm border-b-2 transition-colors",
                  active
                    ? "border-sky-500 text-sky-500"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
