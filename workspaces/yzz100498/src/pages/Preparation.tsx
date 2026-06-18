import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { RiskMatrixChart } from '../components/charts/RiskMatrixChart';
import { usePreparation } from '../hooks/usePreparation';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Progress } from '../components/ui/Progress';
import { Select } from '../components/ui/Select';
import { 
  ChefHat, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Download, CheckCircle, Clock, Trash2
} from 'lucide-react';
import { PreparationSuggestion, MEAL_TYPE_LABELS, RISK_COLORS, RISK_LABELS } from '../types';
import { formatDate } from '../utils/dateUtils';

const Preparation: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const { 
    preparationSuggestions, 
    riskMatrixData,
    riskSummary,
    mealTypeSummary
  } = usePreparation();
  
  const [selectedDate, setSelectedDate] = useState(
    formatDate(new Date('2026-06-19').toISOString().split('T')[0])
  );
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterWard, setFilterWard] = useState<string>('all');
  
  const filteredSuggestions = preparationSuggestions.filter(s => {
    if (filterRisk !== 'all' && s.wasteRisk !== filterRisk && s.shortageRisk !== filterRisk) return false;
    if (filterWard !== 'all' && s.wardId !== filterWard) return false;
    return true;
  });
  
  const getRiskBadge = (risk: string) => {
    const variant = risk === 'low' ? 'success' : risk === 'medium' ? 'warning' : 'danger';
    return (
      <Badge variant={variant as any}>
        {RISK_LABELS[risk as keyof typeof RISK_LABELS]}风险
      </Badge>
    );
  };
  
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-green-600" />
              备餐建议
            </h1>
            <p className="text-gray-500 mt-1">
              智能推荐各病区各餐次的备餐数量，降低浪费和缺餐风险
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">备餐日期：</span>
              <Select
                options={[
                  { value: '2026-06-19', label: formatDate('2026-06-19') },
                  { value: '2026-06-20', label: formatDate('2026-06-20') },
                  { value: '2026-06-21', label: formatDate('2026-06-21') }
                ]}
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              导出备餐单
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">建议备餐总量</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSummary.totalSuggestion}
              </div>
              <div className="text-sm text-gray-500 mt-1">份</div>
              <Progress value={riskSummary.totalSuggestion} max={1500} variant="info" className="mt-3" />
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">低风险病区</span>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSummary.lowRisk}
              </div>
              <div className="text-sm text-gray-500 mt-1">个病区</div>
              <Progress value={riskSummary.lowRisk} max={8} variant="success" className="mt-3" />
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">中风险病区</span>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSummary.mediumRisk}
              </div>
              <div className="text-sm text-gray-500 mt-1">个病区</div>
              <Progress value={riskSummary.mediumRisk} max={8} variant="warning" className="mt-3" />
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">高风险病区</span>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-red-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSummary.highRisk}
              </div>
              <div className="text-sm text-gray-500 mt-1">个病区</div>
              <Progress value={riskSummary.highRisk} max={8} variant="danger" className="mt-3" />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>各餐次备餐汇总</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(mealTypeSummary).map(([type, data]) => (
                    <div key={type} className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-sm text-gray-500 mb-2">
                        {MEAL_TYPE_LABELS[type as keyof typeof MEAL_TYPE_LABELS]}
                      </div>
                      <div className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {data.suggested} 份
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          预计浪费: <span className="text-orange-600 font-medium">{data.estimatedWaste} 份</span>
                        </span>
                        <span className="text-gray-500">
                          缺餐风险: <span className="text-red-600 font-medium">{data.shortageRisk}</span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {getTrendIcon(data.trend)}
                        <span className="text-xs text-gray-500">
                          较昨日 {data.trend > 0 ? '+' : ''}{data.trend}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <RiskMatrixChart data={riskMatrixData} />
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>各病区备餐明细</CardTitle>
            <div className="flex items-center gap-3">
              <Select
                options={[
                  { value: 'all', label: '全部风险' },
                  { value: 'high', label: '高风险' },
                  { value: 'medium', label: '中风险' },
                  { value: 'low', label: '低风险' }
                ]}
                value={filterRisk}
                onChange={setFilterRisk}
                className="w-32"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>病区</TableHead>
                    <TableHead>餐次</TableHead>
                    <TableHead>报餐人数</TableHead>
                    <TableHead>历史均值</TableHead>
                    <TableHead>建议备餐</TableHead>
                    <TableHead>安全库存</TableHead>
                    <TableHead>浪费风险</TableHead>
                    <TableHead>缺餐风险</TableHead>
                    {hasAccess(['canteen_manager']) && <TableHead>操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuggestions.map((suggestion: PreparationSuggestion) => (
                    <TableRow key={`${suggestion.wardId}-${suggestion.mealType}`}>
                      <TableCell className="font-medium">
                        {suggestion.wardName}
                      </TableCell>
                      <TableCell>
                        {MEAL_TYPE_LABELS[suggestion.mealType]}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">{suggestion.wardCount}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-gray-500">{suggestion.historicalAverage}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-blue-600 text-lg">
                          {suggestion.suggestedQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-orange-600">+{suggestion.safetyStock}</span>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="px-2 py-1 rounded-full text-xs font-medium text-center"
                          style={{ 
                            backgroundColor: RISK_COLORS[suggestion.wasteRisk] + '20',
                            color: RISK_COLORS[suggestion.wasteRisk]
                          }}
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          {RISK_LABELS[suggestion.wasteRisk]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="px-2 py-1 rounded-full text-xs font-medium text-center"
                          style={{ 
                            backgroundColor: RISK_COLORS[suggestion.shortageRisk] + '20',
                            color: RISK_COLORS[suggestion.shortageRisk]
                          }}
                        >
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {RISK_LABELS[suggestion.shortageRisk]}
                        </div>
                      </TableCell>
                      {hasAccess(['canteen_manager']) && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary">确认</Button>
                            <Button size="sm" variant="outline">调整</Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Preparation;
