import { Meal } from '../types';

export const meals: Meal[] = [
  { id: 'meal-001', name: '营养早餐A', type: 'breakfast', price: 15, ingredients: ['鸡蛋', '牛奶', '面包', '蔬菜'], nutritionalInfo: '蛋白质15g, 碳水30g', isSpecial: false },
  { id: 'meal-002', name: '营养早餐B', type: 'breakfast', price: 12, ingredients: ['粥', '包子', '小菜'], nutritionalInfo: '蛋白质10g, 碳水40g', isSpecial: false },
  { id: 'meal-003', name: '午餐套餐A', type: 'lunch', price: 25, ingredients: ['米饭', '红烧肉', '青菜', '汤'], nutritionalInfo: '蛋白质25g, 碳水50g', isSpecial: false },
  { id: 'meal-004', name: '午餐套餐B', type: 'lunch', price: 22, ingredients: ['米饭', '清蒸鱼', '时蔬', '汤'], nutritionalInfo: '蛋白质30g, 碳水45g', isSpecial: false },
  { id: 'meal-005', name: '晚餐套餐A', type: 'dinner', price: 23, ingredients: ['米饭', '鸡块', '素菜', '汤'], nutritionalInfo: '蛋白质20g, 碳水45g', isSpecial: false },
  { id: 'meal-006', name: '晚餐套餐B', type: 'dinner', price: 20, ingredients: ['面条', '卤蛋', '青菜'], nutritionalInfo: '蛋白质18g, 碳水50g', isSpecial: false },
  { id: 'meal-007', name: '夜宵套餐', type: 'supper', price: 18, ingredients: ['粥', '包子', '小菜'], nutritionalInfo: '蛋白质12g, 碳水35g', isSpecial: false },
  { id: 'meal-008', name: '糖尿病餐', type: 'lunch', price: 28, ingredients: ['杂粮饭', '瘦肉', '蔬菜'], nutritionalInfo: '低糖高蛋白', isSpecial: true, dietaryType: 'diabetic' },
  { id: 'meal-009', name: '低盐餐', type: 'dinner', price: 26, ingredients: ['米饭', '蒸鱼', '时蔬'], nutritionalInfo: '低盐低脂', isSpecial: true, dietaryType: 'low_salt' },
  { id: 'meal-010', name: '流质餐', type: 'breakfast', price: 20, ingredients: ['米汤', '蛋花', '营养液'], nutritionalInfo: '流质易吸收', isSpecial: true, dietaryType: 'liquid' },
  { id: 'meal-011', name: '素食餐', type: 'lunch', price: 22, ingredients: ['米饭', '豆腐', '时蔬', '菌菇'], nutritionalInfo: '全素食', isSpecial: true, dietaryType: 'vegetarian' },
  { id: 'meal-012', name: '高蛋白餐', type: 'dinner', price: 30, ingredients: ['米饭', '牛排', '鸡蛋', '蔬菜'], nutritionalInfo: '高蛋白术后恢复', isSpecial: true, dietaryType: 'high_protein' },
];
