export interface Vehicle {
  id: number;
  model: string;
  frame_number: string;
  battery_level: number;
  status: 'available' | 'in_use' | 'low_battery' | 'inspection' | 'maintenance';
  notes: string;
  ride_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  id_card: string;
  tags: string;
  ride_count?: number;
  feedback_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TestRide {
  id: number;
  customer_id: number;
  vehicle_id: number;
  deposit_amount: number;
  deposit_payment_method: string;
  route: string;
  planned_duration: number;
  start_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  deposit_status: 'collected' | 'refunded' | 'deducted';
  return_condition: 'normal' | 'scratched' | 'damaged';
  return_notes: string;
  deduction_amount: number;
  deduction_reason: string;
  insurance_confirmed: number;
  deposit_receipt_no: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_model?: string;
  vehicle_frame?: string;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: number;
  customer_id: number;
  test_ride_id?: number;
  preference: string;
  satisfaction: string;
  intended_model: string;
  notes: string;
  created_at: string;
}

export interface VehicleIssue {
  id: number;
  vehicle_id: number;
  test_ride_id?: number;
  issue_type: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  resolved: number;
  created_at: string;
  resolved_at?: string;
  model?: string;
  frame_number?: string;
  customer_name?: string;
}

export interface CustomerDetail extends Customer {
  rides: (TestRide & { vehicle_model?: string; vehicle_frame?: string })[];
  feedbacks: Feedback[];
}

export const VEHICLE_STATUS_LABEL: Record<string, string> = {
  available: '可试骑',
  in_use: '试骑中',
  low_battery: '电量不足',
  inspection: '待检查',
  maintenance: '维修中',
};

export const INSPECTION_ITEMS = [
  { id: 'scratches', label: '车身刮蹭/划痕' },
  { id: 'tire', label: '轮胎（气压/磨损）' },
  { id: 'brake', label: '刹车系统' },
  { id: 'light', label: '灯光（大灯/尾灯/转向灯）' },
  { id: 'seat', label: '车座与脚踏' },
  { id: 'battery', label: '电池仓/充电口' },
  { id: 'mirror', label: '后视镜' },
  { id: 'handlebar', label: '车把/仪表盘' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: '现金' },
  { value: 'wechat', label: '微信支付' },
  { value: 'alipay', label: '支付宝' },
  { value: 'card', label: '刷卡' },
];

export const ROUTES = [
  { value: '门店周边 2 公里', label: '门店周边 2 公里' },
  { value: '环线 5 公里', label: '环线 5 公里' },
  { value: '滨江路 8 公里', label: '滨江路 8 公里' },
  { value: '市区通勤路线', label: '市区通勤路线' },
  { value: '自定义路线', label: '自定义路线' },
];

export const INSURANCE_CLAUSE = `
一、保险责任
试骑期间，如因车辆质量问题造成客户人身或财产损害，门店承担相应责任。如因客户违规操作（如超速、超载、违规载物、骑入机动车道等）造成事故，责任由客户自行承担。

二、试骑规则
1. 客户须年满 16 周岁，持有效身份证件登记；
2. 试骑时须佩戴头盔，遵守交通规则；
3. 严禁将车辆转借他人、从事商业运营；
4. 车辆归还时应保持原状，如出现刮蹭/损坏，需照价赔偿。

三、押金规则
押金在车辆完好归还后全额退还；如有损坏，按实际维修费用扣除。

四、客户确认
本人已认真阅读并理解以上条款，确认车辆出发前车况良好，本人承担试骑期间的安全责任。
`;
