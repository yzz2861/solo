export type ComplaintSource = '电话' | '业主群' | '工单系统' | '其他';
export type ComplaintStatus = '处理中' | '已关闭' | '已超期';
export type DataQualityFlag = 
  | 'time_missing' 
  | 'time_inverted' 
  | 'owner_merged' 
  | 'type_standardized'
  | 'type_unconfirmed';

export interface Owner {
  id: string;
  name: string;
  roomNumber: string;
  phoneNumbers: string[];
  complaintCount: number;
}

export interface Building {
  id: string;
  community: string;
  building: string;
}

export interface Staff {
  id: string;
  name: string;
  totalCount: number;
  avgResponseHours: number;
  avgCloseHours: number;
  overdueRate: number;
  performanceScore: number;
}

export interface Complaint {
  id: string;
  orderNo: string;
  ownerId: string;
  ownerName: string;
  roomNumber: string;
  phone: string;
  buildingId: string;
  community: string;
  building: string;
  staffId: string;
  staffName: string;
  problemType: string;
  rawProblemType: string;
  source: ComplaintSource;
  receiveTime: Date | null;
  responseTime: Date | null;
  closeTime: Date | null;
  status: ComplaintStatus;
  responseHours: number | null;
  closeHours: number | null;
  isOverdue: boolean;
  overdueReason: string;
  description: string;
  dataQualityFlags: DataQualityFlag[];
}

export interface CleaningReport {
  totalRows: number;
  validRows: number;
  timeMissing: number;
  timeInverted: number;
  ownersMerged: number;
  typesStandardized: number;
  typesUnconfirmed: number;
  details: {
    timeMissingIds: string[];
    timeInvertedIds: string[];
    mergedOwnerIds: string[];
    unconfirmedTypes: Array<{ id: string; raw: string }>;
  };
}

export interface KPISummary {
  totalComplaints: number;
  avgResponseHours: number;
  avgCloseHours: number;
  repeatComplaintRate: number;
  overdueRate: number;
}

export interface RepeatComplaintGroup {
  ownerId: string;
  ownerName: string;
  roomNumber: string;
  problemType: string;
  count: number;
  firstTime: Date;
  lastTime: Date;
  complaintIds: string[];
}

export interface Filters {
  communities: string[];
  buildings: string[];
  problemTypes: string[];
  sources: ComplaintSource[];
  staffIds: string[];
  dateRange: [Date | null, Date | null];
}
