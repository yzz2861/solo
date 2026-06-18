import React from 'react';
import { Check, X, AlertCircle, Clock, User, Building } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useUserStore } from '../../store/useUserStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { SpecialMeal } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface SpecialMealListProps {
  maxItems?: number;
  showWardFilter?: boolean;
}

export const SpecialMealList: React.FC<SpecialMealListProps> = ({ 
  maxItems,
  showWardFilter = false
}) => {
  const { specialMeals, orders, wards, verifySpecialMeal } = useDataStore();
  const { currentUser } = useUserStore();
  
  const canVerify = currentUser?.role === 'nurse' || currentUser?.role === 'nurse_station';
  
  const displayMeals = maxItems ? specialMeals.slice(0, maxItems) : specialMeals;
  
  const getOrderInfo = (orderId: string) => {
    return orders.find(o => o.id === orderId);
  };
  
  const getWardName = (wardId: string) => {
    return wards.find(w => w.id === wardId)?.name || wardId;
  };
  
  const handleVerify = (orderId: string) => {
    if (currentUser) {
      verifySpecialMeal(orderId, currentUser.name);
    }
  };
  
  const dietaryBadgeVariant = (dietaryType: SpecialMeal['dietaryType']) => {
    switch (dietaryType) {
      case 'diabetic': return 'warning';
      case 'low_salt': return 'info';
      case 'low_fat': return 'success';
      case 'soft': return 'default';
      case 'liquid': return 'warning';
      case 'allergy_free': return 'danger';
      default: return 'default';
    }
  };
  
  const dietaryTypeLabel: Record<SpecialMeal['dietaryType'], string> = {
    diabetic: '糖尿病餐',
    low_salt: '低盐餐',
    low_fat: '低脂餐',
    soft: '软食',
    liquid: '流质',
    allergy_free: '防过敏',
    other: '其他'
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-purple-500" />
          特殊餐核对
          {specialMeals.filter(s => !s.isVerified).length > 0 && (
            <Badge variant="warning">
              {specialMeals.filter(s => !s.isVerified).length} 待核对
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayMeals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>暂无特殊餐记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  {showWardFilter && <TableHead>病区</TableHead>}
                  <TableHead>患者/家属</TableHead>
                  <TableHead>餐品</TableHead>
                  <TableHead>饮食类型</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>状态</TableHead>
                  {canVerify && <TableHead>操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMeals.map(sm => {
                  const order = getOrderInfo(sm.orderId);
                  return (
                    <TableRow key={sm.id}>
                      <TableCell className="text-sm">
                        {order ? formatDate(order.orderDate) : '-'}
                      </TableCell>
                      {showWardFilter && (
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-gray-400" />
                            {order ? getWardName(order.wardId) : '-'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {sm.patientName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {order?.mealName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dietaryBadgeVariant(sm.dietaryType)}>
                          {dietaryTypeLabel[sm.dietaryType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                        {sm.notes || '-'}
                      </TableCell>
                      <TableCell>
                        {sm.isVerified ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            已核对
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            待核对
                          </Badge>
                        )}
                      </TableCell>
                      {canVerify && (
                        <TableCell>
                          {!sm.isVerified ? (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => handleVerify(sm.orderId)}
                            >
                              核对确认
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {sm.verifiedBy}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
