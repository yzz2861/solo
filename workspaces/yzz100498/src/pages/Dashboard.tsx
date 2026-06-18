import React from 'react';
import Layout from '../components/layout/Layout';
import { KPICard } from '../components/features/KPICard';
import { SalesTrendChart } from '../components/charts/SalesTrendChart';
import { MealTypePieChart } from '../components/charts/MealTypePieChart';
import { WardComparisonChart } from '../components/charts/WardComparisonChart';
import { AlertList } from '../components/features/AlertList';
import { useSalesData } from '../hooks/useSalesData';
import { usePreparation } from '../hooks/usePreparation';
import { useUserStore } from '../store/useUserStore';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { 
  Utensils, TrendingUp, TrendingDown, AlertTriangle, 
  Trash2, Users, Clock, ChefHat, ShoppingCart, 
  Stethoscope, Building2, FileText, Target
} from 'lucide-react';
import { MEAL_TYPE_LABELS, MealType } from '../types';

const Dashboard: React.FC = () => {
  const { currentUser } = useUserStore();
  const { hasAccess } = useRoleAccess();
  const { kpis, trendData, wardComparisonData, mealTypeData } = useSalesData();
  const { riskMatrixData } = usePreparation();
  
  const getRoleSpecificCards = () => {
    const baseCards = [
      {
        title: '今日总销量',
        value: kpis.totalOrders,
        unit: '份',
        trend: 8.5,
        trendType: 'up' as const,
        description: '较昨日',
        icon: <Utensils className="w-6 h-6" />,
        accentColor: '#1976D2',
        roles: ['logistics', 'canteen_manager', 'nurse_station', 'purchaser', 'nurse']
      },
      {
        title: '退餐率',
        value: kpis.refundRate.toFixed(1),
        unit: '%',
        trend: 2.3,
        trendType: 'down' as const,
        description: '较上周',
        icon: <Trash2 className="w-6 h-6" />,
        accentColor: '#f44336',
        roles: ['logistics', 'canteen_manager']
      },
      {
        title: '病区报餐人数',
        value: kpis.totalWardCount,
        unit: '人',
        trend: 3.2,
        trendType: 'up' as const,
        description: '较昨日',
        icon: <Users className="w-6 h-6" />,
        accentColor: '#4CAF50',
        roles: ['logistics', 'canteen_manager', 'nurse_station', 'nurse']
      },
      {
        title: '高风险预警',
        value: riskMatrixData.filter(r => r.wasteRisk === 'high' || r.shortageRisk === 'high').length,
        unit: '项',
        trend: 1,
        trendType: 'down' as const,
        description: '较昨日',
        icon: <AlertTriangle className="w-6 h-6" />,
        accentColor: '#FF9800',
        roles: ['logistics', 'canteen_manager']
      },
      {
        title: '明日预测销量',
        value: kpis.tomorrowForecast,
        unit: '份',
        trend: 5.8,
        trendType: 'up' as const,
        description: '较今日',
        icon: <TrendingUp className="w-6 h-6" />,
        accentColor: '#9C27B0',
        roles: ['logistics', 'canteen_manager', 'purchaser']
      },
      {
        title: '食材成本预估',
        value: (kpis.tomorrowForecast * 15).toLocaleString(),
        unit: '元',
        trend: 4.2,
        trendType: 'up' as const,
        description: '较今日',
        icon: <ShoppingCart className="w-6 h-6" />,
        accentColor: '#00BCD4',
        roles: ['purchaser', 'logistics']
      },
      {
        title: '待核对特殊餐',
        value: kpis.pendingSpecialMeals,
        unit: '份',
        icon: <Stethoscope className="w-6 h-6" />,
        accentColor: '#E91E63',
        roles: ['nurse_station', 'nurse']
      },
      {
        title: '平均备餐偏差',
        value: kpis.avgPreparationVariance.toFixed(1),
        unit: '份',
        trend: 1.5,
        trendType: 'down' as const,
        description: '较上周',
        icon: <Target className="w-6 h-6" />,
        accentColor: '#673AB7',
        roles: ['logistics', 'canteen_manager']
      }
    ];
    
    return baseCards.filter(card => 
      card.roles.includes(currentUser?.role || '')
    );
  };
  
  const displayCards = getRoleSpecificCards();
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">综合驾驶舱</h1>
            <p className="text-gray-500 mt-1">
              欢迎回来，{currentUser?.name} ({currentUser?.roleLabel})
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">数据更新时间</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date('2026-06-18T10:30:00').toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayCards.map((card, index) => (
            <KPICard
              key={index}
              title={card.title}
              value={card.value}
              unit={card.unit}
              trend={card.trend}
              trendType={card.trendType}
              description={card.description}
              icon={card.icon}
              accentColor={card.accentColor}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SalesTrendChart data={trendData} showArea />
          </div>
          <div className="space-y-6">
            <MealTypePieChart data={mealTypeData} />
            {hasAccess(['logistics', 'canteen_manager']) && (
              <AlertList maxItems={5} />
            )}
          </div>
        </div>
        
        {hasAccess(['logistics', 'canteen_manager', 'nurse_station']) && (
          <WardComparisonChart data={wardComparisonData} />
        )}
        
        {hasAccess(['nurse', 'nurse_station']) && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  护士站工作提醒
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Building2 className="w-4 h-4" />
                      今日待上报病区
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {kpis.wardsPendingReport}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <FileText className="w-4 h-4" />
                      明日订餐变化
                    </div>
                    <div className="text-2xl font-bold text-orange-500">
                      {kpis.tomorrowChanges > 0 ? `+${kpis.tomorrowChanges}` : kpis.tomorrowChanges}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Stethoscope className="w-4 h-4" />
                      待核对特殊餐
                    </div>
                    <div className="text-2xl font-bold text-pink-500">
                      {kpis.pendingSpecialMeals}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {hasAccess(['purchaser']) && (
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  采购建议概览
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">明日预计食材</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(kpis.tomorrowForecast * 0.35).toFixed(0)} kg
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">需调整订单</div>
                    <div className="text-2xl font-bold text-orange-500">
                      5
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">预估节省</div>
                    <div className="text-2xl font-bold text-teal-600">
                      ¥{(kpis.tomorrowForecast * 3).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">供应商响应</div>
                    <div className="text-2xl font-bold text-blue-600">
                      8/10
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
