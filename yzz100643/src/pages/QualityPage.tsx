import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  AlertTriangle, 
  FileText, 
  Users, 
  ArrowRight,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StampBadge from '@/components/ui/StampBadge';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import useArchiveStore from '@/store/useArchiveStore';
import { getFieldLabel } from '@/utils/common';
import type { FieldType } from '@/types';

const QualityPage = () => {
  const navigate = useNavigate();
  const { getCurrentProject, getCurrentRecords, runQualityCheck, setSelectedRecord } = useArchiveStore();
  
  const project = getCurrentProject();
  const records = getCurrentRecords();
  
  const qualityReport = useMemo(() => {
    if (!project) return null;
    return runQualityCheck(project.id);
  }, [project, records, runQualityCheck]);

  if (!project || !qualityReport) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-archive-300" />
            <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
              请先选择项目
            </h3>
            <p className="text-archive-500 mb-6">
              返回首页选择项目进行质量检测
            </p>
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieData = [
    { name: '高置信', value: qualityReport.totalRecords - qualityReport.lowConfidenceRecords, color: '#166534' },
    { name: '低置信', value: qualityReport.lowConfidenceRecords, color: '#d97706' }
  ];

  const barData = Object.entries(qualityReport.lowConfidenceByField).map(([field, count]) => ({
    name: getFieldLabel(field),
    低置信: count,
    总记录: qualityReport.totalRecords,
    avgConfidence: (qualityReport.averageConfidenceByField[field as FieldType] * 100).toFixed(1)
  }));

  const missingPageRecords = records.filter(r => r.hasMissingPage);
  const sameNameRecords = records.filter(r => r.hasSameNameWarning);
  
  const sameNameGroups = useMemo(() => {
    const groups = new Map<string, typeof records>();
    sameNameRecords.forEach(record => {
      const nameField = record.fields.find(f => f.fieldName === 'name');
      const name = nameField?.ocrValue || '未知';
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name)!.push(record);
    });
    return Array.from(groups.entries());
  }, [sameNameRecords]);

  const handleJumpToRecord = (recordId: string) => {
    setSelectedRecord(recordId);
    navigate('/workspace');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-archive-900 mb-1">
            质量检测 - {project.name}
          </h1>
          <p className="text-archive-500 text-sm">
            自动检测低置信字段、疑似缺页和同名人员
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => runQualityCheck(project.id)}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          重新检测
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-archive-500 mb-1">总记录数</p>
                <p className="text-3xl font-bold text-archive-800 font-serif">
                  {qualityReport.totalRecords}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-archive-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-archive-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-archive-500 mb-1">低置信记录</p>
                <p className="text-3xl font-bold text-warning font-serif">
                  {qualityReport.lowConfidenceRecords}
                </p>
                <p className="text-xs text-archive-400 mt-1">
                  占比 {((qualityReport.lowConfidenceRecords / qualityReport.totalRecords) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-archive-500 mb-1">疑似缺页</p>
                <p className="text-3xl font-bold text-error font-serif">
                  {qualityReport.missingPageRecords}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-error" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-archive-500 mb-1">已修正</p>
                <p className="text-3xl font-bold text-success font-serif">
                  {qualityReport.correctedCount}
                </p>
                <p className="text-xs text-archive-400 mt-1">
                  修正率 {(qualityReport.correctionRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">置信度分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">各字段低置信统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="低置信" fill="#d97706" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Object.entries(qualityReport.averageConfidenceByField).map(([field, confidence]) => (
          <Card key={field}>
            <CardContent className="py-4">
              <p className="text-sm font-medium text-archive-700 mb-2">
                {getFieldLabel(field)}
              </p>
              <ConfidenceIndicator confidence={confidence} />
              <p className="text-xs text-archive-500 mt-2">
                低置信: {qualityReport.lowConfidenceByField[field as FieldType]} 条
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-error" />
                疑似缺页记录
              </CardTitle>
              <Badge variant="error">{missingPageRecords.length} 条</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {missingPageRecords.length === 0 ? (
              <div className="text-center py-8 text-archive-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>未检测到疑似缺页</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {missingPageRecords.map(record => {
                  const nameField = record.fields.find(f => f.fieldName === 'name');
                  
                  return (
                    <li 
                      key={record.id}
                      className="p-3 bg-error/5 rounded-lg border border-error/20 hover:bg-error/10 transition-colors cursor-pointer group"
                      onClick={() => handleJumpToRecord(record.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StampBadge status={record.status} size="sm" />
                          <div>
                            <p className="font-medium text-archive-800">
                              {nameField?.correctedValue || nameField?.ocrValue || '未识别姓名'}
                            </p>
                            <p className="text-xs text-error">
                              {record.missingPageReason}
                            </p>
                            <p className="text-xs text-archive-500 mt-1">
                              {record.photoFileName}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-archive-400 group-hover:text-archive-600 transition-colors" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-archive-600" />
                同名人员提醒
              </CardTitle>
              <Badge variant="info">{sameNameGroups.length} 组</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {sameNameGroups.length === 0 ? (
              <div className="text-center py-8 text-archive-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>未检测到同名人员</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {sameNameGroups.map(([name, groupRecords]) => (
                  <li key={name} className="border-b border-archive-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-archive-800">{name}</span>
                        <Badge variant="info" size="sm">{groupRecords.length} 条记录</Badge>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {groupRecords.map(record => {
                        const dateField = record.fields.find(f => f.fieldName === 'date');
                        const numField = record.fields.find(f => f.fieldName === 'documentNumber');
                        const hasDifferentDates = groupRecords.some(r => {
                          const rDate = r.fields.find(f => f.fieldName === 'date');
                          const recDate = dateField?.correctedValue || dateField?.ocrValue;
                          const otherDate = rDate?.correctedValue || rDate?.ocrValue;
                          return recDate && otherDate && recDate !== otherDate;
                        });
                        
                        return (
                          <li 
                            key={record.id}
                            className="p-2 bg-archive-50 rounded hover:bg-archive-100 transition-colors cursor-pointer group"
                            onClick={() => handleJumpToRecord(record.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-archive-700 truncate">
                                  {record.photoFileName}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-archive-500 mt-1">
                                  <span>日期: {dateField?.correctedValue || dateField?.ocrValue || '未识别'}</span>
                                  <span>编号: {numField?.correctedValue || numField?.ocrValue || '未识别'}</span>
                                  {hasDifferentDates && (
                                    <Badge variant="warning" size="sm">日期不同</Badge>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-archive-400 group-hover:text-archive-600 transition-colors shrink-0 ml-2" />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-archive-600" />
              低置信度字段详情
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <ul className="space-y-3">
              {records
                .filter(r => r.fields.some(f => f.isLowConfidence))
                .slice(0, 10)
                .map(record => {
                  const lowConfFields = record.fields.filter(f => f.isLowConfidence);
                  const nameField = record.fields.find(f => f.fieldName === 'name');
                  
                  return (
                    <li 
                      key={record.id}
                      className="p-3 bg-archive-50 rounded-lg hover:bg-archive-100 transition-colors cursor-pointer group"
                      onClick={() => handleJumpToRecord(record.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-archive-800">
                            {nameField?.correctedValue || nameField?.ocrValue || '未识别姓名'}
                          </span>
                          <span className="text-xs text-archive-500">
                            {record.photoFileName}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-archive-400 group-hover:text-archive-600 transition-colors" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lowConfFields.map(field => (
                          <div key={field.id} className="flex items-center gap-1">
                            <Badge variant="warning" size="sm">
                              {getFieldLabel(field.fieldName)}
                            </Badge>
                            <span className="text-xs text-archive-500">
                              {field.ocrValue || '未识别'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-archive-600" />
              处理进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-archive-700">总体进度</span>
                  <span className="text-sm font-medium text-archive-800">
                    {qualityReport.correctedCount} / {qualityReport.totalRecords}
                  </span>
                </div>
                <div className="h-3 bg-archive-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-archive-600 to-archive-800 rounded-full transition-all duration-500"
                    style={{ width: `${(qualityReport.correctedCount / qualityReport.totalRecords) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {(['pending', 'reviewing', 'corrected', 'approved'] as const).map(status => {
                  const count = records.filter(r => r.status === status).length;
                  const labels: Record<string, string> = {
                    pending: '待校对',
                    reviewing: '校对中',
                    corrected: '已修正',
                    approved: '已通过'
                  };
                  const colors: Record<string, string> = {
                    pending: 'bg-archive-300',
                    reviewing: 'bg-warning',
                    corrected: 'bg-archive-500',
                    approved: 'bg-success'
                  };
                  
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-archive-600">{labels[status]}</span>
                        <span className="text-sm text-archive-500">{count} 条</span>
                      </div>
                      <div className="h-2 bg-archive-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[status]} rounded-full transition-all duration-500`}
                          style={{ width: `${(count / records.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-archive-100">
                <p className="text-sm text-archive-500 mb-3">建议操作</p>
                <div className="space-y-2">
                  {qualityReport.lowConfidenceRecords > 0 && (
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start"
                      onClick={() => navigate('/inspection')}
                      leftIcon={<Target className="w-4 h-4" />}
                    >
                      生成智能抽检清单
                    </Button>
                  )}
                  {qualityReport.correctedCount > 0 && (
                    <Button 
                      className="w-full justify-start"
                      onClick={() => navigate('/export')}
                      leftIcon={<TrendingUp className="w-4 h-4" />}
                    >
                      导出已处理数据
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QualityPage;
