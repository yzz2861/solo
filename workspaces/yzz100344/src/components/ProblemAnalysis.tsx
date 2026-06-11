import { useComplaintStore } from '@/store/useComplaintStore';
import { getProblemTypeDistribution, getSourceDistribution, getTypeSourceMatrix } from '@/utils/metrics';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { PieChart as PieChartIcon, GitBranch, Grid3x3 } from 'lucide-react';

const PIE_COLORS = ['#1e3a5f', '#5e8ab8', '#ae8d6e', '#ff6b6b', '#3d6ca0', '#8eaecf', '#c1a78c', '#2d5584'];

export default function ProblemAnalysis() {
  const complaints = useComplaintStore(s => s.getFilteredComplaints());

  const typeData = getProblemTypeDistribution(complaints);
  const sourceData = getSourceDistribution(complaints);
  const matrixData = getTypeSourceMatrix(complaints);

  const typeSourceChart = [
    { type: '电梯问题', ...Object.fromEntries(['电话', '业主群', '工单系统', '其他'].map(s => [s, 0])) },
    { type: '给排水问题', ...Object.fromEntries(['电话', '业主群', '工单系统', '其他'].map(s => [s, 0])) },
    { type: '噪音扰民', ...Object.fromEntries(['电话', '业主群', '工单系统', '其他'].map(s => [s, 0])) },
    { type: '电力照明', ...Object.fromEntries(['电话', '业主群', '工单系统', '其他'].map(s => [s, 0])) },
    { type: '环境卫生', ...Object.fromEntries(['电话', '业主群', '工单系统', '其他'].map(s => [s, 0])) },
  ];

  for (const item of matrixData) {
    const row = typeSourceChart.find(r => r.type === item.type);
    if (row && row.hasOwnProperty(item.source)) {
      (row as any)[item.source] = item.count;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <PieChartIcon className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">问题类型分布</h3>
            <p className="text-xs text-warm-500 mt-0.5">标准化后各类型工单占比</p>
          </div>
        </div>
        <div className="p-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 条`, '工单数']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {typeData.slice(0, 6).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-warm-600 flex-1 truncate">{item.name}</span>
                <span className="font-mono text-warm-700 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-warm-200 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-warm-700" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">投诉来源分布</h3>
            <p className="text-xs text-warm-500 mt-0.5">电话、业主群、工单系统渠道对比</p>
          </div>
        </div>
        <div className="p-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
                <XAxis type="number" tick={{ fill: '#6d5347', fontSize: 12 }} axisLine={{ stroke: '#d6c6b2' }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#6d5347', fontSize: 12 }} width={70} axisLine={{ stroke: '#d6c6b2' }} />
                <Tooltip formatter={(value: number) => [`${value} 条`, '工单数']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {sourceData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-around mt-2">
            {sourceData.map((item) => (
              <div key={item.name} className="text-center">
                <p className="text-lg font-serif font-bold text-primary-700">{item.value}</p>
                <p className="text-xs text-warm-500">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <div className="px-5 py-4 border-b border-warm-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Grid3x3 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">问题类型 × 来源 交叉矩阵</h3>
            <p className="text-xs text-warm-500 mt-0.5">各问题类型在不同来源渠道的分布情况</p>
          </div>
        </div>
        <div className="p-5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeSourceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
                <XAxis dataKey="type" tick={{ fill: '#6d5347', fontSize: 11 }} axisLine={{ stroke: '#d6c6b2' }} />
                <YAxis tick={{ fill: '#6d5347', fontSize: 12 }} axisLine={{ stroke: '#d6c6b2' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="电话" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
                <Bar dataKey="业主群" stackId="a" fill="#5e8ab8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="工单系统" stackId="a" fill="#ae8d6e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="其他" stackId="a" fill="#c1a78c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
