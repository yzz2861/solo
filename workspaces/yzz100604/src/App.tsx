import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Snowflake, Layers, FileArchive, BookOpen } from "lucide-react";
import SingleEvaluate from "@/pages/SingleEvaluate";
import BatchDispatch from "@/pages/BatchDispatch";

const navItems = [
  { path: "/", label: "单点位评估", Icon: Snowflake, end: true },
  { path: "/batch", label: "批量调度", Icon: Layers },
  { path: "/archive", label: "撒盐档案", Icon: FileArchive, disabled: true },
  { path: "/thresholds", label: "阈值说明", Icon: BookOpen, disabled: true },
];

function Nav() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-[1480px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Snowflake className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">桥面结冰风险系统</span>
        </div>
        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, Icon, end, disabled }) => {
            const active = end ? pathname === path : pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={disabled ? "#" : path}
                onClick={(e) => disabled && e.preventDefault()}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                  disabled ? "text-slate-300 cursor-not-allowed" :
                  active
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <Nav />
      <Routes>
        <Route path="/" element={<SingleEvaluate />} />
        <Route path="/batch" element={<BatchDispatch />} />
        <Route path="/archive" element={<div className="p-16 text-center text-slate-400">撒盐档案管理 · 开发中</div>} />
        <Route path="/thresholds" element={<div className="p-16 text-center text-slate-400">阈值与算法说明 · 开发中</div>} />
        <Route path="*" element={<div className="p-16 text-center text-slate-400">页面不存在</div>} />
      </Routes>
    </Router>
  );
}
