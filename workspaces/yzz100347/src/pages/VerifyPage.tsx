import { useState } from "react";
import { usePriceStore } from "@/store/usePriceStore";
import { toJin, formatPrice, calcChangeRate } from "@/types";
import type { PriceUnit, AnomalyAlert } from "@/types";
import {
  AlertTriangle,
  AlertCircle,
  Check,
  HelpCircle,
  Pencil,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const ANOMALY_LABELS: Record<string, { label: string; color: string }> = {
  unit_mismatch: { label: "单位不一致", color: "bg-amber-100 text-amber-700" },
  price_surge: { label: "涨跌过大", color: "bg-red-100 text-red-700" },
  name_variant: { label: "同名不同品种", color: "bg-purple-100 text-purple-700" },
  ocr_unclear: { label: "识别不清", color: "bg-red-100 text-red-700" },
  unconfirmed: { label: "未确认", color: "bg-stone-100 text-stone-600" },
};

export default function VerifyPage() {
  const session = usePriceStore((s) => s.getCurrentSession());
  const confirmItem = usePriceStore((s) => s.confirmItem);
  const markAskVendor = usePriceStore((s) => s.markAskVendor);
  const confirmFromVendor = usePriceStore((s) => s.confirmFromVendor);
  const getAnomalies = usePriceStore((s) => s.getAnomalies);
  const getVendorList = usePriceStore((s) => s.getVendorList);

  const [manualEditId, setManualEditId] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState("");
  const [manualUnit, setManualUnit] = useState<PriceUnit>("斤");
  const [vendorConfirmId, setVendorConfirmId] = useState<string | null>(null);
  const [vendorPrice, setVendorPrice] = useState("");
  const [vendorUnit, setVendorUnit] = useState<PriceUnit>("斤");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  if (!session) return <div className="p-8 text-center text-stone-400">请先录入数据</div>;

  const anomalies = getAnomalies();
  const vendorList = getVendorList();

  const anomalyMap = new Map<string, AnomalyAlert[]>();
  for (const a of anomalies) {
    if (!anomalyMap.has(a.itemId)) anomalyMap.set(a.itemId, []);
    anomalyMap.get(a.itemId)!.push(a);
  }

  const filteredItems = session.items.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return item.status === "pending";
    if (activeFilter === "confirmed") return item.status === "confirmed";
    if (activeFilter === "ask_vendor") return item.status === "ask_vendor";
    if (activeFilter === "anomaly") return anomalyMap.has(item.id);
    return true;
  });

  const counts = {
    all: session.items.length,
    pending: session.items.filter((i) => i.status === "pending").length,
    confirmed: session.items.filter((i) => i.status === "confirmed").length,
    ask_vendor: vendorList.length,
    anomaly: new Set(anomalies.map((a) => a.itemId)).size,
  };

  const getChangeDisplay = (item: typeof session.items[0]) => {
    if (item.confirmedPrice === undefined || !item.confirmedUnit || item.yesterdayPrice === undefined || !item.yesterdayUnit)
      return null;
    const rate = calcChangeRate(item.confirmedPrice, item.confirmedUnit, item.yesterdayPrice, item.yesterdayUnit);
    if (Math.abs(rate) < 1) return <span className="text-stone-400 text-xs">持平</span>;
    const color = rate > 0 ? "text-red-500" : "text-green-600";
    const arrow = rate > 0 ? "↑" : "↓";
    return (
      <span className={`text-xs font-medium ${color}`}>
        {arrow}{Math.abs(rate).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {anomalies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              异常提示 ({anomalies.length})
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
            {anomalies.map((a) => {
              const info = ANOMALY_LABELS[a.type] || { label: a.type, color: "bg-stone-100 text-stone-600" };
              return (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg ${a.severity === "error" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                  {a.severity === "error" ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>
                    </div>
                    <p className="text-sm text-stone-700">{a.message}</p>
                    <p className="text-xs text-stone-500 mt-1">💡 {a.suggestion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "全部" },
          { key: "anomaly", label: "有异常" },
          { key: "pending", label: "待确认" },
          { key: "confirmed", label: "已确认" },
          { key: "ask_vendor", label: "待问摊主" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f.key
                ? "bg-orange-500 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f.label} ({counts[f.key as keyof typeof counts]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            三源价格比对
          </h2>
          <p className="text-orange-100 text-sm mt-1">逐条确认价格，选择采纳来源</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-600 text-xs">
                <th className="text-left px-4 py-3 font-medium">品种</th>
                <th className="text-left px-4 py-3 font-medium">口述价</th>
                <th className="text-left px-4 py-3 font-medium">OCR价</th>
                <th className="text-left px-4 py-3 font-medium">昨日价</th>
                <th className="text-left px-4 py-3 font-medium">斤价对比</th>
                <th className="text-left px-4 py-3 font-medium">涨跌</th>
                <th className="text-left px-4 py-3 font-medium">异常</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-left px-4 py-3 font-medium min-w-[280px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const itemAnomalies = anomalyMap.get(item.id) || [];
                const oralJin = item.oralPrice !== undefined && item.oralUnit ? toJin(item.oralPrice, item.oralUnit) : undefined;
                const ocrJin = item.ocrPrice !== undefined && item.ocrUnit ? toJin(item.ocrPrice, item.ocrUnit) : undefined;
                const yJin = item.yesterdayPrice !== undefined && item.yesterdayUnit ? toJin(item.yesterdayPrice, item.yesterdayUnit) : undefined;
                const hasAnomaly = itemAnomalies.length > 0;

                return (
                  <tr key={item.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-stone-50/30"} ${hasAnomaly ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-3 font-medium text-stone-800">{item.name}</td>
                    <td className="px-4 py-3">
                      {item.oralPrice !== undefined ? (
                        <span className="text-orange-600 font-medium">{formatPrice(item.oralPrice, item.oralUnit)}</span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.ocrPrice !== undefined ? (
                        <span className={`font-medium ${item.ocrConfidence && item.ocrConfidence < 0.5 ? "text-red-500" : "text-blue-600"}`}>
                          {formatPrice(item.ocrPrice, item.ocrUnit)}
                          {item.ocrConfidence && <span className="ml-1 text-xs text-stone-400">({(item.ocrConfidence * 100).toFixed(0)}%)</span>}
                        </span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {formatPrice(item.yesterdayPrice, item.yesterdayUnit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        {oralJin !== undefined && <span className="text-orange-600">{oralJin.toFixed(1)}</span>}
                        {oralJin !== undefined && ocrJin !== undefined && <span className="text-stone-300">/</span>}
                        {ocrJin !== undefined && <span className="text-blue-600">{ocrJin.toFixed(1)}</span>}
                        {(oralJin !== undefined || ocrJin !== undefined) && yJin !== undefined && (
                          <>
                            <span className="text-stone-300">/</span>
                            <span className="text-stone-500">{yJin.toFixed(1)}</span>
                          </>
                        )}
                        <span className="text-stone-400 ml-0.5">元/斤</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getChangeDisplay(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {itemAnomalies.map((a) => {
                          const info = ANOMALY_LABELS[a.type];
                          return (
                            <span key={a.id} className={`text-xs px-1.5 py-0.5 rounded ${info?.color || "bg-stone-100 text-stone-500"}`}>
                              {info?.label || a.type}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.status === "confirmed" ? "bg-green-100 text-green-700" :
                        item.status === "ask_vendor" ? "bg-amber-100 text-amber-700" :
                        "bg-stone-100 text-stone-600"
                      }`}>
                        {item.status === "confirmed" ? "已确认" : item.status === "ask_vendor" ? "待问摊主" : "待确认"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "pending" && (
                        <div className="flex items-center gap-1.5">
                          {item.oralPrice !== undefined && item.oralUnit && (
                            <button
                              onClick={() => confirmItem(item.id, item.oralPrice!, item.oralUnit!, "oral")}
                              className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200 transition-colors flex items-center gap-1"
                              title="采纳口述价"
                            >
                              <Check className="w-3 h-3" />口述
                            </button>
                          )}
                          {item.ocrPrice !== undefined && item.ocrUnit && (
                            <button
                              onClick={() => confirmItem(item.id, item.ocrPrice!, item.ocrUnit!, "ocr")}
                              className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                              title="采纳OCR价"
                            >
                              <Check className="w-3 h-3" />OCR
                            </button>
                          )}
                          <button
                            onClick={() => { setManualEditId(item.id); setManualPrice(""); setManualUnit("斤"); }}
                            className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium hover:bg-stone-200 transition-colors flex items-center gap-1"
                            title="手动输入"
                          >
                            <Pencil className="w-3 h-3" />手动
                          </button>
                          <button
                            onClick={() => markAskVendor(item.id)}
                            className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200 transition-colors flex items-center gap-1"
                            title="待问摊主"
                          >
                            <HelpCircle className="w-3 h-3" />待问
                          </button>
                        </div>
                      )}
                      {item.status === "ask_vendor" && (
                        <button
                          onClick={() => { setVendorConfirmId(item.id); setVendorPrice(""); setVendorUnit("斤"); }}
                          className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          摊主确认
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {vendorList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              待问摊主清单 ({vendorList.length})
            </h2>
            <p className="text-amber-100 text-sm mt-1">以下品种价格需与摊主二次确认，不硬生成肯定结论</p>
          </div>
          <div className="p-4 space-y-2">
            {vendorList.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <span className="font-medium text-stone-800">{item.name}</span>
                  <span className="text-xs text-stone-500 ml-2">({item.stallNo})</span>
                  <span className="text-xs text-stone-400 ml-2">
                    口述: {formatPrice(item.oralPrice, item.oralUnit)} | OCR: {formatPrice(item.ocrPrice, item.ocrUnit)}
                  </span>
                </div>
                <button
                  onClick={() => { setVendorConfirmId(item.id); setVendorPrice(""); setVendorUnit("斤"); }}
                  className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />确认价格
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {manualEditId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setManualEditId(null)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-800 mb-4">手动输入确认价</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-stone-600 mb-1">价格</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">单位</label>
                <select
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value as PriceUnit)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                >
                  <option value="斤">斤</option>
                  <option value="公斤">公斤</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setManualEditId(null)} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800">取消</button>
              <button
                onClick={() => {
                  const p = parseFloat(manualPrice);
                  if (!isNaN(p) && p > 0) {
                    confirmItem(manualEditId, p, manualUnit, "manual");
                    setManualEditId(null);
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {vendorConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVendorConfirmId(null)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-800 mb-4">摊主确认价格</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-stone-600 mb-1">摊主报价</label>
                <input
                  type="number"
                  step="0.1"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">单位</label>
                <select
                  value={vendorUnit}
                  onChange={(e) => setVendorUnit(e.target.value as PriceUnit)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                >
                  <option value="斤">斤</option>
                  <option value="公斤">公斤</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setVendorConfirmId(null)} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800">取消</button>
              <button
                onClick={() => {
                  const p = parseFloat(vendorPrice);
                  if (!isNaN(p) && p > 0) {
                    confirmFromVendor(vendorConfirmId, p, vendorUnit);
                    setVendorConfirmId(null);
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
