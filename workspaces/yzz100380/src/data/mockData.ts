import type {
  Member,
  Section,
  SectionHistory,
  Sheet,
  Practice,
  Attendance,
  Performance,
  PerformanceConfirm,
} from '@/types';

export const mockSections: Section[] = [
  { id: 'sec-1', name: '高音部', color: '#E74C3C', description: '口琴高音声部，负责主旋律' },
  { id: 'sec-2', name: '中音部', color: '#3498DB', description: '口琴中音声部，负责和声' },
  { id: 'sec-3', name: '低音部', color: '#27AE60', description: '口琴低音声部，负责低音伴奏' },
  { id: 'sec-4', name: '和弦部', color: '#9B59B6', description: '和弦口琴，负责和弦伴奏' },
  { id: 'sec-5', name: '低音提琴部', color: '#34495E', description: '低音提琴口琴' },
];

export const mockMembers: Member[] = [
  { id: 'm-1', name: '李明辉', sectionId: 'sec-1', joinDate: '2023-09-01', isLeader: true, phone: '13800138001', email: 'lihui@example.com', note: '社长，负责整体安排' },
  { id: 'm-2', name: '王小雅', sectionId: 'sec-1', joinDate: '2023-09-01', isLeader: false, phone: '13800138002', email: 'xiaoya@example.com' },
  { id: 'm-3', name: '张浩然', sectionId: 'sec-1', joinDate: '2024-03-15', isLeader: false, phone: '13800138003' },
  { id: 'm-4', name: '陈思琪', sectionId: 'sec-2', joinDate: '2023-09-01', isLeader: false, phone: '13800138004', email: 'siqi@example.com', note: '声部长' },
  { id: 'm-5', name: '刘子轩', sectionId: 'sec-2', joinDate: '2024-01-20', isLeader: false, phone: '13800138005' },
  { id: 'm-6', name: '赵雨萱', sectionId: 'sec-2', joinDate: '2023-09-01', isLeader: false, phone: '13800138006' },
  { id: 'm-7', name: '孙博文', sectionId: 'sec-3', joinDate: '2023-09-01', isLeader: false, phone: '13800138007', note: '声部长' },
  { id: 'm-8', name: '周佳怡', sectionId: 'sec-3', joinDate: '2024-03-15', isLeader: false, phone: '13800138008' },
  { id: 'm-9', name: '吴俊杰', sectionId: 'sec-4', joinDate: '2023-09-01', isLeader: false, phone: '13800138009' },
  { id: 'm-10', name: '郑美玲', sectionId: 'sec-4', joinDate: '2024-02-10', isLeader: false, phone: '13800138010' },
  { id: 'm-11', name: '黄志强', sectionId: 'sec-5', joinDate: '2023-09-01', isLeader: false, phone: '13800138011', note: '声部长' },
  { id: 'm-12', name: '林诗涵', sectionId: 'sec-1', joinDate: '2024-06-01', isLeader: false, phone: '13800138012' },
];

export const mockSectionHistory: SectionHistory[] = [
  { id: 'sh-1', memberId: 'm-5', fromSectionId: 'sec-1', toSectionId: 'sec-2', changeDate: '2026-06-05', reason: '声部调整' },
  { id: 'sh-2', memberId: 'm-8', fromSectionId: 'sec-2', toSectionId: 'sec-3', changeDate: '2026-06-08', reason: '个人发展' },
];

