import { FileSpreadsheet, FileDown, AlertTriangle, TrendingDown } from 'lucide-react';
import { useRecycleStore } from '../../store/useRecycleStore';
import { exportDailyRecycle, exportBargainReasons, exportRiskMachines } from '../../utils/csvExport';
import dayjs from 'dayjs';

interface ExportBtnProps {
  title: string;
  desc: string;
  icon: any;
  onClick: () => void;
  accent: string;
  accentBg: string;
  accentText: string;
  badge?: string;
}

function ExportBtn({ title, desc, icon: Icon, onClick, accent, accentBg, accentText, badge }: ExportBtnProps) {
  const iconBoxCls = 'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ' + accentBg + ' ' + accentText + ' shadow-soft group-hover:scale-110 transition-transform';
  const badgeCls = 'px-2 py-0.5 rounded-full text-[11px] font-bold ' + accentBg + ' ' + accentText;
  const progressCls = 'h-full w-0 group-hover:w-full ' + accent + ' transition-all duration-500';
  return (
    <button
      onClick={onClick}
      className="card p-5 w-full text-left group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className={iconBoxCls}>
          <Icon size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-lg text-slate-800">{title}</div>
            {badge && (
              <span className={badgeCls}>
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shrink-0">
          <FileDown size={18} />
        </div>
      </div>
      <div className="mt-4 h-1 rounded-full overflow-hidden bg-slate-100">
        <div className={progressCls} />
      </div>
    </button>
  );
}

export default function ExportZone() {
  const orders = useRecycleStore((s) => s.orders);

  const todayCount = (() => {
    const s = dayjs().startOf('day').valueOf();
    return orders.filter(o => o.createdAt >= s).length;
  })();

  const bargainCount = orders.reduce((s, o) => s + o.priceHistory.length, 0);

  const riskCount = orders.filter(o => {
    const accountRisk = o.checkResult.account.idLoggedOut !== 'pass';
    const privacyRisk = !o.privacyWiped && ['pending_in', 'in_stock'].includes(o.status);
    const snRisk = o.duplicateSnWarning;
    const checkRisk = o.checkResult.water.indicator === 'fail' || o.checkResult.battery.bulge === 'fail' || o.checkResult.screen.crack === 'fail';
    return accountRisk || privacyRisk || snRisk || checkRisk;
  }).length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </span>
            报表导出中心
          </h3>
          <p className="text-xs text-slate-500 mt-1">导出 CSV 文件，兼容 Excel 直接打开</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExportBtn
          title="每日回收明细"
          desc="机型·价格·状态·操作人 全部信息汇总"
          icon={FileSpreadsheet}
          onClick={() => exportDailyRecycle(orders)}
          accent="bg-brand-500"
          accentBg="bg-brand-50"
          accentText="text-brand-700"
          badge={"今日 " + todayCount + " 条"}
        />
        <ExportBtn
          title="让价原因汇总"
          desc="议价记录+变动金额排名+让价原因统计"
          icon={TrendingDown}
          onClick={() => exportBargainReasons(orders)}
          accent="bg-warn-500"
          accentBg="bg-amber-50"
          accentText="text-warn-600"
          badge={"累计 " + bargainCount + " 次"}
        />
        <ExportBtn
          title="风险机待处理"
          desc="账号锁·进水·鼓包·隐私未清除清单"
          icon={AlertTriangle}
          onClick={() => exportRiskMachines(orders)}
          accent="bg-danger-500"
          accentBg="bg-rose-50"
          accentText="text-danger-600"
          badge={riskCount + " 台待处理"}
        />
      </div>
    </div>
  );
}
