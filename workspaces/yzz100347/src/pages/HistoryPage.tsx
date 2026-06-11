import { useState, useMemo } from "react";
import { usePriceStore } from "@/store/usePriceStore";
import { formatPrice, toJin } from "@/types";
import { Calendar, Clock, ArrowUpDown, FileText } from "lucide-react";

export default function HistoryPage() {
  const sessions = usePriceStore((s) => s.sessions);
  const getSessionByDate = usePriceStore((s) => s.getSessionByDate);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"changes" | "snapshot">("changes");

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions]
  );

  const activeSession = selectedDate ? getSessionByDate(selectedDate) : sortedSessions[0];

  const changeRecords = activeSession?.changeLog || [];
  const snapshotItems = (activeSession?.items || []).filter((i) => i.confirmedPrice !== undefined);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-orange-500" />
          留痕追溯
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-600">选择日期：</label>
            <select
              value={selectedDate || sortedSessions[0]?.date || ""}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
            >
              {sortedSessions.map((s) => (
                <option key={s.id} value={s.date}>
                  {s.date} ({s.status === "published" ? "已发布" : s.status === "verified" ? "已定稿" : "草稿"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("changes")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "changes" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"
              }`}
            >
              改价记录
            </button>
            <button
              onClick={() => setViewMode("snapshot")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "snapshot" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"
              }`}
            >
              每日快照
            </button>
          </div>
        </div>
      </div>

      {activeSession && viewMode === "changes" && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-r from-stone-600 to-stone-700 px-6 py-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5" />
              改价记录 — {activeSession.date}
            </h3>
            <p className="text-stone-300 text-sm mt-1">共 {changeRecords.length} 条变更记录</p>
          </div>
          {changeRecords.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              当日无改价记录
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {changeRecords.map((record) => (
                <div key={record.id} className="flex items-start gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                  <div className="shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-800">{record.itemName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{record.field}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-500 line-through">{record.oldValue}</span>
                      <span className="text-stone-400">→</span>
                      <span className="text-green-600 font-medium">{record.newValue}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                      <span>原因: {record.reason}</span>
                      <span>·</span>
                      <span>{new Date(record.timestamp).toLocaleString("zh-CN")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSession && viewMode === "snapshot" && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-r from-stone-600 to-stone-700 px-6 py-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              每日快照 — {activeSession.date}
            </h3>
            <p className="text-stone-300 text-sm mt-1">
              共 {snapshotItems.length} 个品种，状态：{activeSession.status === "published" ? "已发布" : activeSession.status === "verified" ? "已定稿" : "草稿"}
            </p>
          </div>
          {snapshotItems.length === 0 ? (
            <div className="p-8 text-center text-stone-400">
              当日无已确认价格
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-600">
                    <th className="text-left px-4 py-2.5 font-medium">品种</th>
                    <th className="text-left px-4 py-2.5 font-medium">分类</th>
                    <th className="text-left px-4 py-2.5 font-medium">摊位</th>
                    <th className="text-left px-4 py-2.5 font-medium">确认价</th>
                    <th className="text-left px-4 py-2.5 font-medium">折合斤价</th>
                    <th className="text-left px-4 py-2.5 font-medium">确认来源</th>
                    <th className="text-left px-4 py-2.5 font-medium">口述价</th>
                    <th className="text-left px-4 py-2.5 font-medium">OCR价</th>
                    <th className="text-left px-4 py-2.5 font-medium">昨日价</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotItems.map((item, idx) => {
                    const jinPrice = item.confirmedUnit ? toJin(item.confirmedPrice!, item.confirmedUnit) : 0;
                    return (
                      <tr key={item.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"} ${item.status === "ask_vendor" ? "bg-amber-50/50" : ""}`}>
                        <td className="px-4 py-2.5 font-medium text-stone-800">{item.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{item.category}</span>
                        </td>
                        <td className="px-4 py-2.5 text-stone-600">{item.stallNo || "—"}</td>
                        <td className="px-4 py-2.5 text-orange-600 font-medium">
                          {formatPrice(item.confirmedPrice, item.confirmedUnit)}
                        </td>
                        <td className="px-4 py-2.5 text-stone-600">{jinPrice.toFixed(1)}元/斤</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.confirmedSource === "oral" ? "bg-orange-100 text-orange-700" :
                            item.confirmedSource === "ocr" ? "bg-blue-100 text-blue-700" :
                            item.confirmedSource === "manual" ? "bg-purple-100 text-purple-700" :
                            "bg-stone-100 text-stone-500"
                          }`}>
                            {item.confirmedSource === "oral" ? "口述" : item.confirmedSource === "ocr" ? "OCR" : item.confirmedSource === "manual" ? "手动/摊主" : "待确认"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-stone-500">{formatPrice(item.oralPrice, item.oralUnit)}</td>
                        <td className="px-4 py-2.5 text-stone-500">{formatPrice(item.ocrPrice, item.ocrUnit)}</td>
                        <td className="px-4 py-2.5 text-stone-500">{formatPrice(item.yesterdayPrice, item.yesterdayUnit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSession?.broadcastScript && viewMode === "snapshot" && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h3 className="text-base font-bold text-white">当日广播稿</h3>
          </div>
          <div className="p-6 font-serif text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50">
            {activeSession.broadcastScript}
          </div>
        </div>
      )}
    </div>
  );
}
