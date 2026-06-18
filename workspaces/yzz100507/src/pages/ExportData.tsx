import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  FileBarChart,
  Download,
  Users,
  Package,
  MapPin,
  AlertTriangle,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function ExportData() {
  const {
    riggers,
    supplyItems,
    supplyRecords,
    checkinRecords,
    rescueRecords,
    getRoutePointsOrdered,
    supplyPoints,
    currentActivityId,
    getCurrentActivity,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'supply' | 'riders' | 'rescue'>('overview');
  const routePoints = getRoutePointsOrdered();
  const activity = getCurrentActivity();

  const dropReasons = rescueRecords
    .filter((r) => r.type === 'drop')
    .reduce((acc, r) => {
      const reason = r.description.split('，')[0] || '其他';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const dropReasonData = Object.entries(dropReasons).map(([name, value]) => ({ name, value }));

  const supplyUsageData = supplyItems.map((item) => ({
    name: item.name,
    used: item.initialQuantity - item.quantity,
    remaining: item.quantity,
  }));

  const checkinByPointData = routePoints.map((point) => {
    const checkins = checkinRecords.filter((c) => c.routePointId === point.id);
    const uniqueRiders = new Set(checkins.map((c) => c.riggerId)).size;
    return {
      name: point.name.split('：')[1] || point.name,
      签到人数: uniqueRiders,
      签到次数: checkins.length,
    };
  });

  const riderStatusData = [
    { name: '已完成', value: riggers.filter((r) => r.status === 'finished').length, color: '#14b8a6' },
    { name: '进行中', value: riggers.filter((r) => r.status === 'active').length, color: '#22c55e' },
    { name: '已退赛', value: riggers.filter((r) => r.status === 'dropped').length, color: '#ef4444' },
    { name: '已救援', value: riggers.filter((r) => r.status === 'rescued').length, color: '#f59e0b' },
  ];

  const totalSupplyUsed = supplyItems.reduce(
    (sum, item) => sum + (item.initialQuantity - item.quantity),
    0
  );
  const totalSupplyInitial = supplyItems.reduce((sum, item) => sum + item.initialQuantity, 0);

  const exportCSV = (filename: string, content: string) => {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportRidersCSV = () => {
    const headers = ['姓名', '电话', '分组', '状态', '退赛原因', '健康注意事项', '紧急联系人', '当前点位', '最后签到时间'];
    const rows = riggers.map((r) => {
      const point = routePoints.find((p) => p.id === r.currentPointId);
      return [
        r.name,
        r.phone,
        r.group || '',
        r.status === 'active' ? '进行中' : r.status === 'finished' ? '已完成' : r.status === 'dropped' ? '已退赛' : '已救援',
        r.dropReason || '',
        r.healthNotes || '',
        r.emergencyContact || '',
        point?.name || '',
        r.lastCheckinTime ? new Date(r.lastCheckinTime).toLocaleString('zh-CN') : '',
      ].join(',');
    });
    exportCSV('队员名单.csv', [headers.join(','), ...rows].join('\n'));
  };

  const exportSupplyCSV = () => {
    const headers = ['补给点', '物资名称', '分类', '初始数量', '剩余数量', '已使用', '单位'];
    const rows = supplyItems.map((item) => {
      const point = supplyPoints.find((sp) => sp.id === item.supplyPointId);
      const categoryMap: Record<string, string> = {
        water: '饮用水',
        energy: '能量补给',
        food: '食物',
        medical: '医疗用品',
        other: '其他',
      };
      return [
        point?.name || '',
        item.name,
        categoryMap[item.category] || item.category,
        item.initialQuantity,
        item.quantity,
        item.initialQuantity - item.quantity,
        item.unit,
      ].join(',');
    });
    exportCSV('物资使用统计.csv', [headers.join(','), ...rows].join('\n'));
  };

  const exportCheckinCSV = () => {
    const headers = ['队员', '点位', '签到时间', '是否重复', '备注'];
    const rows = checkinRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((c) => {
        const rider = riggers.find((r) => r.id === c.riggerId);
        const point = routePoints.find((p) => p.id === c.routePointId);
        return [
          rider?.name || '',
          point?.name || '',
          new Date(c.timestamp).toLocaleString('zh-CN'),
          c.isDuplicate ? '是' : '否',
          c.note || '',
        ].join(',');
      });
    exportCSV('签到记录.csv', [headers.join(','), ...rows].join('\n'));
  };

  const exportRescueCSV = () => {
    const headers = ['队员', '类型', '状态', '位置', '描述', '提交时间', '处理结果', '解决时间'];
    const rows = rescueRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((r) => {
        const rider = riggers.find((rg) => rg.id === r.riggerId);
        const typeMap: Record<string, string> = { help: '求助', rescue: '救援', drop: '退赛' };
        const statusMap: Record<string, string> = {
          pending: '待处理',
          processing: '处理中',
          resolved: '已解决',
        };
        return [
          rider?.name || '',
          typeMap[r.type] || r.type,
          statusMap[r.status] || r.status,
          r.location || '',
          r.description,
          new Date(r.timestamp).toLocaleString('zh-CN'),
          r.resolution || '',
          r.resolvedAt ? new Date(r.resolvedAt).toLocaleString('zh-CN') : '',
        ].join(',');
      });
    exportCSV('求助救援记录.csv', [headers.join(','), ...rows].join('\n'));
  };

  const exportAllData = () => {
    exportRidersCSV();
    setTimeout(exportSupplyCSV, 200);
    setTimeout(exportCheckinCSV, 400);
    setTimeout(exportRescueCSV, 600);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileBarChart className="w-7 h-7 text-primary-600" />
            数据导出与复盘
          </h1>
          <p className="text-gray-500 mt-1">{activity?.name} · 活动数据统计</p>
        </div>
        <button onClick={exportAllData} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出全部数据
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">参与队员</p>
              <p className="text-2xl font-bold text-gray-900">{riggers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">物资消耗</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalSupplyUsed}<span className="text-sm text-gray-400">/{totalSupplyInitial}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">完成率</p>
              <p className="text-2xl font-bold text-green-600">
                {riggers.length > 0
                  ? ((riggers.filter((r) => r.status === 'finished').length / riggers.length) * 100).toFixed(0)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">退赛人数</p>
              <p className="text-2xl font-bold text-red-600">
                {riggers.filter((r) => r.status === 'dropped' || r.status === 'rescued').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(['overview', 'supply', 'riders', 'rescue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' && '总览'}
            {tab === 'supply' && '物资使用'}
            {tab === 'riders' && '队员表现'}
            {tab === 'rescue' && '退赛分析'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">各点位签到人数</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkinByPointData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="签到人数" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">队员状态分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supply' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">物资使用情况</h3>
            <button onClick={exportSupplyCSV} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplyUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="已使用" stackId="a" fill="#f59e0b" />
                <Bar dataKey="剩余" stackId="a" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'riders' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">队员完成情况</h3>
            <button onClick={exportRidersCSV} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
              <Download className="w-4 h-4" />
              导出名单
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto scrollbar-thin">
            {riggers
              .sort((a, b) => {
                const order = { finished: 0, active: 1, rescued: 2, dropped: 3 };
                return order[a.status] - order[b.status];
              })
              .map((rider) => {
                const riderCheckins = checkinRecords.filter((c) => c.riggerId === rider.id).length;
                const currentPoint = routePoints.find((p) => p.id === rider.currentPointId);
                const progress = currentPoint
                  ? (currentPoint.distance / (routePoints[routePoints.length - 1]?.distance || 1)) * 100
                  : 0;

                return (
                  <div key={rider.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          rider.avatarColor || 'bg-gray-400'
                        }`}
                      >
                        {rider.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{rider.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              rider.status === 'finished'
                                ? 'bg-green-100 text-green-700'
                                : rider.status === 'active'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {rider.status === 'finished'
                              ? '已完成'
                              : rider.status === 'active'
                              ? '进行中'
                              : rider.status === 'dropped'
                              ? '已退赛'
                              : '已救援'}
                          </span>
                          {rider.needsAttention && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              重点关注
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rider.status === 'finished'
                                  ? 'bg-green-500'
                                  : rider.status === 'dropped' || rider.status === 'rescued'
                                  ? 'bg-red-400'
                                  : 'bg-primary-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-16 text-right">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">签到 {riderCheckins} 次</p>
                        {rider.dropReason && (
                          <p className="text-xs text-gray-400 mt-1 max-w-[150px] truncate">
                            {rider.dropReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeTab === 'rescue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">退赛原因分布</h3>
              <button onClick={exportRescueCSV} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
                <Download className="w-4 h-4" />
                导出记录
              </button>
            </div>
            {dropReasonData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dropReasonData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {dropReasonData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无退赛记录</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">复盘要点</h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="font-medium text-green-800">完成情况</p>
                <p className="text-sm text-green-700 mt-1">
                  {riggers.filter((r) => r.status === 'finished').length} 人完成全程，
                  完成率{' '}
                  {riggers.length > 0
                    ? ((riggers.filter((r) => r.status === 'finished').length / riggers.length) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="font-medium text-amber-800">物资消耗</p>
                <p className="text-sm text-amber-700 mt-1">
                  共消耗 {totalSupplyUsed} 件物资，消耗率{' '}
                  {totalSupplyInitial > 0
                    ? ((totalSupplyUsed / totalSupplyInitial) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="font-medium text-red-800">退赛情况</p>
                <p className="text-sm text-red-700 mt-1">
                  {rescueRecords.filter((r) => r.type === 'drop').length} 人退赛，
                  主要原因：{dropReasonData[0]?.name || '无数据'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="font-medium text-blue-800">建议</p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                  <li>增加二号补给点能量胶库存</li>
                  <li>加强爆胎应急培训</li>
                  <li>关注重点队员健康状况</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">快速导出</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={exportRidersCSV}
            className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
          >
            <Users className="w-8 h-8 text-primary-600 mb-2" />
            <p className="font-medium text-gray-900">队员名单</p>
            <p className="text-xs text-gray-500 mt-1">CSV 格式</p>
          </button>
          <button
            onClick={exportSupplyCSV}
            className="p-4 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all text-left"
          >
            <Package className="w-8 h-8 text-amber-600 mb-2" />
            <p className="font-medium text-gray-900">物资统计</p>
            <p className="text-xs text-gray-500 mt-1">CSV 格式</p>
          </button>
          <button
            onClick={exportCheckinCSV}
            className="p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left"
          >
            <MapPin className="w-8 h-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">签到记录</p>
            <p className="text-xs text-gray-500 mt-1">CSV 格式</p>
          </button>
          <button
            onClick={exportRescueCSV}
            className="p-4 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all text-left"
          >
            <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
            <p className="font-medium text-gray-900">求助救援</p>
            <p className="text-xs text-gray-500 mt-1">CSV 格式</p>
          </button>
        </div>
      </div>
    </div>
  );
}