export const mockSheets: Sheet[] = [
  { id: 's-1', title: '茉莉花', composer: '江苏民歌', filePath: '/Users/Documents/乐谱/茉莉花.pdf', fileValid: true, totalBars: 48, difficulty: 'easy', sectionIds: ['sec-1', 'sec-2', 'sec-3'], createdAt: '2024-01-15', updatedAt: '2024-05-20' },
  { id: 's-2', title: '康康舞曲', composer: '奥芬巴赫', filePath: '/Users/Documents/乐谱/康康舞曲.pdf', fileValid: true, totalBars: 120, difficulty: 'medium', sectionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4'], createdAt: '2024-02-10', updatedAt: '2024-06-01' },
  { id: 's-3', title: '天空之城', composer: '久石让', filePath: '/Users/Documents/乐谱/天空之城_旧版.pdf', fileValid: false, totalBars: 64, difficulty: 'medium', sectionIds: ['sec-1', 'sec-2', 'sec-3'], createdAt: '2024-03-01', updatedAt: '2024-04-15' },
  { id: 's-4', title: '多瑙河之波', composer: '伊万诺维奇', filePath: '/Users/Documents/乐谱/多瑙河之波.pdf', fileValid: true, totalBars: 96, difficulty: 'hard', sectionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4', 'sec-5'], createdAt: '2024-04-20', updatedAt: '2024-06-05' },
  { id: 's-5', title: '欢乐颂', composer: '贝多芬', filePath: '/Users/Documents/乐谱/欢乐颂.pdf', fileValid: true, totalBars: 32, difficulty: 'easy', sectionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4'], createdAt: '2024-01-10', updatedAt: '2024-03-10' },
  { id: 's-6', title: '赛马', composer: '黄海怀', filePath: '/Users/Documents/乐谱/赛马.pdf', fileValid: true, totalBars: 72, difficulty: 'hard', sectionIds: ['sec-1', 'sec-2', 'sec-3', 'sec-4', 'sec-5'], createdAt: '2024-05-01', updatedAt: '2024-06-10' },
];

export const mockPractices: Practice[] = [
  { id: 'p-1', memberId: 'm-1', sheetId: 's-1', practicedBars: '1-48', mastery: 95, note: '熟练掌握，可以开始排练', teacherModified: false, lastPracticeDate: '2026-06-09' },
  { id: 'p-2', memberId: 'm-2', sheetId: 's-1', practicedBars: '1-32', mastery: 75, note: '后半部分还需练习', teacherModified: true, lastPracticeDate: '2026-06-08' },
  { id: 'p-3', memberId: 'm-3', sheetId: 's-1', practicedBars: '1-48', mastery: 80, note: '节奏需要再稳一些', teacherModified: false, lastPracticeDate: '2026-06-07' },
  { id: 'p-4', memberId: 'm-4', sheetId: 's-1', practicedBars: '1-48', mastery: 90, note: '', teacherModified: false, lastPracticeDate: '2026-06-09' },
  { id: 'p-5', memberId: 'm-1', sheetId: 's-2', practicedBars: '1-80', mastery: 70, note: '快速段落需要加强', teacherModified: true, lastPracticeDate: '2026-06-08' },
  { id: 'p-6', memberId: 'm-2', sheetId: 's-2', practicedBars: '1-60', mastery: 55, note: '继续努力', teacherModified: false, lastPracticeDate: '2026-06-05' },
  { id: 'p-7', memberId: 'm-7', sheetId: 's-2', practicedBars: '1-120', mastery: 85, note: '低音部分很稳', teacherModified: false, lastPracticeDate: '2026-06-09' },
  { id: 'p-8', memberId: 'm-1', sheetId: 's-4', practicedBars: '1-48', mastery: 60, note: '新曲子，刚开始练', teacherModified: false, lastPracticeDate: '2026-06-06' },
  { id: 'p-9', memberId: 'm-4', sheetId: 's-4', practicedBars: '1-32', mastery: 45, note: '', teacherModified: false, lastPracticeDate: '2026-06-07' },
  { id: 'p-10', memberId: 'm-7', sheetId: 's-4', practicedBars: '1-60', mastery: 70, note: '', teacherModified: true, lastPracticeDate: '2026-06-09' },
  { id: 'p-11', memberId: 'm-1', sheetId: 's-6', practicedBars: '1-24', mastery: 30, note: '新曲目，刚开始', teacherModified: false, lastPracticeDate: '2026-06-10' },
  { id: 'p-12', memberId: 'm-11', sheetId: 's-6', practicedBars: '1-72', mastery: 50, note: '低音部分基本掌握', teacherModified: false, lastPracticeDate: '2026-06-09' },
];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

export const mockAttendances: Attendance[] = [
  { id: 'a-1', date: today, memberId: 'm-1', status: 'present' },
  { id: 'a-2', date: today, memberId: 'm-2', status: 'present' },
  { id: 'a-3', date: today, memberId: 'm-3', status: 'absent', reason: '生病请假' },
  { id: 'a-4', date: today, memberId: 'm-4', status: 'present' },
  { id: 'a-5', date: today, memberId: 'm-5', status: 'late', reason: '堵车' },
  { id: 'a-6', date: today, memberId: 'm-7', status: 'present' },
  { id: 'a-7', date: today, memberId: 'm-9', status: 'present' },
  { id: 'a-8', date: yesterday, memberId: 'm-1', status: 'present' },
  { id: 'a-9', date: yesterday, memberId: 'm-2', status: 'present' },
  { id: 'a-10', date: yesterday, memberId: 'm-3', status: 'present' },
  { id: 'a-11', date: yesterday, memberId: 'm-6', status: 'leave', reason: '家中有事' },
  { id: 'a-12', date: twoDaysAgo, memberId: 'm-1', status: 'present' },
  { id: 'a-13', date: twoDaysAgo, memberId: 'm-8', status: 'absent', reason: '考试' },
];

export const mockPerformances: Performance[] = [
  { id: 'perf-1', name: '夏季音乐会', date: '2026-07-15', location: '学校大礼堂', description: '年度夏季音乐会', songIds: ['s-1', 's-2', 's-5'], requiredMastery: 80 },
  { id: 'perf-2', name: '迎新晚会', date: '2026-09-20', location: '大学生活动中心', description: '新生迎新晚会演出', songIds: ['s-1', 's-4', 's-6'], requiredMastery: 75 },
  { id: 'perf-3', name: '社区公益演出', date: '2026-08-10', location: '阳光社区广场', description: '社区文化节公益演出', songIds: ['s-1', 's-5', 's-3'], requiredMastery: 70 },
];

export const mockPerformanceConfirms: PerformanceConfirm[] = [
  { id: 'pc-1', performanceId: 'perf-1', memberId: 'm-1', confirmed: true, confirmedAt: '2026-06-05' },
  { id: 'pc-2', performanceId: 'perf-1', memberId: 'm-2', confirmed: true, confirmedAt: '2026-06-06' },
  { id: 'pc-3', performanceId: 'perf-1', memberId: 'm-3', confirmed: false },
  { id: 'pc-4', performanceId: 'perf-1', memberId: 'm-4', confirmed: true, confirmedAt: '2026-06-05' },
  { id: 'pc-5', performanceId: 'perf-1', memberId: 'm-5', confirmed: false },
  { id: 'pc-6', performanceId: 'perf-1', memberId: 'm-7', confirmed: true, confirmedAt: '2026-06-07' },
  { id: 'pc-7', performanceId: 'perf-2', memberId: 'm-1', confirmed: true, confirmedAt: '2026-06-08' },
  { id: 'pc-8', performanceId: 'perf-2', memberId: 'm-2', confirmed: false },
  { id: 'pc-9', performanceId: 'perf-3', memberId: 'm-1', confirmed: false },
];
