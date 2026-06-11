import { useComplaintStore } from '@/store/useComplaintStore';
import { FileText, Clock, Users, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function DataQualityReport() {
  const report = useComplaintStore(s => s.cleaningReport);

  if (!report) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-warm-400" />
          <h3 className="font-semibold text-warm-600">数据质量报告</h3>
        </div>
        <p className="text-sm text-warm-400">导入数据后可查看清洗处理详情</p>
      </div>
    );
  }

  const items = [
    {
      icon: Clock,
      label: '时间字段缺失',
      value: report.timeMissing,
      desc: '已自动标记异常工单，建议人工补录',
      color: 'text-orange-500 bg-orange-50',
      hasData: report.timeMissing > 0,
    },
    {
      icon: AlertCircle,
      label: '关闭早于受理',
      value: report.timeInverted,
      desc: '已自动交换时间戳并记录标记',
      color: 'text-accent-500 bg-accent-50',
      hasData: report.timeInverted > 0,
    },
    {
      icon: Users,
      label: '业主多号合并',
      value: report.ownersMerged,
      desc: '同业主不同手机号已合并去重',
      color: 'text-primary-500 bg-primary-50',
      hasData: report.ownersMerged > 0,
    },
    {
      icon: CheckCircle,
      label: '问题类型标准化',
      value: report.typesStandardized,
      desc: '手写描述已匹配到标准分类',
      color: 'text-green-500 bg-green-50',
      hasData: report.typesStandardized > 0,
    },
    {
      icon: AlertTriangle,
      label: '待人工确认类型',
      value: report.typesUnconfirmed,
      desc: '匹配置信度低，需人工复核',
      color: 'text-warm-500 bg-warm-100',
      hasData: report.typesUnconfirmed > 0,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-warm-800">数据质量处理说明</h3>
        </div>
        <div className="text-sm">
          <span className="text-warm-500">共导入 </span>
          <span className="font-bold text-primary-700">{report.totalRows}</span>
          <span className="text-warm-500"> 行，有效 </span>
          <span className="font-bold text-green-600">{report.validRows}</span>
          <span className="text-warm-500"> 行</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`
                p-4 rounded-xl border transition-all duration-200
                ${item.hasData 
                  ? 'border-warm-200 bg-white hover:shadow-md' 
                  : 'border-warm-100 bg-warm-50/50 opacity-70'}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-warm-700">{item.label}</span>
              </div>
              <p className={`text-2xl font-serif font-bold mb-1 ${item.hasData ? 'text-warm-800' : 'text-warm-400'}`}>
                {item.value}
              </p>
              <p className="text-xs text-warm-500 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-4 bg-primary-50/50 rounded-xl border border-primary-100">
        <h4 className="text-sm font-semibold text-primary-700 mb-2">📋 清洗规则说明</h4>
        <ul className="text-xs text-warm-600 space-y-1.5">
          <li>• <strong>时间缺失处理</strong>：受理/响应/关闭时间缺失时标记异常，不参与时长统计，保留工单供人工补录</li>
          <li>• <strong>关闭早于受理</strong>：自动交换受理时间和关闭时间，添加 <code className="bg-warm-200 px-1 rounded">time_inverted</code> 数据质量标记</li>
          <li>• <strong>同一业主不同手机号</strong>：优先用"房号+姓名"去重，其次用"姓名+手机号前缀"，多号码合并到同一业主档案</li>
          <li>• <strong>问题类型标准化</strong>：通过关键词模糊匹配8大标准类型（电梯/给排水/电力照明/噪音扰民/环境卫生/安防门禁/停车管理/绿化养护）</li>
        </ul>
      </div>
    </div>
  );
}
