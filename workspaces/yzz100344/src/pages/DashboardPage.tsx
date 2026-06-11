import { useComplaintStore } from '@/store/useComplaintStore';
import KpiCard from '@/components/KpiCard';
import FilterPanel from '@/components/FilterPanel';
import LongestRunningTable from '@/components/LongestRunningTable';
import RepeatHotspots from '@/components/RepeatHotspots';
import StaffPerformance from '@/components/StaffPerformance';
import ProblemAnalysis from '@/components/ProblemAnalysis';
import DataQualityReport from '@/components/DataQualityReport';
import { FileText, Clock, Timer, Repeat, AlertTriangle, Upload, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { hasData, getKPIs, loadMockData } = useComplaintStore();
  const kpis = getKPIs();

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6">
          <Database className="w-12 h-12 text-primary-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-warm-800 mb-2">欢迎使用物业投诉响应看板</h2>
        <p className="text-warm-500 mb-8 text-center max-w-md">
          导入工单数据后即可查看多维度分析，包括响应时长、拖期案例、重复投诉热点和管家绩效等
        </p>
        <div className="flex gap-3">
          <Link to="/import" className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入工单数据
          </Link>
          <button onClick={loadMockData} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            加载示例数据
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <FilterPanel />
      </div>
      
      <div className="flex-1 space-y-6 min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="总工单量"
            value={kpis.totalComplaints}
            unit="条"
            icon={<FileText className="w-5 h-5" />}
            trend={12}
            delay={0}
          />
          <KpiCard
            title="平均响应时长"
            value={kpis.avgResponseHours}
            unit="小时"
            icon={<Clock className="w-5 h-5" />}
            trend={-8}
            delay={80}
            colorClass={kpis.avgResponseHours > 2 ? 'text-accent-600' : 'text-primary-700'}
          />
          <KpiCard
            title="平均关闭时长"
            value={kpis.avgCloseHours}
            unit="小时"
            icon={<Timer className="w-5 h-5" />}
            trend={5}
            delay={160}
            colorClass={kpis.avgCloseHours > 72 ? 'text-accent-600' : 'text-primary-700'}
          />
          <KpiCard
            title="重复投诉率"
            value={kpis.repeatComplaintRate}
            unit="%"
            icon={<Repeat className="w-5 h-5" />}
            trend={3}
            isAlert
            delay={240}
          />
          <KpiCard
            title="超期率"
            value={kpis.overdueRate}
            unit="%"
            icon={<AlertTriangle className="w-5 h-5" />}
            trend={-2}
            isAlert
            delay={320}
          />
        </div>

        <LongestRunningTable />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RepeatHotspots />
          <StaffPerformance />
        </div>

        <ProblemAnalysis />

        <DataQualityReport />
      </div>
    </div>
  );
}
