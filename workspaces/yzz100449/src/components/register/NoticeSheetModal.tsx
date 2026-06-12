import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { RecycleOrder } from '../../types';
import { STATUS_LABEL } from '../../types';
import { getFailReasons } from '../../utils/transition';
import { Printer, X } from 'lucide-react';
import dayjs from 'dayjs';

interface Props {
  order: RecycleOrder;
  onClose: () => void;
}

export default function NoticeSheetModal({ order, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const fails = order.failReasons?.length ? order.failReasons : getFailReasons(order.checkResult);
  const deal = order.status === 'bargain_fail';

  useEffect(() => {
    const url = `${window.location.origin}/detail/${order.id}`;
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 130, margin: 1, color: { dark: '#0F766E', light: '#ffffff' },
      }, () => setQrReady(true));
    }
  }, [order.id]);

  const print = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:bg-white print:p-0" onClick={onClose}>
      <div className="max-w-2xl w-full max-h-[92vh] overflow-auto print:max-h-none print:shadow-none print:rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 bg-white rounded-t-2xl border-b border-slate-100 print:hidden">
          <h3 className="font-bold text-lg">检测结果告知单</h3>
          <div className="flex gap-2">
            <button onClick={print} className="btn-secondary"><Printer size={16} /> 打印 / 保存PDF</button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
          </div>
        </div>

        <div id="notice-sheet" className="bg-white p-8 md:p-10 shadow-2xl rounded-b-2xl print:shadow-none print:rounded-none print:p-10">
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-5">
            <div className="text-xs text-slate-500 tracking-[0.3em] mb-1">PHONE RECYCLE ASSESSMENT</div>
            <h1 className="text-3xl font-black text-brand-700 tracking-tight">旧手机回收 · 检测告知单</h1>
            <div className="text-xs text-slate-500 mt-2">
              门店：数码回收估价台 · 单号：<span className="font-mono">{order.id.slice(0, 10).toUpperCase()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm my-6">
            <p><span className="text-slate-500 mr-2">品牌 / 型号：</span><b>{order.brand} {order.model}</b></p>
            <p><span className="text-slate-500 mr-2">容量 / 颜色：</span><b>{order.storage} / {order.color}</b></p>
            <p><span className="text-slate-500 mr-2">成色评级：</span><b>{order.appearanceRating}</b></p>
            <p><span className="text-slate-500 mr-2">电池健康：</span><b>{order.checkResult.battery.health}%</b></p>
            <p className="col-span-2"><span className="text-slate-500 mr-2">序列号：</span><code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">{order.serialNumber}</code></p>
            <p><span className="text-slate-500 mr-2">初估价：</span><b>¥{order.initialPrice.toLocaleString()}</b></p>
            <p><span className="text-slate-500 mr-2">成交状态：</span>
              <b className={deal ? 'text-danger-600' : 'text-brand-700'}>{STATUS_LABEL[order.status]}</b>
            </p>
            {order.finalPrice && (
              <p className="col-span-2"><span className="text-slate-500 mr-2">最终报价：</span>
                <b className="text-xl text-brand-700 font-mono">¥{order.finalPrice.toLocaleString()}</b>
                {order.finalPrice !== order.initialPrice && (
                  <span className="text-xs text-warn-600 ml-3">（较初估价 {order.finalPrice > order.initialPrice ? '+' : ''}{order.finalPrice - order.initialPrice} 元）</span>
                )}
              </p>
            )}
          </div>

          {fails.length > 0 && (
            <div className="my-6 p-5 rounded-2xl border-2 border-danger-300 bg-rose-50">
              <div className="font-bold text-danger-700 mb-3 flex items-center gap-2">
                ⚠️ 检测不通过项（共 {fails.length} 项）
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-sm">
                {fails.map((f, i) => (
                  <li key={i} className="text-rose-700 font-semibold pl-1">{f}</li>
                ))}
              </ol>
              <div className="mt-3 pt-3 border-t border-rose-200 text-xs text-rose-600">
                以上问题影响回收估价与安全等级，如不同意最终报价可选择放弃回收。
              </div>
            </div>
          )}

          {deal && order.bargainFailRemark && (
            <div className="my-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <b>备注：</b>{order.bargainFailRemark}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-dashed border-slate-300 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-500">操作店员：<b className="text-slate-700">{order.createdBy}</b></div>
              <div className="text-slate-500 mt-1">创建时间：{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}</div>
              <div className="mt-4 max-w-xs text-[11px] text-slate-400 leading-relaxed">
                本告知单为电子凭证，扫码可查看完整检测报告与议价历史。设备一旦入库完成回收，请妥善保管此单据。
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <canvas ref={canvasRef} className={qrReady ? '' : 'opacity-0'} />
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter">扫码看详情</span>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-300 tracking-[0.5em]">
            · RECYCLE · ASSESS · VALUE ·
          </div>
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #notice-sheet, #notice-sheet * { visibility: visible; } #notice-sheet { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}
