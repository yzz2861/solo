import { useState } from "react";
import { Trash2, AlertTriangle, AlertCircle, Calendar, Box, Anchor } from "lucide-react";
import type { Scheme } from "@/types";

interface SchemeCardProps {
  scheme: Scheme;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function SchemeCard({ scheme, selected, onSelect, onDelete }: SchemeCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dangerCount = scheme.warnings.filter((w) => w.level === "danger").length;
  const warningCount = scheme.warnings.filter((w) => w.level === "warning").length;
  const hasWarnings = scheme.warnings.length > 0;

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative bg-[#0D2E4A] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#00D4AA]/50 ${
        selected ? "border-[#00D4AA] shadow-lg shadow-[#00D4AA]/10" : "border-white/10"
      }`}
    >
      {hasWarnings && (
        <div
          className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            dangerCount > 0
              ? "bg-red-500/20 text-red-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {dangerCount > 0 ? <AlertTriangle size={10} /> : <AlertCircle size={10} />}
          {dangerCount > 0 ? `${dangerCount} 危险` : `${warningCount} 警告`}
        </div>
      )}

      <div className="w-full h-24 bg-[#071D33] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {scheme.thumbnail ? (
          <img
            src={scheme.thumbnail}
            alt={scheme.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white/20 text-xs">无预览</div>
        )}
      </div>

      <h3 className="text-sm font-semibold truncate mb-1">{scheme.name}</h3>

      <div className="flex items-center gap-1.5 text-[10px] opacity-50 mb-3">
        <Calendar size={10} />
        {new Date(scheme.createdAt).toLocaleDateString("zh-CN")}
      </div>

      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1 opacity-60">
          <Box size={12} />
          {scheme.modules.length}
        </div>
        <div className="flex items-center gap-1 opacity-60">
          <Anchor size={12} />
          {scheme.anchors.length}
        </div>
        {hasWarnings && (
          <div
            className={`flex items-center gap-1 ${
              dangerCount > 0 ? "text-red-400" : "text-yellow-400"
            }`}
          >
            <AlertTriangle size={12} />
            {scheme.warnings.length}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end mt-3 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className={`text-xs px-2.5 py-1 rounded-md transition ${
            confirmDelete
              ? "bg-red-500 text-white"
              : "text-white/40 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          {confirmDelete ? "确认删除" : "删除"}
        </button>
      </div>
    </div>
  );
}
