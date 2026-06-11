import { useComplaintStore } from '@/store/useComplaintStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Award } from 'lucide-react';
import clsx from 'clsx';

export default function StaffPerformance() {
  const staffList = useComplaintStore(s => s.getStaffPerformance());

  if (staffList.length === 0) {
    return (
      <div className="card p-8 text-center text-warm-400">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无管家绩效数据</p>
      </div>
    );
  }

  const chartData = staffList.map(s => ({
    name: s.name.replace('管家', ''),
    平均响应时长: s.avgResponseHours,
    平均关闭时长: s.avgCloseHours,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-primary-700 bg-primary-100';
    if (score >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-accent-600 bg-accent-100';
  };

  const getOverdueRateBg = (rate: number) => {
    if (rate <= 5) return 'bg-green-100';
    if (rate <= 15) return 'bg-yellow-100';
    if (rate <= 30) return 'bg-orange-100';
    return 'bg-accent-100';
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-800">各管家处理情况</h3>
            <p className="text-xs text-warm-500 mt-0.5">响应时长、关闭时长对比与绩效排名</p>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="h-64 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd4" />
              <XAxis dataKey="name" tick={{ fill: '#6d5347', fontSize: 12 }} axisLine={{ stroke: '#d6c6b2' }} />
              <YAxis tick={{ fill: '#6d5347', fontSize: 12 }} axisLine={{ stroke: '#d6c6b2' }} label={{ value: '小时', angle: -90, position: 'insideLeft', fill: '#6d5347', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e8dfd4',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value} 小时`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="平均响应时长" fill="#5e8ab8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="平均关闭时长" fill="#ae8d6e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2.5 text-left">排名</th>
                <th className="px-3 py-2.5 text-left">管家</th>
                <th className="px-3 py-2.5 text-right">工单数</th>
                <th className="px-3 py-2.5 text-right">平均响应</th>
                <th className="px-3 py-2.5 text-right">平均关闭</th>
                <th className="px-3 py-2.5 text-right">超期率</th>
                <th className="px-3 py-2.5 text-right">绩效分</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff, idx) => (
                <tr key={staff.id} className="table-row">
                  <td className="px-3 py-3">
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                      idx === 1 ? 'bg-warm-300 text-warm-800' :
                      idx === 2 ? 'bg-orange-300 text-orange-900' :
                      'bg-warm-100 text-warm-500'
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                        {staff.name.charAt(0)}
                      </div>
                      <span className="font-medium text-warm-800">{staff.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-warm-700">{staff.totalCount}</td>
                  <td className="px-3 py-3 text-right font-mono text-warm-700">{staff.avgResponseHours}h</td>
                  <td className="px-3 py-3 text-right font-mono text-warm-700">{staff.avgCloseHours}h</td>
                  <td className="px-3 py-3 text-right">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      getOverdueRateBg(staff.overdueRate)
                    )}>
                      {staff.overdueRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                      getScoreColor(staff.performanceScore)
                    )}>
                      <Award className="w-3 h-3" />
                      {staff.performanceScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
