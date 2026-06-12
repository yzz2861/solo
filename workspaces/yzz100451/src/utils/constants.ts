import type { BodyPart, Movement, PhotoSide } from './types'

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  neckline: '领口',
  shoulder: '肩宽',
  chest: '胸围',
  waist: '腰围',
  hip: '臀围',
  sleeveLength: '袖长',
  pantsLength: '裤长',
  armhole: '袖窿',
  backWidth: '背宽',
}

export const BODY_PARTS: BodyPart[] = [
  'neckline', 'shoulder', 'chest', 'waist', 'hip',
  'sleeveLength', 'pantsLength', 'armhole', 'backWidth',
]

export const MOVEMENT_LABELS: Record<Movement, string> = {
  raiseArms: '抬手',
  bendOver: '弯腰',
  sit: '坐',
  walk: '走',
  crossLegs: '盘腿',
  squat: '蹲',
  reachForward: '前伸',
  turnAround: '转身',
}

export const MOVEMENTS: Movement[] = [
  'raiseArms', 'bendOver', 'sit', 'walk',
  'crossLegs', 'squat', 'reachForward', 'turnAround',
]

export const PHOTO_SIDE_LABELS: Record<PhotoSide | '', string> = {
  '': '未标注',
  front: '正面',
  back: '反面',
  side: '侧面',
}

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export const SEVERITY_LABELS: Record<number, string> = {
  1: '轻微',
  2: '较轻',
  3: '一般',
  4: '较重',
  5: '严重',
}

export const SEVERITY_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-lime-100 text-lime-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

export const OPPOSITE_KEYWORDS: [string, string][] = [
  ['紧', '松'],
  ['小', '大'],
  ['短', '长'],
  ['窄', '宽'],
  ['高', '低'],
  ['卡', '滑'],
]
