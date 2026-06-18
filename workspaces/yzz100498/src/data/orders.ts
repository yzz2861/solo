import { Order, MealType } from '../types';
import { wards } from './wards';
import { meals } from './meals';
import { holidays } from './holidays';
import { format, subDays, parseISO } from 'date-fns';

const patientNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二', '陈十三', '褚十四', '卫十五', '蒋十六', '沈十七', '韩十八', '杨十九', '朱二十'];

const generateOrders = (): Order[] => {
  const orders: Order[] = [];
  const today = new Date('2026-06-18');
  let orderId = 1;
  
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = format(subDays(today, dayOffset), 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date === date);
    
    wards.forEach((ward, wardIndex) => {
      const wardCount = Math.floor(20 + Math.random() * 30);
      const isLockedDown = ward.id === 'ward-003' && dayOffset >= 2 && dayOffset <= 5;
      
      const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
      if (Math.random() > 0.3) mealTypes.push('supper');
      
      mealTypes.forEach((mealType, mtIndex) => {
        const regularMeals = meals.filter(m => m.type === mealType && !m.isSpecial);
        const specialMeals = meals.filter(m => m.type === mealType && m.isSpecial);
        
        for (let i = 0; i < (isLockedDown ? Math.floor(wardCount * 0.3) : wardCount); i++) {
          const isSpecial = Math.random() < 0.15;
          const mealPool = isSpecial ? specialMeals : regularMeals;
          if (mealPool.length === 0) return;
          
          const meal = mealPool[Math.floor(Math.random() * mealPool.length)];
          const patientName = patientNames[Math.floor(Math.random() * patientNames.length)];
          const patientId = `P${String(1000 + wardIndex * 100 + i).padStart(4, '0')}`;
          
          const isDuplicate = Math.random() < 0.03;
          const isCrossMidnight = mealType === 'supper' && Math.random() < 0.4;
          
          const createdAtHour = mealType === 'breakfast' ? 6 + Math.floor(Math.random() * 2) :
                               mealType === 'lunch' ? 10 + Math.floor(Math.random() * 3) :
                               mealType === 'dinner' ? 16 + Math.floor(Math.random() * 3) :
                               21 + Math.floor(Math.random() * 3);
          
          const createdAt = `${date} ${String(createdAtHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;
          
          const status = dayOffset === 0 && createdAtHour > new Date().getHours() ? 'pending' :
                        Math.random() < 0.92 ? 'completed' : 'confirmed';
          
          const mealTypeLabels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', supper: '夜宵' };
          const familyMemberName = `${patientName}${['家属', '陪护', '爱人', '父亲', '母亲', '姐姐', '哥哥'][Math.floor(Math.random() * 7)]}`;
          
          orders.push({
            id: `ORD-${String(orderId++).padStart(6, '0')}`,
            patientId,
            patientName,
            familyMemberName,
            wardId: ward.id,
            wardName: ward.name,
            mealId: meal.id,
            mealName: meal.name,
            mealType,
            mealTypeLabel: mealTypeLabels[mealType],
            orderDate: date,
            quantity: 1,
            price: meal.price,
            status,
            isSpecial,
            dietaryType: isSpecial ? meal.dietaryType : undefined,
            createdAt,
            notes: isLockedDown ? '病区封控期间订餐' : undefined,
            flags: {
              isDuplicate,
              isCrossMidnight,
              isHoliday
            }
          });
          
          if (isDuplicate) {
            orders.push({
              id: `ORD-${String(orderId++).padStart(6, '0')}`,
              patientId,
              patientName,
              familyMemberName,
              wardId: ward.id,
              wardName: ward.name,
              mealId: meal.id,
              mealName: meal.name,
              mealType,
              mealTypeLabel: mealTypeLabels[mealType],
              orderDate: date,
              quantity: 1,
              price: meal.price,
              status: 'refunded',
              isSpecial,
              dietaryType: isSpecial ? meal.dietaryType : undefined,
              createdAt: `${date} ${String(createdAtHour + 1).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
              notes: '重复订单已退餐',
              flags: {
                isDuplicate: true,
                isCrossMidnight,
                isHoliday
              }
            });
          }
        }
      });
    });
  }
  
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const orders: Order[] = generateOrders();
