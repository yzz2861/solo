export interface Order {
  id: number
  customer_name: string
  customer_phone?: string
  original_image_path?: string
  repair_requirements?: string
  price: number
  delivery_date?: string
  status: 'pending' | 'repairing' | 'review' | 'delivered' | 'confirmed' | 'cancelled'
  confirmed: number
  urgent_type?: string
  urgent_date?: string
  created_at: string
  updated_at: string
}

export interface OrderVersion {
  id: number
  order_id: number
  version_number: number
  image_path?: string
  is_final: number
  notes?: string
  created_at: string
}

export interface HistoryRecord {
  id: number
  order_id: number
  field_name: string
  old_value?: string
  new_value?: string
  operator: string
  created_at: string
}

export interface Warning {
  id?: number
  order_id?: number
  warning_type: string
  message: string
  is_read?: number
  created_at?: string
  customer_name?: string
  order_status?: string
}

export const STATUS_MAP: Record<string, string> = {
  pending: '待处理',
  repairing: '修复中',
  review: '待审核',
  delivered: '已交付',
  confirmed: '已确认',
  cancelled: '已取消',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  repairing: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const URGENT_TYPES = [
  { value: '', label: '普通订单' },
  { value: 'birthday_banquet', label: '寿宴' },
  { value: 'wedding', label: '婚礼' },
  { value: 'funeral', label: '丧葬' },
  { value: 'other_urgent', label: '其他紧急' },
]

export const WARNING_TYPE_COLORS: Record<string, string> = {
  missing_image: 'bg-red-100 text-red-800 border-red-300',
  multiple_finals: 'bg-orange-100 text-orange-800 border-orange-300',
  unconfirmed_delivery: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sensitive_content: 'bg-pink-100 text-pink-800 border-pink-300',
  urgent_warning: 'bg-red-100 text-red-800 border-red-300',
  delivery_reminder: 'bg-blue-100 text-blue-800 border-blue-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
}
