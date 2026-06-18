import React from 'react';
import Layout from '../components/layout/Layout';
import { SpecialMealList } from '../components/features/SpecialMealList';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useDataStore } from '../store/useDataStore';
import { 
  Stethoscope, AlertCircle, CheckCircle, Clock,
  Users, FileText, Info
} from 'lucide-react';

const SpecialMeals: React.FC = () => {
  const { hasAccess } = useRoleAccess();
  const { specialMeals } = useDataStore();
  
  const pendingCount = specialMeals.filter(s => !s.isVerified).length;
  const verifiedCount = specialMeals.filter(s => s.isVerified).length;
  
  const dietaryTypeStats = specialMeals.reduce((acc, sm) => {
    acc[sm.dietaryType] = (acc[sm.dietaryType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dietaryTypeLabels: Record<string, string> = {
    diabetic: '糖尿病餐',
    low_salt: '低盐餐',
    low_fat: '低脂餐',
    soft: '软食',
    liquid: '流质',
    allergy_free: '防过敏',
    other: '其他'
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-pink-600" />
              特殊餐管理
            </h1>
            <p className="text-gray-500 mt-1">
              特殊饮食需求的核对与管理，确保患者饮食安全
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">特殊餐总数</span>
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-pink-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-pink-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {specialMeals.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">份</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">待核对</span>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {pendingCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">份</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">已核对</span>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {verifiedCount}
              </div>
              <div className="text-sm text-gray-500 mt-1">份</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">核对率</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {specialMeals.length > 0 ? ((verifiedCount / specialMeals.length) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-gray-500 mt-1">完成</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Object.entries(dietaryTypeStats).map(([type, count]) => (
            <div key={type} className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="text-xs text-gray-500 mb-1">{dietaryTypeLabels[type]}</div>
              <div className="text-xl font-bold text-gray-800">{count}</div>
            </div>
          ))}
        </div>
        
        {hasAccess(['nurse', 'nurse_station']) && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  护士核对须知
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>核对前请确认患者当前饮食医嘱是否有变更</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>特殊餐需在每日16:00前完成次日核对</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>防过敏餐需特别确认过敏原信息</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>如有疑问请及时与管床医生或营养师沟通</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <SpecialMealList showWardFilter={true} />
      </div>
    </Layout>
  );
};

export default SpecialMeals;
