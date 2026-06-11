import { useState } from "react";
import { usePriceStore } from "@/store/usePriceStore";
import { CATEGORY_LIST, STALL_LIST } from "@/utils/mockData";
import { Mic, Upload, History, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { PriceUnit } from "@/types";

export default function InputPage() {
  const session = usePriceStore((s) => s.getCurrentSession());
  const addItem = usePriceStore((s) => s.addItem);
  const removeItem = usePriceStore((s) => s.removeItem);
  const importOcrText = usePriceStore((s) => s.importOcrText);
  const addOralEntry = usePriceStore((s) => s.addOralEntry);
  const yesterdaySession = usePriceStore((s) => s.getYesterdaySession());

  const [oralName, setOralName] = useState("");
  const [oralPrice, setOralPrice] = useState("");
  const [oralUnit, setOralUnit] = useState<PriceUnit>("斤");
  const [oralStall, setOralStall] = useState(STALL_LIST[0]);
  const [oralCategory, setOralCategory] = useState(CATEGORY_LIST[0]);

  const [ocrText, setOcrText] = useState("");
  const [showOcr, setShowOcr] = useState(false);
  const [showYesterday, setShowYesterday] = useState(false);

  if (!session) return <div className="p-8 text-center text-stone-400">请先初始化数据</div>;

  const handleAddOral = () => {
    const price = parseFloat(oralPrice);
    if (!oralName.trim() || isNaN(price) || price <= 0) return;
    const existing = session.items.find((i) => i.name === oralName.trim());
    if (existing) {
      usePriceStore.getState().updateItem(existing.id, {
        oralPrice: price,
        oralUnit,
        stallNo: oralStall,
        category: oralCategory,
      });
    } else {
      addOralEntry(oralName.trim(), price, oralUnit, oralStall, oralCategory);
    }
    setOralName("");
    setOralPrice("");
  };

  const handleImportOcr = () => {
    if (!ocrText.trim()) return;
    importOcrText(ocrText);
    setOcrText("");
    setShowOcr(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mic className="w-5 h-5" />
            口述价格录入
          </h2>
          <p className="text-orange-100 text-sm mt-1">逐条输入摊主口报价格</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-6 gap-3 items-end">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">品种名</label>
              <input
                type="text"
                value={oralName}
                onChange={(e) => setOralName(e.target.value)}
                placeholder="如：青菜"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddOral()}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">价格</label>
              <input
                type="number"
                step="0.1"
                value={oralPrice}
                onChange={(e) => setOralPrice(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddOral()}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">单位</label>
              <select
                value={oralUnit}
                onChange={(e) => setOralUnit(e.target.value as PriceUnit)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-white"
              >
                <option value="斤">斤</option>
                <option value="公斤">公斤</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">摊位</label>
              <select
                value={oralStall}
                onChange={(e) => setOralStall(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-white"
              >
                {STALL_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">分类</label>
              <select
                value={oralCategory}
                onChange={(e) => setOralCategory(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none bg-white"
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <button
                onClick={handleAddOral}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>

          {session.items.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-600">
                    <th className="text-left px-4 py-2.5 font-medium">品种</th>
                    <th className="text-left px-4 py-2.5 font-medium">口述价</th>
                    <th className="text-left px-4 py-2.5 font-medium">OCR价</th>
                    <th className="text-left px-4 py-2.5 font-medium">昨日价</th>
                    <th className="text-left px-4 py-2.5 font-medium">摊位</th>
                    <th className="text-left px-4 py-2.5 font-medium">分类</th>
                    <th className="text-center px-4 py-2.5 font-medium w-12">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {session.items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-stone-800">{item.name}</td>
                      <td className="px-4 py-2.5">
                        {item.oralPrice !== undefined ? (
                          <span className="text-orange-600 font-medium">{item.oralPrice}元/{item.oralUnit}</span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.ocrPrice !== undefined ? (
                          <span className={`font-medium ${item.ocrConfidence && item.ocrConfidence < 0.5 ? "text-red-500" : "text-blue-600"}`}>
                            {item.ocrPrice}元/{item.ocrUnit}
                            {item.ocrConfidence && (
                              <span className="ml-1 text-xs text-stone-400">({(item.ocrConfidence * 100).toFixed(0)}%)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.yesterdayPrice !== undefined ? (
                          <span className="text-stone-500">{item.yesterdayPrice}元/{item.yesterdayUnit}</span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-stone-600">{item.stallNo || "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{item.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowOcr(!showOcr)}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">价签OCR识别导入</h2>
          </div>
          {showOcr ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </button>
        {showOcr && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-stone-500">粘贴价签OCR识别文本，系统自动解析品种和价格。格式示例：青菜 2.8元/斤</p>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder={"青菜 2.8元/斤\n白菜 1.5元/斤\n番茄 4.0元/公斤"}
              rows={6}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none resize-y"
            />
            <button
              onClick={handleImportOcr}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              解析并导入
            </button>
          </div>
        )}
      </div>

      {yesterdaySession && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <button
            onClick={() => setShowYesterday(!showYesterday)}
            className="w-full bg-gradient-to-r from-stone-500 to-stone-600 px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">昨日价格 ({yesterdaySession.date})</h2>
            </div>
            {showYesterday ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
          </button>
          {showYesterday && (
            <div className="p-6">
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-stone-600">
                      <th className="text-left px-4 py-2.5 font-medium">品种</th>
                      <th className="text-left px-4 py-2.5 font-medium">确认价</th>
                      <th className="text-left px-4 py-2.5 font-medium">摊位</th>
                      <th className="text-left px-4 py-2.5 font-medium">分类</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yesterdaySession.items.filter((i) => i.confirmedPrice !== undefined).map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                        <td className="px-4 py-2 text-stone-700">{item.name}</td>
                        <td className="px-4 py-2 text-stone-500">{item.confirmedPrice}元/{item.confirmedUnit}</td>
                        <td className="px-4 py-2 text-stone-500">{item.stallNo}</td>
                        <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{item.category}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
