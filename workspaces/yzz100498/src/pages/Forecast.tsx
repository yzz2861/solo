import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { ForecastChart } from '../components/charts/ForecastChart';
import { useForecast } from '../hooks/useForecast';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Progress } from '../components/ui/Progress';
import { Select } from '../components/ui/Select';
import { 
  TrendingUp, Calendar, ShoppingCart, Download, 
  AlertCircle, CheckCircle, Clock, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { MEAL_TYPE_LABELS, MealType } from '../types';
import { formatDate } from '../utils/dateUtils';

const Forecast: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const { 
    forecastData, 
    ingredientDemands,
    wardForecastData,
    historicalData,
    tomorrowChanges
  } = useForecast();
  
  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  
  const filteredIngredientDemands = ingredientDemands.filter(item => {
    if (selectedMealType !== 'all' && item.mealType !== selectedMealType) return false;
    return true;
  });
  
  const getTrendIcon = (change: number) => {
    if (change > 5) return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    if (change < -5) return <ArrowDownRight className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };
  
  const getTrendColor = (change: number) => {
    if (change > 10) return 'text-red-600';
    if (change > 5) return 'text-orange-600';
    if (change < -10) return 'text-green-600';
    if (change < -5) return 'text-teal-600';
    return 'text-gray-600';
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-purple-600" />
              预测分析
            </h1>
            <p className="text-gray-500 mt-1">
              基于历史数据的销量预测和食材需求分析
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              导出采购单
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">明日预测销量</span>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {forecastData.forecastQuantity}
              </div>
              <div className="text-sm text-gray-500 mt-1">份</div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <ArrowUpRight className="w-4 h-4 text-red-500" />
                <span className="text-red-500">+5.8%</span>
                <span className="text-gray-400">较今日</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">预测准确率</span>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                92.5%
              </div>
              <div className="text-sm text-gray-500 mt-1">近7天平均</div>
              <Progress value={92.5} max={100} variant="success" className="mt-3" />
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">明日变化病区</span>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {tomorrowChanges.filter(c => Math.abs(c.changePercentage) >= 5).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">个病区</div>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-red-500">↑{tomorrowChanges.filter(c => c.changePercentage > 5).length} 增加</span>
                <span className="text-green-500">↓{tomorrowChanges.filter(c => c.changePercentage < -5).length} 减少</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">预估食材成本</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ¥{(forecastData.forecastQuantity * 15).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">元</div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <ArrowUpRight className="w-4 h-4 text-orange-500" />
                <span className="text-orange-500">+4.2%</span>
                <span className="text-gray-400">较今日</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <ForecastChart 
          historicalData={historicalData} 
          forecastData={forecastData}
          title="整体销量预测"
        />
        
        {hasAccess(['nurse_station', 'nurse']) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                明日订餐变化（护士站关注）
              </CardTitle>
              <Badge variant="info">
                预测时间: {new Date('2026-06-18T20:00:00').toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>病区</TableHead>
                      <TableHead>今日实际</TableHead>
                      <TableHead>明日预测</TableHead>
                      <TableHead>变化量</TableHead>
                      <TableHead>变化率</TableHead>
                      <TableHead>主要原因</TableHead>
                      <TableHead>置信度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tomorrowChanges.filter(c => Math.abs(c.changePercentage) >= 3).map(item => (
                      <TableRow key={item.wardId}>
                        <TableCell className="font-medium">{item.wardName}</TableCell>
                        <TableCell className="text-center font-mono">{item.todayActual}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-blue-600">{item.tomorrowForecast}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-bold ${item.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.change > 0 ? '+' : ''}{item.change}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(item.changePercentage)}
                            <span className={`font-mono font-bold ${getTrendColor(item.changePercentage)}`}>
                              {item.changePercentage > 0 ? '+' : ''}{item.changePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {item.reason}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={item.confidence} max={100} variant="info" className="w-20" />
                            <span className="text-xs text-gray-500">{item.confidence}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">护士站操作建议</h4>
                    <p className="text-sm text-blue-700">
                      请重点关注以上病区的订餐变化，提前与患者家属沟通确认，减少临时退餐。
                      对于预计减少超过10%的病区，建议在下午16:00前确认是否有批量出院情况。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {hasAccess(['purchaser', 'logistics', 'canteen_manager']) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                食材需求预测
              </CardTitle>
              <div className="flex items-center gap-3">
                <Select
                  options={[
                    { value: 'all', label: '全部餐次' },
                    ...(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(t => ({
                      value: t,
                      label: MEAL_TYPE_LABELS[t]
                    }))
                  ]}
                  value={selectedMealType}
                  onChange={(v) => setSelectedMealType(String(v) as MealType | 'all')}
                  className="w-32"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>食材名称</TableHead>
                      <TableHead>餐次</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>历史均值</TableHead>
                      <TableHead>预测需求</TableHead>
                      <TableHead>安全库存</TableHead>
                      <TableHead>建议采购</TableHead>
                      <TableHead>现有库存</TableHead>
                      <TableHead>缺口</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIngredientDemands.map(item => (
                      <TableRow key={`${item.ingredientId}-${item.mealType}`}>
                        <TableCell className="font-medium">{item.ingredientName}</TableCell>
                        <TableCell>
                          <Badge variant="default">{MEAL_TYPE_LABELS[item.mealType]}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.unit}</TableCell>
                        <TableCell className="text-center font-mono text-gray-500">{item.historicalUsage}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-blue-600">{item.forecastUsage}</TableCell>
                        <TableCell className="text-center font-mono text-orange-500">+{item.safetyStock}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-green-600 text-lg">
                          {item.suggestedPurchase}
                        </TableCell>
                        <TableCell className="text-center font-mono text-gray-500">{item.currentStock}</TableCell>
                        <TableCell className="text-center">
                          {item.shortage > 0 ? (
                            <Badge variant="danger">
                              缺 {item.shortage} {item.unit}
                            </Badge>
                          ) : (
                            <Badge variant="success">
                              充足
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-500 mb-1">预估食材总量</div>
                  <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {(forecastData.forecastQuantity * 0.35).toFixed(0)} kg
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-sm text-gray-500 mb-1">缺货预警</div>
                  <div className="text-2xl font-bold text-red-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {filteredIngredientDemands.filter(i => i.shortage > 0).length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">种食材需要补货</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-sm text-gray-500 mb-1">预估节省</div>
                  <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    ¥{(forecastData.forecastQuantity * 3).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">相比人工备餐</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Forecast;
