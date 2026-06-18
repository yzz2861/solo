import type { Pet, Owner, Groomer, Assistant, Appointment } from '@/types'

export const SEED_GROOMERS: Groomer[] = [
  { id: 'g1', name: '小美', avatar: '👩‍🦰', specialties: ['wash', 'shave'] },
  { id: 'g2', name: '阿杰', avatar: '👨‍🦱', specialties: ['wash', 'shave', 'nail'] },
  { id: 'g3', name: '莉莉', avatar: '👩', specialties: ['wash', 'nail'] },
]

export const SEED_ASSISTANTS: Assistant[] = [
  { id: 'a1', name: '小张' },
  { id: 'a2', name: '小王' },
  { id: 'a3', name: '小李' },
]

export const SEED_OWNERS: Owner[] = [
  { id: 'o1', name: '张先生', phone: '13800138001', address: '朝阳区望京西园3区' },
  { id: 'o2', name: '李女士', phone: '13900139002', address: '海淀区中关村南大街' },
  { id: 'o3', name: '王先生', phone: '13700137003', address: '朝阳区望京西园5区' },
  { id: 'o4', name: '赵女士', phone: '13600136004', address: '东城区建国门外大街' },
  { id: 'o5', name: '刘先生', phone: '13500135005', address: '西城区金融大街' },
]

export const SEED_PETS: Pet[] = [
  { id: 'p1', name: '豆豆', breed: '金毛', size: 'large', weight: 30, vaccinated: true, personality: 'calm', allergyNote: '', biteWarning: false, ownerId: 'o1' },
  { id: 'p2', name: '小白', breed: '贵宾', size: 'small', weight: 5, vaccinated: true, personality: 'active', allergyNote: '', biteWarning: false, ownerId: 'o2' },
  { id: 'p3', name: '大壮', breed: '藏獒', size: 'large', weight: 45, vaccinated: false, personality: 'aggressive', allergyNote: '对洗发水过敏', biteWarning: true, ownerId: 'o3' },
  { id: 'p4', name: '花花', breed: '柯基', size: 'medium', weight: 12, vaccinated: true, personality: 'nervous', allergyNote: '', biteWarning: false, ownerId: 'o4' },
  { id: 'p5', name: '球球', breed: '博美', size: 'small', weight: 3, vaccinated: true, personality: 'active', allergyNote: '', biteWarning: false, ownerId: 'o5' },
  { id: 'p6', name: '旺财', breed: '哈士奇', size: 'large', weight: 25, vaccinated: true, personality: 'active', allergyNote: '', biteWarning: false, ownerId: 'o1' },
]

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt1', petId: 'p1', groomerId: 'g1', date: getToday(), startTime: '09:00', endTime: '10:30',
    estimatedDuration: 90, status: 'pending', pickupTime: '08:30', pickupAddress: '朝阳区望京西园3区',
    needsPickup: true, notes: '豆豆比较怕水，注意安抚', ownerId: 'o1', createdAt: new Date().toISOString(),
    services: [
      { id: 's1', appointmentId: 'apt1', type: 'wash', duration: 90, price: 80 },
    ],
    assistants: ['a1'],
    earlyArrival: false,
  },
  {
    id: 'apt2', petId: 'p2', groomerId: 'g1', date: getToday(), startTime: '10:30', endTime: '11:30',
    estimatedDuration: 60, status: 'pending', pickupTime: '', pickupAddress: '',
    needsPickup: false, notes: '', ownerId: 'o2', createdAt: new Date().toISOString(),
    services: [
      { id: 's2', appointmentId: 'apt2', type: 'wash', duration: 40, price: 80 },
      { id: 's3', appointmentId: 'apt2', type: 'nail', duration: 10, price: 30 },
    ],
    assistants: [],
    earlyArrival: true,
    arrivedAt: '09:45',
  },
  {
    id: 'apt3', petId: 'p3', groomerId: 'g2', date: getToday(), startTime: '09:00', endTime: '11:30',
    estimatedDuration: 150, status: 'pending', pickupTime: '', pickupAddress: '',
    needsPickup: false, notes: '⚠️ 咬人！必须戴嘴套！', ownerId: 'o3', createdAt: new Date().toISOString(),
    services: [
      { id: 's4', appointmentId: 'apt3', type: 'wash', duration: 90, price: 80 },
      { id: 's5', appointmentId: 'apt3', type: 'shave', duration: 60, price: 100 },
    ],
    assistants: ['a1', 'a2'],
    earlyArrival: false,
  },
  {
    id: 'apt4', petId: 'p4', groomerId: 'g3', date: getToday(), startTime: '14:00', endTime: '15:15',
    estimatedDuration: 75, status: 'pending', pickupTime: '13:30', pickupAddress: '东城区建国门外大街',
    needsPickup: true, notes: '花花很紧张，动作要轻柔', ownerId: 'o4', createdAt: new Date().toISOString(),
    services: [
      { id: 's6', appointmentId: 'apt4', type: 'wash', duration: 60, price: 80 },
      { id: 's7', appointmentId: 'apt4', type: 'nail', duration: 15, price: 30 },
    ],
    assistants: ['a3'],
    earlyArrival: false,
  },
  {
    id: 'apt5', petId: 'p5', groomerId: 'g2', date: getTomorrow(), startTime: '10:00', endTime: '10:50',
    estimatedDuration: 50, status: 'pending', pickupTime: '', pickupAddress: '',
    needsPickup: false, notes: '', ownerId: 'o5', createdAt: new Date().toISOString(),
    services: [
      { id: 's8', appointmentId: 'apt5', type: 'wash', duration: 40, price: 80 },
      { id: 's9', appointmentId: 'apt5', type: 'nail', duration: 10, price: 30 },
    ],
    assistants: [],
    earlyArrival: false,
  },
  {
    id: 'apt6', petId: 'p6', groomerId: 'g1', date: getTomorrow(), startTime: '14:00', endTime: '15:30',
    estimatedDuration: 90, status: 'pending', pickupTime: '13:30', pickupAddress: '朝阳区望京西园3区',
    needsPickup: true, notes: '哈士奇容易乱动', ownerId: 'o1', createdAt: new Date().toISOString(),
    services: [
      { id: 's10', appointmentId: 'apt6', type: 'wash', duration: 90, price: 80 },
    ],
    assistants: ['a2'],
    earlyArrival: false,
  },
]
