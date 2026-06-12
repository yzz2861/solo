import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadSchemesFromStorage, deleteSchemeFromStorage } from "@/utils/exportUtils";
import type { Scheme } from "@/types";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { ArrowLeft, Trash2, FolderOpen, Clock } from "lucide-react";

export default function Schemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const { loadScheme } = usePlaygroundStore();
  const navigate = useNavigate();

  useEffect(() => {
    setSchemes(loadSchemesFromStorage());
  }, []);

  const handleLoad = (scheme: Scheme) => {
    loadScheme(scheme);
    navigate("/");
  };

  const handleDelete = (id: string) => {
    deleteSchemeFromStorage(id);
    setSchemes(loadSchemesFromStorage());
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft size={16} />
            返回编辑
          </button>
          <h1 className="text-xl font-bold">方案管理</h1>
        </div>

        {schemes.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-500">暂无保存的方案</p>
            <p className="text-slate-600 text-sm mt-1">在编辑器中保存方案后将在此显示</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-200">{scheme.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(scheme.updatedAt).toLocaleString("zh-CN")}
                      </span>
                      <span>{scheme.components.length} 个部件</span>
                      <span>限高 {scheme.maxHeight}cm</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoad(scheme)}
                      className="px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-colors"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleDelete(scheme.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
