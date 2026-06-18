export interface Student {
  id: string;
  name: string;
  className: string;
  grade: string;
}

export type ParentRelation = "父亲" | "母亲" | "爷爷" | "奶奶" | "外公" | "外婆" | "其他";

export type TopicType = "学习习惯" | "同伴关系" | "心理健康" | "学业成绩" | "综合发展" | "其他";

export interface Parent {
  id: string;
  studentId: string;
  name: string;
  relation: ParentRelation;
  phone: string;
  attended: boolean;
  topic: TopicType;
  specialNote: string;
  teacherId: string | null;
  needFollowup: boolean;
  groupId: string | null;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  maxGroups: number;
}

export interface Group {
  id: string;
  name: string;
  teacherId: string | null;
  topic: string;
  position: number;
}

export type FollowupStatus = "待跟进" | "进行中" | "已完成" | "需持续跟进";

export type FollowupType = "面谈" | "电话" | "家访" | "微信";

export interface FollowupRecord {
  id: string;
  studentId: string;
  parentId: string;
  teacherId: string | null;
  status: FollowupStatus;
  date: string;
  note: string;
  type: FollowupType;
  nextPlanDate?: string;
}

export type UserRole = "班主任" | "年级组长";

export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  relatedIds?: string[];
}
