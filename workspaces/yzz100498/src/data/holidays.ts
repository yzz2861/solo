import { Holiday } from '../types';

export const holidays: Holiday[] = [
  { date: '2026-01-01', name: '元旦', type: 'public', impactFactor: 1.2, notes: '家属探视增加' },
  { date: '2026-02-16', name: '春节', type: 'public', impactFactor: 1.5, notes: '春节期间家属送餐减少' },
  { date: '2026-02-17', name: '春节', type: 'public', impactFactor: 1.5 },
  { date: '2026-02-18', name: '春节', type: 'public', impactFactor: 1.4 },
  { date: '2026-04-04', name: '清明节', type: 'public', impactFactor: 1.1 },
  { date: '2026-05-01', name: '劳动节', type: 'public', impactFactor: 1.3, notes: '假期探视人数增加' },
  { date: '2026-05-02', name: '劳动节', type: 'public', impactFactor: 1.3 },
  { date: '2026-05-03', name: '劳动节', type: 'public', impactFactor: 1.25 },
  { date: '2026-06-18', name: '医院周年庆', type: 'hospital', impactFactor: 0.9, notes: '食堂提供免费餐' },
  { date: '2026-06-19', name: '端午节', type: 'public', impactFactor: 1.2 },
  { date: '2026-06-20', name: '端午节', type: 'public', impactFactor: 1.15 },
  { date: '2026-09-25', name: '中秋节', type: 'public', impactFactor: 1.3, notes: '家属送月饼' },
  { date: '2026-10-01', name: '国庆节', type: 'public', impactFactor: 1.4 },
  { date: '2026-10-02', name: '国庆节', type: 'public', impactFactor: 1.4 },
  { date: '2026-10-03', name: '国庆节', type: 'public', impactFactor: 1.35 },
  { date: '2026-10-04', name: '国庆节', type: 'public', impactFactor: 1.3 },
  { date: '2026-10-05', name: '国庆节', type: 'public', impactFactor: 1.25 },
];
