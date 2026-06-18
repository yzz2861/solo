import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Moon, Sun, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  className?: string;
  title?: string;
}

export function TopBar({ className, title = "矿洞应急路线推演系统" }: TopBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount] = useState(3);

  return (
    <header
      className={cn(
        "relative h-16 flex items-center justify-between px-6",
        "bg-gradient-to-r from-mine-blue-dark via-mine-blue to-mine-blue-dark",
        "border-b border-tech-cyan/30",
        "backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-orbitron text-lg font-bold text-white tracking-wider"
        >
          <span className="text-tech-cyan">MINE</span>
          <span className="mx-2 text-gray-500">|</span>
          <span className="text-gray-200">{title}</span>
        </motion.h1>

        <div className="hidden md:flex items-center gap-2 ml-8">
          <div className="w-2 h-2 rounded-full bg-safety-green animate-pulse" />
          <span className="text-xs text-gray-400 font-mono">系统运行正常</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "relative p-2 rounded transition-all duration-300",
            "text-gray-400 hover:text-tech-cyan hover:bg-tech-cyan/10"
          )}
        >
          {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="relative">
          <button
            className={cn(
              "relative p-2 rounded transition-all duration-300",
              "text-gray-400 hover:text-warning-orange hover:bg-warning-orange/10"
            )}
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center"
              >
                <span className="absolute inset-0 bg-alert-red rounded-full animate-ping opacity-75" />
                <span className="relative w-4 h-4 bg-alert-red rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {notificationCount}
                </span>
              </motion.span>
            )}
          </button>
        </div>

        <div className="w-px h-6 bg-tech-cyan/20 mx-2" />

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded transition-all duration-300",
              "hover:bg-tech-cyan/10",
              showUserMenu && "bg-tech-cyan/10"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tech-cyan to-tech-cyan-dark flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white">管理员</p>
              <p className="text-xs text-gray-400">admin@mine.com</p>
            </div>
          </button>

          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 z-50"
            >
              <div className="relative bg-mine-blue border border-tech-cyan/30 rounded shadow-lg overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tech-cyan" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tech-cyan" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tech-cyan" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tech-cyan" />

                <div className="p-3 border-b border-tech-cyan/20">
                  <p className="text-sm font-medium text-white">管理员</p>
                  <p className="text-xs text-gray-400">admin@mine.com</p>
                </div>

                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-tech-cyan/10 hover:text-tech-cyan transition-colors">
                    <Settings size={16} />
                    系统设置
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-alert-red/10 hover:text-alert-red transition-colors">
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-tech-cyan/50 to-transparent" />
    </header>
  );
}
