import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  AlertTriangle,
  Clock,
  Camera,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { useOrderStore } from "@/store/useOrderStore";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import TagBadge from "@/components/TagBadge/TagBadge";
import type { OrderStatus, DefectType } from "@/types";
import { STATUS_CONFIG, DEFECT_TYPE_CONFIG } from "@/utils/constants";
import { desensitizePhone, desensitizeName } from "@/utils/desensitize";

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, filter, setFilter, getFilteredOrders } = useOrderStore();
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const filteredOrders = useMemo(() => getFilteredOrders(), [orders, filter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setFilter({ keyword: e.target.value || undefined });
  };

  const handleStatusFilter = (status?: OrderStatus) => {
    setFilter({ status });
    setShowFilterDropdown(false);
  };

  const handleDefectFilter = (defectType?: DefectType) => {
    setFilter({ defectType });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "screened" || o.status === "pending").length,
      disputed: orders.filter((o) => o.isDisputed || o.status === "disputed").length,
      lowConfidence: orders.filter((o) => o.confidence < 60).length,
    };
  }, [orders]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">全部工单</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">低置信度</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.lowConfidence}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-card border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">争议件</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.disputed}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索工单号、客户名、家电类型..."
                value={searchInput}
                onChange={handleSearch}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm w-72 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                状态筛选
                <ChevronDown className="w-4 h-4" />
                {filter.status && (
                  <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                )}
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
                  <button
                    onClick={() => handleStatusFilter(undefined)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      !filter.status ? "text-primary-600 bg-primary-50" : "text-gray-700"
                    }`}
                  >
                    全部状态
                  </button>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusFilter(key as OrderStatus)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        filter.status === key
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-700"
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/screening/new")}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建初筛
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">缺陷类型：</span>
          <button
            onClick={() => handleDefectFilter(undefined)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              !filter.defectType
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          {Object.entries(DEFECT_TYPE_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleDefectFilter(key as DefectType)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                filter.defectType === key
                  ? `${config.bgColor} text-white`
                  : `${config.lightBg} ${config.color} hover:opacity-80`
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无匹配的工单</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-card-hover hover:border-gray-300 transition-all cursor-pointer"
                  onClick={() => navigate(`/review/${order.id}`)}
                >
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    <img
                      src={order.photos[0]?.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    {order.isDisputed && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        争议件
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {order.photos.length} 张
                    </div>
                    <div
                      className={`absolute bottom-2 left-2 px-2 py-0.5 text-xs font-medium rounded ${
                        order.confidence >= 80
                          ? "bg-emerald-500/90 text-white"
                          : order.confidence >= 60
                          ? "bg-amber-500/90 text-white"
                          : "bg-red-500/90 text-white"
                      }`}
                    >
                      置信度 {order.confidence}%
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{order.id}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.applianceType} · {order.applianceModel}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600">
                      <span className="text-gray-400">客户：</span>
                      {desensitizeName(order.customerName)} · {desensitizePhone(order.phone)}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {order.tags.slice(0, 3).map((tag) => (
                        <TagBadge key={tag.id} type={tag.type} size="sm" showConfidence={false} />
                      ))}
                      {order.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{order.tags.length - 3}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                      <span className="text-xs text-gray-400">{order.createdBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-700">{filteredOrders.length}</span> 条记录
          </p>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
              上一页
            </button>
            <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">
              1
            </button>
            <button className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
