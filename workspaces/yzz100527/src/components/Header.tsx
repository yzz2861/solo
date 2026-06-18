import { FilePlus, Printer, Download, AlertTriangle, Users } from 'lucide-react';
import type { Student, PrintMode } from '@/types';

interface HeaderProps {
  students: Student[];
  incompleteCount: number;
  pendingCount: number;
  completedCount: number;
  alertCount: number;
  onAddStudent: () => void;
  onPrintBusList: () => void;
  onPrintHealthNote: () => void;
  onExportIncomplete: () => void;
}

export function Header({
  students,
  incompleteCount,
  pendingCount,
  completedCount,
  alertCount,
  onAddStudent,
  onPrintBusList,
  onPrintHealthNote,
  onExportIncomplete,
}: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">研学营证件收集管理</h1>
            <p className="text-slate-300 text-sm mt-1">学生信息录入 · 材料核查 · 分车管理</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onExportIncomplete}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出待补材料
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                <Printer size={16} />
                打印
                <span className="text-xs opacity-70">▾</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={onPrintBusList}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Users size={14} />
                  打印分车名单
                </button>
                <button
                  onClick={onPrintHealthNote}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <AlertTriangle size={14} />
                  打印健康备注
                </button>
              </div>
            </div>
            <button
              onClick={onAddStudent}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
            >
              <FilePlus size={16} />
              添加学生
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg px-4 py-3 backdrop-blur-sm">
            <p className="text-slate-300 text-xs">总人数</p>
            <p className="text-2xl font-bold mt-1">{students.length}</p>
          </div>
          <div className="bg-red-500/20 rounded-lg px-4 py-3 backdrop-blur-sm border border-red-400/30">
            <p className="text-red-200 text-xs">缺材料</p>
            <p className="text-2xl font-bold mt-1 text-red-100">{incompleteCount}</p>
          </div>
          <div className="bg-amber-500/20 rounded-lg px-4 py-3 backdrop-blur-sm border border-amber-400/30">
            <p className="text-amber-200 text-xs">待确认</p>
            <p className="text-2xl font-bold mt-1 text-amber-100">{pendingCount}</p>
          </div>
          <div className="bg-emerald-500/20 rounded-lg px-4 py-3 backdrop-blur-sm border border-emerald-400/30">
            <p className="text-emerald-200 text-xs">已完成</p>
            <p className="text-2xl font-bold mt-1 text-emerald-100">{completedCount}</p>
          </div>
        </div>

        {alertCount > 0 && (
          <div className="mt-4 bg-amber-500/20 border border-amber-400/40 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-300" />
            <span className="text-sm text-amber-100">
              有 <span className="font-semibold">{alertCount}</span> 项提醒需要关注，请检查待确认和缺材料分组
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
