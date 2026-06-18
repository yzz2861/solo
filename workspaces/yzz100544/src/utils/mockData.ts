import type { Feedback, Theme, FeedbackThemeRelation, Improvement, Course } from '@/types';
import { generateId, DEFAULT_THEMES } from '@/utils/clustering';
import { buildThemeRelations, determineSeverity, multiLabelClassify } from '@/utils/clustering';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
const daysAhead = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);

interface MockBundle {
  feedback: Feedback[];
  themes: Theme[];
  feedbackThemes: FeedbackThemeRelation[];
  improvements: Improvement[];
  courses: Course[];
}

function makeFeedback(
  content: string,
  source: 'student' | 'ta' | 'wrong_answer',
  homework: string,
  author?: string,
  hoursBack: number = 12
): Feedback {
  const classifyResults = multiLabelClassify(content);
  const { severity, isSevere } = determineSeverity(content, classifyResults);
  return {
    id: generateId('fb'),
    source,
    content,
    author,
    homework,
    createdAt: hoursAgo(hoursBack),
    tags: [],
    severity,
    isSevere,
  };
}

export function generateMockData(): MockBundle {
  const themes: Theme[] = [...DEFAULT_THEMES];

  const rawFeedback: Array<{
    content: string; source: 'student' | 'ta' | 'wrong_answer';
    homework: string; author?: string; hoursBack?: number;
  }> = [
    { content: '拉普拉斯变换的定义不理解，公式也经常套错，不知道什么时候该用哪种变换', source: 'student', homework: 'HW3', author: '张三', hoursBack: 2 },
    { content: '第3章傅里叶级数的概念不清，和泰勒展开混淆了，分不清各自适用条件', source: 'student', homework: 'HW3', author: '李四', hoursBack: 3 },
    { content: '这道题的解题步骤跳太多，中间推导省略了关键环节，学生看不懂怎么来的', source: 'ta', homework: 'HW3', author: '王助教', hoursBack: 5 },
    { content: '第2题全班50%学生做错，主要是公式记错了，逆变换和正变换的公式搞反', source: 'wrong_answer', homework: 'HW3', hoursBack: 6 },
    { content: '题目表述不清楚，看不懂在问什么，"系统响应"是指什么响应？', source: 'student', homework: 'HW3', author: '王五', hoursBack: 8 },
    { content: '卷积积分的概念模糊，不知道怎么理解几何意义，计算时也经常上下限错', source: 'student', homework: 'HW3', author: '赵六', hoursBack: 10 },
    { content: 'MATLAB画伯德图的代码报错，不会用freqs函数，工具完全不会用', source: 'student', homework: 'HW3', author: '钱七', hoursBack: 14 },
    { content: '作业太难了，完全不会做，超出上课讲的范围，全班都不懂第5题', source: 'student', homework: 'HW3', author: '孙八', hoursBack: 16 },
    { content: '稳定性判据步骤缺少，很多同学跳过了必要条件的检验，直接用劳斯判据', source: 'ta', homework: 'HW3', author: '李助教', hoursBack: 18 },
    { content: '概念理解有偏差，零状态响应和零输入响应的定义还是没搞懂，建议回顾定义', source: 'ta', homework: 'HW3', author: '王助教', hoursBack: 20 },
    { content: 'Python里scipy.signal安装不起来，环境配置有问题，代码跑不出来', source: 'student', homework: 'HW3', author: '周九', hoursBack: 22 },
    { content: '第4题有歧义，"求输出"是求稳态输出还是全响应？两种理解都有人写', source: 'ta', homework: 'HW3', author: '张助教', hoursBack: 25 },
    { content: '传递函数化简过程中代数运算出错，公式代入不对，分子分母搞错', source: 'ta', homework: 'HW3', author: '刘助教', hoursBack: 28 },
    { content: '频域分析完全不会做，不知道从哪下手，概念和公式都记不住', source: 'student', homework: 'HW3', author: '吴十', hoursBack: 30 },
    { content: '第1题难度大，超纲了，需要用到没讲过的留数方法才能解', source: 'student', homework: 'HW3', author: '郑十一', hoursBack: 32 },
    { content: 'SPSS做数据拟合一直报错，工具使用有困难，线性回归不会设置参数', source: 'student', homework: 'HW3', author: '陈十二', hoursBack: 36 },
    { content: '状态空间建模步骤不规范，缺少状态变量选取的说明，过程省略太多', source: 'ta', homework: 'HW3', author: '杨助教', hoursBack: 38 },
    { content: '奈奎斯特判据和伯德判据的区别分不清，两种判据适用条件混淆', source: 'student', homework: 'HW3', author: '黄十三', hoursBack: 40 },
    { content: '这一章太难了，做不完，全军覆没的感觉，绝大多数人第6题都空着', source: 'wrong_answer', homework: 'HW3', hoursBack: 44 },
    { content: '单位冲激响应和单位阶跃响应的关系不理解，公式套不对，推导错误多', source: 'ta', homework: 'HW3', author: '赵助教', hoursBack: 48 },
    { content: '第2章电路的KVL和KCL又忘了，基础概念不清，导致后面的题都错了', source: 'student', homework: 'HW2', author: '马十四', hoursBack: 100 },
    { content: 'Excel做数据透视表不会，工具使用没学会，统计分析题做不出来', source: 'student', homework: 'HW2', author: '朱十五', hoursBack: 110 },
  ];

  const feedback: Feedback[] = rawFeedback.map(r =>
    makeFeedback(r.content, r.source, r.homework, r.author, r.hoursBack)
  );

  const feedbackThemes: FeedbackThemeRelation[] = [];
  const themeCounts = new Map<string, number>();

  for (const fb of feedback) {
    const rels = buildThemeRelations(fb, themes);
    feedbackThemes.push(...rels);
    for (const r of rels) {
      themeCounts.set(r.themeId, (themeCounts.get(r.themeId) ?? 0) + 1);
    }
  }

  for (let i = 0; i < feedback.length; i++) {
    const fb = feedback[i];
    const relsForFb = feedbackThemes.filter(r => r.feedbackId === fb.id);
    const { severity, isSevere } = determineSeverity(fb.content, relsForFb.map(r => ({
      themeId: r.themeId,
      score: r.matchScore,
      matchedKeywords: r.matchedKeywords,
    })), themeCounts);
    feedback[i] = { ...fb, severity, isSevere };
  }

  const courses: Course[] = [
    { id: 'c1', name: '第7节课：系统稳定性分析', courseNumber: 7, scheduledAt: hoursAgo(20), notes: '已完成' },
    { id: 'c2', name: '第8节课：频域分析补讲', courseNumber: 8, scheduledAt: daysAhead(2), notes: '需要补讲拉普拉斯变换和傅里叶级数的区别' },
    { id: 'c3', name: '第9节课：状态空间方法', courseNumber: 9, scheduledAt: daysAhead(5), notes: '' },
    { id: 'c4', name: '第10节课：离散系统', courseNumber: 10, scheduledAt: daysAhead(9), notes: '' },
  ];

  const improvements: Improvement[] = [
    {
      id: generateId('imp'),
      title: '补讲拉普拉斯变换与傅里叶变换的概念区别',
      description: '学生普遍混淆拉普拉斯和傅里叶变换的适用条件、定义区别，需通过对比表格和典型例题强化理解',
      representativeQuotes: [
        '"拉普拉斯变换的定义不理解，公式也经常套错" —— 学生张三',
        '"傅里叶级数的概念不清，和泰勒展开混淆了" —— 学生李四',
      ],
      relatedThemeIds: ['concept', 'formula'],
      priority: 'high',
      status: 'todo',
      courseId: 'c2',
      owner: '王老师',
      deadline: daysAhead(2),
      estimatedMinutes: 25,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: generateId('imp'),
      title: '解题步骤规范训练与典型例题分步详解',
      description: '助教多次反映学生步骤跳太多、推导省略关键环节。需要在课上示范标准解题过程，强调中间步骤的重要性',
      representativeQuotes: [
        '"解题步骤跳太多，中间推导省略了关键环节，学生看不懂怎么来的" —— 王助教',
        '"不知道从哪下手" —— 多位学生',
      ],
      relatedThemeIds: ['step'],
      priority: 'high',
      status: 'todo',
      courseId: 'c2',
      owner: '王老师',
      estimatedMinutes: 15,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: generateId('imp'),
      title: 'MATLAB/Python工具使用专题辅导',
      description: '多位同学反馈软件安装、代码运行报错问题。建议安排助教做一次工具专题辅导，或录制操作视频',
      representativeQuotes: [
        '"MATLAB画伯德图的代码报错，不会用freqs函数" —— 学生钱七',
        '"scipy.signal安装不起来，环境配置有问题" —— 学生周九',
      ],
      relatedThemeIds: ['tool'],
      priority: 'medium',
      status: 'todo',
      courseId: 'c3',
      owner: '李助教',
      estimatedMinutes: 30,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: generateId('imp'),
      title: '题目表述规范化审核',
      description: '第4题等多道题目存在歧义，下次作业出题后增加助教预审环节，确保题目表述清晰无歧义',
      representativeQuotes: [
        '"题目表述不清楚，看不懂在问什么" —— 学生王五',
        '"求输出是求稳态还是全响应？两种理解都有人写" —— 张助教',
      ],
      relatedThemeIds: ['ambiguity'],
      priority: 'medium',
      status: 'doing',
      courseId: 'c3',
      owner: '教研组',
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: generateId('imp'),
      title: '卷积积分几何意义可视化讲解',
      description: '卷积积分是HW3中另一个高频问题点，学生反映概念抽象难以理解。建议用动画演示卷积翻折-平移-相乘-积分的过程',
      representativeQuotes: [
        '"卷积积分的概念模糊，不知道怎么理解几何意义" —— 学生赵六',
      ],
      relatedThemeIds: ['concept'],
      priority: 'low',
      status: 'todo',
      courseId: 'c2',
      owner: '王老师',
      estimatedMinutes: 10,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
  ];

  return { feedback, themes, feedbackThemes, improvements, courses };
}
