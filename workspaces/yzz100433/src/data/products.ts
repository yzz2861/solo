import type { Product } from '@/types';

export const PRODUCTS: Product[] = [
  { id: 'p1', name: '草莓奶油蛋糕', price: 38, category: 'cake', emoji: '🍰' },
  { id: 'p2', name: '巧克力慕斯', price: 42, category: 'cake', emoji: '🍫' },
  { id: 'p3', name: '抹茶千层', price: 35, category: 'cake', emoji: '🍵' },
  { id: 'p4', name: '芒果慕斯', price: 36, category: 'cake', emoji: '🥭' },
  { id: 'p5', name: '提拉米苏', price: 45, category: 'cake', emoji: '🍮' },
  { id: 'p6', name: '黑森林蛋糕', price: 48, category: 'cake', emoji: '🍒' },
  { id: 'p7', name: '芝士蛋糕', price: 32, category: 'cake', emoji: '🧀' },
  { id: 'p8', name: '红丝绒蛋糕', price: 40, category: 'cake', emoji: '❤️' },
  { id: 'p9', name: '珍珠奶茶', price: 18, category: 'drink', emoji: '🧋' },
  { id: 'p10', name: '美式咖啡', price: 22, category: 'drink', emoji: '☕' },
  { id: 'p11', name: '拿铁咖啡', price: 28, category: 'drink', emoji: '🥛' },
  { id: 'p12', name: '芒果班戟', price: 16, category: 'dessert', emoji: '🥞' },
  { id: 'p13', name: '榴莲班戟', price: 25, category: 'dessert', emoji: '🍈' },
  { id: 'p14', name: '抹茶曲奇', price: 12, category: 'dessert', emoji: '🍪' },
  { id: 'p15', name: '巧克力曲奇', price: 12, category: 'dessert', emoji: '🍪' },
  { id: 'p16', name: '蛋挞', price: 8, category: 'dessert', emoji: '🥧' },
  { id: 'p17', name: '杨枝甘露', price: 22, category: 'drink', emoji: '🥤' },
  { id: 'p18', name: '柠檬气泡水', price: 15, category: 'drink', emoji: '🍋' },
  { id: 'p19', name: '蜜桃乌龙茶', price: 20, category: 'drink', emoji: '🍑' },
  { id: 'p20', name: '草莓冰淇淋', price: 15, category: 'dessert', emoji: '🍦' },
];

export const getProductById = (id: string): Product | undefined => {
  return PRODUCTS.find(p => p.id === id);
};

export const getRandomProducts = (count: number): Product[] => {
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
