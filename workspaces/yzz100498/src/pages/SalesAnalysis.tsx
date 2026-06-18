import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { SalesTrendChart } from '../components/charts/SalesTrendChart';
import { WardComparisonChart } from '../components/charts/WardComparisonChart';
import { MealTypePieChart } from '../components/charts/MealTypePieChart';
import { WardFilter } from '../components/features/WardFilter';
import { DateRangeFilter } from '../components/features/DateRangeFilter';
import { MealTypeFilter } from '../components/features/MealTypeFilter';
import { useSalesData } from '../hooks/useSalesData';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { 
  BarChart3, Filter, Download, AlertCircle, 
  Clock, Users, Repeat, Calendar as CalendarIcon
} from 'lucide-react';
import { Order } from '../types';
import { formatDate } from '../utils/dateUtils';

const SalesAnalysis: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const { 
    trendData, 
    wardComparisonData, 
    mealTypeData,
    salesData,
    anomalyOrders
  } = useSalesData();
  
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [showAnomaly, setShowAnomaly] = useState(false);
  
  const displayOrders = showAnomaly ? anomalyOrders : salesData.flatMap(s => s.orders);
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              销量分析
            </h1>
            <p className="text-gray-500 mt-1">
              多维度分析病区、餐次和日期的销量数据
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chart' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                图表视图
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                明细视图
              </button>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              导出报告
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DateRangeFilter />
              <WardFilter />
              <MealTypeFilter />
            </div>
          </CardContent>
        </Card>
        
        {hasAccess(['logistics', 'canteen_manager']) && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAnomaly(!showAnomaly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showAnomaly 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              异常订单 ({anomalyOrders.length})
            </button>
            {showAnomaly && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Repeat className="w-3 h-3" /> 重复订餐
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 跨午夜
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> 节假日
                </span>
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'chart' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesTrendChart data={trendData} title="销量趋势分析" />
              </div>
              <div>
                <MealTypePieChart data={mealTypeData} title="餐次结构占比" />
              </div>
            </div>
            
            <WardComparisonChart data={wardComparisonData} title="各病区销量对比" />
          </>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {showAnomaly ? '异常订单明细' : '订餐记录明细'}
              </CardTitle>
              <div className="text-sm text-gray-500">
                共 {displayOrders.length} 条记录
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>病区</TableHead>
                      <TableHead>家属姓名</TableHead>
                      <TableHead>餐次</TableHead>
                      <TableHead>餐品</TableHead>
                      <TableHead>状态</TableHead>
                      {showAnomaly && <TableHead>异常标识</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayOrders.slice(0, 20).map((order: Order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm font-mono text-gray-500">
                          {order.id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(order.orderDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.wardName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.familyMemberName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.mealTypeLabel}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {order.mealName}
                        </TableCell>
                        <TableCell>
                          {order.status === 'refunded' ? (
                            <Badge variant="danger">已退餐</Badge>
                          ) : (
                            <Badge variant="success">已完成</Badge>
                          )}
                        </TableCell>
                        {showAnomaly && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {order.flags?.isDuplicate && (
                                <Badge variant="warning" dot>
                                  <Repeat className="w-3 h-3 mr-1" />
                                  重复订餐
                                </Badge>
                              )}
                              {order.flags?.isCrossMidnight && (
                                <Badge variant="info" dot>
                                  <Clock className="w-3 h-3 mr-1" />
                                  跨午夜
                                </Badge>
                              )}
                              {order.flags?.isHoliday && (
                                <Badge variant="default" dot>
                                  <CalendarIcon className="w-3 h-3 mr-1" />
                                  节假日
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {displayOrders.length > 20 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm">
                    加载更多 ({displayOrders.length - 20} 条)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {hasAccess(['logistics', 'canteen_manager']) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                特殊场景说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    病人出院退餐
                  </h4>
                  <p className="text-sm text-blue-700">
                    退餐原因为"病人出院"的订单占退餐总量的 <span className="font-bold">42%</span>，
                    主要集中在上午办理出院时段，建议在每日早会时确认预计出院人数。
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    家属重复订餐
                  </h4>
                  <p className="text-sm text-purple-700">
                    同一家属在同一餐次重复订餐占比 <span className="font-bold">3.8%</span>，
                    已优化订餐界面提示，较上月下降 1.2 个百分点。
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    病区临时封控
                  </h4>
                  <p className="text-sm text-red-700">
                    本月发生 2 起病区临时封控事件，导致退餐 86 份，
                    建议建立封控应急预案，提前与食堂沟通。
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    餐次跨午夜
                  </h4>
                  <p className="text-sm text-orange-700">
                    夜班餐次（22:00-02:00）存在跨午夜情况，占总订单的 <span className="font-bold">8.5%</span>，
                    已优化日期归属逻辑，确保统计准确。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SalesAnalysis;
