import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Layers, 
  Calendar, 
  TreePine, 
  Download, 
  Trash2, 
  Eye, 
  FileSpreadsheet, 
  FileText,
  Search,
  Filter,
  Plus,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useAppStore } from "../store/useAppStore";
import { determinePruningSide, generatePhotoRequirements } from "../utils/landscapeScorer";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

export function SchemesPage() {
  const navigate = useNavigate();
  const { pruningSchemes, trees, tasks, deleteScheme, setSelectedPruningBox, selectTree } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  const filteredSchemes = pruningSchemes.filter((scheme) => {
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase());
    const tree = trees.find((t) => t.id === scheme.treeId);
    const matchesFilter = filterType === "all" || (filterType === "with_tasks" && scheme.taskIds.length > 0);
    return matchesSearch && matchesFilter && tree;
  });

  const handleViewScheme = (schemeId: string) => {
    const scheme = pruningSchemes.find((s) => s.id === schemeId);
    if (scheme) {
      selectTree(scheme.treeId);
      setSelectedPruningBox(scheme.pruningBox);
      navigate("/preview");
    }
  };

  const handleExportExcel = () => {
    const relevantTasks = pruningSchemes
      .filter((s) => s.taskIds.length > 0)
      .flatMap((s) => tasks.filter((t) => s.taskIds.includes(t.id)));
    exportToExcel(relevantTasks, trees, `修剪方案清单_${format(new Date(), "yyyyMMdd")}`);
  };

  const handleExportPDF = () => {
    const relevantTasks = pruningSchemes
      .filter((s) => s.taskIds.length > 0)
      .flatMap((s) => tasks.filter((t) => s.taskIds.includes(t.id)));
    exportToPDF(relevantTasks, trees, pruningSchemes, `修剪方案清单_${format(new Date(), "yyyyMMdd")}`);
  };

  const getSchemeStatusColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-700";
    if (score >= 6) return "bg-warning-100 text-warning-700";
    return "bg-danger-100 text-danger-700";
  };

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">方案管理</h2>
          <p className="text-sm text-gray-500 mt-1">查看和管理所有修剪方案，导出任务清单</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="btn-secondary flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            导出PDF
          </button>
          <button
            onClick={() => navigate("/preview")}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建方案
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索方案名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest-500"
          >
            <option value="all">全部方案</option>
            <option value="with_tasks">已生成任务</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-forest-600" />
            </div>
            <span className="text-sm text-gray-500">方案总数</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{pruningSchemes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <TreePine className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-sm text-gray-500">覆盖树木</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {new Set(pruningSchemes.map((s) => s.treeId)).size}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-warning-600" />
            </div>
            <span className="text-sm text-gray-500">已生成任务</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {pruningSchemes.filter((s) => s.taskIds.length > 0).length}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredSchemes.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-card">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无方案</h3>
            <p className="text-gray-500 mb-4">前往3D预览页面创建您的第一个修剪方案</p>
            <button
              onClick={() => navigate("/preview")}
              className="btn-primary inline-flex items-center gap-2"
            >
              创建方案
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSchemes.map((scheme) => {
              const tree = trees.find((t) => t.id === scheme.treeId);
              if (!tree) return null;

              const pruningSide = determinePruningSide(tree, scheme.pruningBox);
              const photoReq = generatePhotoRequirements(tree, pruningSide);

              return (
                <div
                  key={scheme.id}
                  className={`bg-white rounded-xl shadow-card transition-all ${
                    selectedScheme === scheme.id
                      ? "ring-2 ring-forest-500"
                      : "hover:shadow-lg"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-forest-100 to-forest-200 rounded-xl flex items-center justify-center">
                          <TreePine className="w-6 h-6 text-forest-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{scheme.name}</h3>
                          <p className="text-sm text-gray-500">
                            {tree.code} · {tree.species}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getSchemeStatusColor(scheme.landscapeScore)}`}>
                          评分 {scheme.landscapeScore.toFixed(1)}
                        </span>
                        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                          {format(new Date(scheme.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">修剪方位</p>
                        <p className="text-sm font-medium text-gray-800">{pruningSide}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">净空高度</p>
                        <p className="text-sm font-medium text-gray-800">
                          {(scheme.pruningBox.position[1] - scheme.pruningBox.size[1] / 2).toFixed(1)} m
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">修剪体积</p>
                        <p className="text-sm font-medium text-gray-800">
                          {(scheme.prunedVolume).toFixed(1)} m³
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">关联任务</p>
                        <p className="text-sm font-medium text-gray-800">
                          {scheme.taskIds.length} 个
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-forest-50 rounded-lg border border-forest-100 mb-4">
                      <p className="text-xs text-forest-600 mb-1 font-medium">照片要求</p>
                      <p className="text-sm text-forest-800">{photoReq}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewScheme(scheme.id)}
                        className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        查看3D预览
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("确定要删除此方案吗？")) {
                            deleteScheme(scheme.id);
                          }
                        }}
                        className="p-2.5 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 rounded-lg text-gray-400 hover:text-forest-500 hover:bg-forest-50 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
