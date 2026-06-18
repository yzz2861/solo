import { SpecialMeal } from '../types';
import { orders } from './orders';
import { wards } from './wards';
import { format, addDays } from 'date-fns';

const generateSpecialMeals = (): SpecialMeal[] => {
  const specialMeals: SpecialMeal[] = [];
  const specialOrders = orders.filter(o => o.isSpecial && o.status !== 'refunded');
  const today = new Date('2026-06-18');
  
  const dietaryTypeMap: Record<string, SpecialMeal['dietaryType']> = {
    diabetic: 'diabetic',
    low_salt: 'low_salt',
    low_fat: 'low_fat',
    soft: 'soft',
    liquid: 'liquid',
    allergy_free: 'allergy_free'
  };
  
  let id = 1;
  
  specialOrders.slice(0, 50).forEach((order, index) => {
    const bedNo = `${wards.find(w => w.id === order.wardId)?.floor || 3}${String(Math.floor(Math.random() * 30) + 1).padStart(2, '0')}`;
    const isTomorrow = Math.random() < 0.4;
    const mealDate = isTomorrow ? format(addDays(today, 1), 'yyyy-MM-dd') : order.orderDate;
    const mappedDietaryType = dietaryTypeMap[order.dietaryType || ''] || 'other';
    
    specialMeals.push({
      id: `SM-${String(id++).padStart(4, '0')}`,
      orderId: order.id,
      patientName: order.patientName,
      wardName: order.wardName,
      bedNo,
      dietaryType: mappedDietaryType,
      mealName: order.mealName,
      mealDate,
      mealType: order.mealType,
      isVerified: Math.random() < 0.6,
      verifiedBy: Math.random() < 0.6 ? wards.find(w => w.id === order.wardId)?.nurseInCharge : undefined,
      verifiedAt: Math.random() < 0.6 ? order.createdAt : undefined,
      notes: index % 5 === 0 ? '请特别注意不要加糖' : undefined
    });
  });
  
  return specialMeals.sort((a, b) => {
    if (a.isVerified !== b.isVerified) return a.isVerified ? 1 : -1;
    return a.mealDate.localeCompare(b.mealDate);
  });
};

export const specialMeals: SpecialMeal[] = generateSpecialMeals();
