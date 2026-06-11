import { useState } from "react";
import { usePriceStore } from "@/store/usePriceStore";
import { generatePriceSummary } from "@/utils/broadcastGen";
import { Copy, Printer, FileText, CheckCircle, Edit3 } from "lucide-react";

export default function BroadcastPage() {
  const session = usePriceStore((s) => s.getCurrentSession());
  const finalizeSession = usePriceStore((s) => s.finalizeSession);
  const publishSession = usePriceStore((s) => s.publishSession);
  const updateBroadcastScript = usePriceStore((s) => s.updateBroadcastScript);

  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  if (!session) return <div className="p-8 text-center text-stone-400">请先录入并确认价格</div>;

  const confirmedCount = session.items.filter((i) => i.status === "confirmed").length;
  const pendingCount = session.items.filter((i) => i.status === "pending").length;
  const vendorCount = session.items.filter((i) => i.status === "ask_vendor").length;
  const allHandled = pendingCount === 0;

  const handleGenerate = () => {
    finalizeSession();
  };

  const handleCopy = async () => {
    if (!session.broadcastScript) return;
    await navigator.clipboard.writeText(session.broadcastScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>广播稿 - ${session.date}</title>
      <style>body{font-family:"Noto Sans SC",sans-serif;padding:40px;line-height:1.8;white-space:pre-wrap;}</style>
      </head><body>${session.broadcastScript}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const summary = generatePriceSummary(session.items);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            广播稿生成
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-medium">✓ 已确认 {confirmedCount}</span>
            {pendingCount > 0 && <span className="text-stone-500">⏳ 待确认 {pendingCount}</span>}
            {vendorCount > 0 && <span className="text-amber-600">❓ 待问摊主 {vendorCount}</span>}
          </div>
        </div>

        {!allHandled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-700">
              ⚠ 仍有 {pendingCount} 条价格待确认。建议先在「纠错校验」页面完成确认后再生成广播稿。
            </p>
            <button
              onClick={handleGenerate}
              className="mt-2 px-4 py-1.5 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              仍要生成（未确认项将跳过）
            </button>
          </div>
        )}

        {allHandled && !session.broadcastScript && (
          <div className="text-center py-8">
            <p className="text-stone-500 mb-4">所有价格已确认，可以生成广播稿</p>
            <button
              onClick={handleGenerate}
              className="px-8 py-3 bg-orange-500 text-white rounded-xl text-base font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
            >
              生成广播稿
            </button>
          </div>
        )}

        {session.broadcastScript && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  session.status === "published" ? "bg-green-100 text-green-700" :
                  session.status === "verified" ? "bg-blue-100 text-blue-700" :
                  "bg-stone-100 text-stone-600"
                }`}>
                  {session.status === "published" ? "已发布" : session.status === "verified" ? "已定稿" : "草稿"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800 flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />{editing ? "保存" : "编辑"}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />{copied ? "已复制" : "复制"}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors flex items-center gap-1"
                >
                  <Printer className="w-4 h-4" />打印
                </button>
                {session.status !== "published" && (
                  <button
                    onClick={publishSession}
                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />发布
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              <textarea
                value={session.broadcastScript}
                onChange={(e) => updateBroadcastScript(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm font-serif leading-relaxed focus:ring-2 focus:ring-orange-400 outline-none resize-y"
              />
            ) : (
              <div className="bg-stone-50 rounded-lg p-6 font-serif text-stone-800 leading-relaxed whitespace-pre-wrap border border-stone-200">
                {session.broadcastScript}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full bg-gradient-to-r from-stone-600 to-stone-700 px-6 py-4 flex items-center justify-between"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📋 摊位价目摘要
          </h2>
          <span className="text-stone-300 text-sm">{showSummary ? "收起" : "展开"}</span>
        </button>
        {showSummary && (
          <div className="p-6">
            {summary.length === 0 ? (
              <p className="text-stone-400 text-center py-4">暂无已确认价格</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-stone-600">
                      <th className="text-left px-4 py-2.5 font-medium">品种</th>
                      <th className="text-left px-4 py-2.5 font-medium">分类</th>
                      <th className="text-left px-4 py-2.5 font-medium">摊位</th>
                      <th className="text-left px-4 py-2.5 font-medium">确认价</th>
                      <th className="text-left px-4 py-2.5 font-medium">折合斤价</th>
                      <th className="text-left px-4 py-2.5 font-medium">较昨日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                        <td className="px-4 py-2.5 font-medium text-stone-800">{row.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{row.category}</span>
                        </td>
                        <td className="px-4 py-2.5 text-stone-600">{row.stallNo || "—"}</td>
                        <td className="px-4 py-2.5 text-orange-600 font-medium">{row.price}</td>
                        <td className="px-4 py-2.5 text-stone-600">{row.jinEquiv}</td>
                        <td className="px-4 py-2.5">
                          {row.change === "—" ? (
                            <span className="text-stone-400">—</span>
                          ) : (
                            <span className={`text-xs font-medium ${
                              row.change.startsWith("+") ? "text-red-500" :
                              row.change.startsWith("-") ? "text-green-600" :
                              "text-stone-500"
                            }`}>
                              {row.change}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
