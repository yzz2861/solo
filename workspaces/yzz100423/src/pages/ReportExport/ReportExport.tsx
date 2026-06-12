import { useState, useMemo } from "react";
import {
  FileBarChart,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  Filter,
  ChevronDown,
  Search,
} from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import TagBadge from "@/components/TagBadge/TagBadge";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import { DEFECT_TYPE_CONFIG } from "@/utils/constants";
import { desensitizePhone, desensitizeName, desensitizeAddress } from "@/utils/desensitize";
import type { DefectType, OrderStatus } from "@/types";

export default function ReportExport() {
  const { orders } = useOrderStore();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [desensitize, setDesensitize] = useState(true);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [showPreview, setShowPreview] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [defectFilter, setDefectFilter] = useState<DefectType | "all">("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDefectDropdown, setShowDefectDropdown] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (dateFrom) {
      result = result.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.createdAt) <= to);
    }

    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (defectFilter !== "all") {
      result = result.filter((o) => o.tags.some((t) => t.type === defectFilter));
    }

    return result;
  }, [orders, dateFrom, dateTo, statusFilter, defectFilter]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const passed = filteredOrders.filter(
      (o) => o.status === "quality_passed" || o.status === "closed"
    ).length;
    const disputed = filteredOrders.filter((o) => o.isDisputed).length;
    const lowConfidence = filteredOrders.filter((o) => o.confidence < 60).length;
    const avgConfidence =
      total > 0
        ? Math.round(filteredOrders.reduce((sum, o) => sum + o.confidence, 0) / total)
        : 0;

    const defectCounts: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      order.tags.forEach((tag) => {
        defectCounts[tag.type] = (defectCounts[tag.type] || 0) + 1;
      });
    });

    return { total, passed, disputed, lowConfidence, avgConfidence, defectCounts };
  }, [filteredOrders]);

  const handleExport = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDisplayName = (name: string) => (desensitize ? desensitizeName(name) : name);
  const getDisplayPhone = (phone: string) => (desensitize ? desensitizePhone(phone) : phone);
  const getDisplayAddress = (address: string) =>
    desensitize ? desensitizeAddress(address) : address;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总工单</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已通过</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.passed}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">争议件</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.disputed}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">低置信度</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.lowConfidence}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均置信度</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.avgConfidence}%</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-lg shadow-card border border-gray-100 p-5 space-y-5">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-600" />
            导出配置
          </h3>

          <div>
            <label className="text-sm text-gray-600 block mb-2">时间范围</label>
            <div className="space-y-2">
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <p className="text-center text-xs text-gray-400">至</p>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">工单状态</label>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span>{statusFilter === "all" ? "全部状态" : statusFilter}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      statusFilter === "all" ? "text-primary-600 bg-primary-50" : ""
                    }`}
                  >
                    全部状态
                  </button>
                  {["screened", "customer_reviewed", "quality_check", "quality_passed", "disputed", "closed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s as OrderStatus);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        statusFilter === s ? "text-primary-600 bg-primary-50" : ""
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">缺陷类型</label>
            <div className="relative">
              <button
                onClick={() => setShowDefectDropdown(!showDefectDropdown)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span>{defectFilter === "all" ? "全部类型" : defectFilter}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDefectDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
                  <button
                    onClick={() => {
                      setDefectFilter("all");
                      setShowDefectDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      defectFilter === "all" ? "text-primary-600 bg-primary-50" : ""
                    }`}
                  >
                    全部类型
                  </button>
                  {Object.entries(DEFECT_TYPE_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDefectFilter(key as DefectType);
                        setShowDefectDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        defectFilter === key ? "text-primary-600 bg-primary-50" : ""
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">导出格式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat("excel")}
                className={`p-3 rounded-md border transition-all ${
                  exportFormat === "excel"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FileSpreadsheet
                  className={`w-6 h-6 mx-auto mb-1 ${
                    exportFormat === "excel" ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-xs font-medium ${
                    exportFormat === "excel" ? "text-emerald-700" : "text-gray-600"
                  }`}
                >
                  Excel
                </p>
              </button>
              <button
                onClick={() => setExportFormat("pdf")}
                className={`p-3 rounded-md border transition-all ${
                  exportFormat === "pdf"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FileText
                  className={`w-6 h-6 mx-auto mb-1 ${
                    exportFormat === "pdf" ? "text-red-600" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-xs font-medium ${
                    exportFormat === "pdf" ? "text-red-700" : "text-gray-600"
                  }`}
                >
                  PDF
                </p>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-gray-700">数据脱敏</span>
              </div>
              <button
                onClick={() => setDesensitize(!desensitize)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  desensitize ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    desensitize ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {desensitize ? "已启用：手机号、姓名等敏感信息已脱敏" : "已关闭：报告将包含完整的客户信息"}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => setShowPreview(true)}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              预览报告
            </button>
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-md text-sm font-medium hover:from-primary-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-lg shadow-card border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">缺陷类型分布</h3>
            <span className="text-sm text-gray-500">
              共 {stats.total} 条工单记录
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {Object.entries(DEFECT_TYPE_CONFIG).map(([type, config]) => {
                const count = stats.defectCounts[type] || 0;
                const percentage =
                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div
                    key={type}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <TagBadge type={type as DefectType} showConfidence={false} />
                      <span className="text-lg font-bold text-gray-800">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bgColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 text-right">
                      占比 {percentage}%
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">工单明细</h4>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        工单号
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        客户信息
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        家电类型
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        缺陷标签
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        置信度
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-medium text-gray-800">
                          {order.id}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-gray-700">
                            {getDisplayName(order.customerName)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {getDisplayPhone(order.phone)}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {order.applianceType}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {order.tags.slice(0, 2).map((tag) => (
                              <TagBadge
                                key={tag.id}
                                type={tag.type}
                                size="sm"
                                showConfidence={false}
                              />
                            ))}
                            {order.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{order.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-sm font-medium ${
                              order.confidence >= 80
                                ? "text-emerald-600"
                                : order.confidence >= 60
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {order.confidence}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={order.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length > 10 && (
                  <p className="text-center text-sm text-gray-400 py-3">
                    仅展示前 10 条，完整数据请导出查看
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">质检报告预览</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  共 {filteredOrders.length} 条记录 · {desensitize ? "已脱敏" : "未脱敏"}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">家电售后维修质检报告</h2>
                <p className="text-sm text-gray-500 mt-1">
                  生成时间：{new Date().toLocaleString("zh-CN")}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                  <p className="text-xs text-gray-500">总工单</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{stats.passed}</p>
                  <p className="text-xs text-emerald-600">已通过</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
                  <p className="text-xs text-red-600">争议件</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">{stats.avgConfidence}%</p>
                  <p className="text-xs text-indigo-600">平均置信度</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        工单号
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        客户
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        家电
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        缺陷类型
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        置信度
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        状态
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 text-xs">
                        时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                        <td className="px-3 py-2">
                          <p className="text-gray-700 text-xs">
                            {getDisplayName(order.customerName)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {getDisplayPhone(order.phone)}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {order.applianceType}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {order.tags.map((t) => DEFECT_TYPE_CONFIG[t.type].label).join("、")}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span
                            className={
                              order.confidence >= 80
                                ? "text-emerald-600"
                                : order.confidence >= 60
                                ? "text-amber-600"
                                : "text-red-600"
                            }
                          >
                            {order.confidence}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {order.status}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {desensitize && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    本报告已对客户敏感信息进行脱敏处理，手机号、姓名、地址均已隐藏部分内容。
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
              >
                关闭
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          </div>
        </div>
      )}

      {exportSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-md shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            报告已生成，正在下载...
          </div>
        </div>
      )}
    </div>
  );
}
