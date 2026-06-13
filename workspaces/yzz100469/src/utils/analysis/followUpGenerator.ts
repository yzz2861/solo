import type { Annotation, FollowUpQuestion } from '@/types';
import { generateId } from './textProcessor';

interface GenContext {
  candidateName?: string;
  position?: string;
  annotations: Annotation[];
}

export function generateFollowUps(ctx: GenContext): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const { annotations } = ctx;

  const noEvidenceAnns = annotations.filter(a => a.type === 'no_evidence');
  const biasAnns = annotations.filter(a => a.type === 'bias');
  const evidenceAnns = annotations.filter(a => a.type === 'evidence');

  noEvidenceAnns.forEach((ann, idx) => {
    const text = ann.text.replace(/[。！？，,.]/g, '');

    if (/技术(?:好|不错|一般|强)/.test(text) || /基础(?:扎实|好|不错|差|一般)/.test(text)) {
      questions.push({
        id: generateId('fq'),
        question: `关于"${text.slice(0, 15)}..."的评价：请面试官补充候选人在具体哪个技术领域表现好/差？有哪些代码、架构设计或技术方案可以佐证？`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: idx < 2 ? 'high' : 'medium',
      });
    } else if (/沟通(?:不错|还行|不太好|一般)|表达(?:不清|不太好)/.test(text)) {
      questions.push({
        id: generateId('fq'),
        question: `关于"${text.slice(0, 15)}..."的评价：请面试官描述一个具体的沟通场景——候选人在什么情境下、和谁沟通、说了什么、结果如何？`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: idx < 2 ? 'high' : 'medium',
      });
    } else if (/潜力|稳定|不太稳/.test(text)) {
      questions.push({
        id: generateId('fq'),
        question: `关于"${text.slice(0, 15)}..."的判断：请说明判断依据是什么？候选人的哪些具体行为或经历让你得出这个结论？`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'high',
      });
    } else if (/感觉|觉得|认为/.test(text)) {
      questions.push({
        id: generateId('fq'),
        question: `"${text.slice(0, 20)}..."是主观感受，下一轮请补充：候选人做了什么具体行为 → 怎么表现的 → 产生了什么结果？`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'medium',
      });
    } else {
      questions.push({
        id: generateId('fq'),
        question: `"${text.slice(0, 20)}..."缺少具体证据，下一轮请用STAR法则追问：具体情境(S)→任务(T)→行动(A)→结果(R)`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'medium',
      });
    }
  });

  biasAnns.forEach((ann, idx) => {
    if (ann.reason?.includes('性别') || ann.reason?.includes('性别偏见')) {
      questions.push({
        id: generateId('fq'),
        question: `偏见修正：${ann.text.slice(0, 20)}...涉及性别偏见。下一轮请聚焦：候选人的技术能力、项目经验、抗压表现（用事实，不做性别假设）`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'high',
      });
    } else if (ann.reason?.includes('年龄') || ann.reason?.includes('代际')) {
      questions.push({
        id: generateId('fq'),
        question: `偏见修正：${ann.text.slice(0, 20)}...涉及年龄/代际偏见。请基于候选人个人经历评估，不做代际标签化判断`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'high',
      });
    } else if (ann.reason?.includes('外貌')) {
      questions.push({
        id: generateId('fq'),
        question: `偏见修正：${ann.text.slice(0, 20)}...涉及外貌评价。如非岗位必需（如公关/前台），请删除外貌相关描述，聚焦专业能力`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'high',
      });
    } else if (ann.reason?.includes('个人好恶') || ann.reason?.includes('性格')) {
      questions.push({
        id: generateId('fq'),
        question: `偏见修正：${ann.text.slice(0, 20)}...涉及主观偏好。请将"喜欢/不喜欢"或性格标签替换为具体行为描述（如"在讨论中主动提出X方案"）`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: 'medium',
      });
    } else {
      questions.push({
        id: generateId('fq'),
        question: `偏见修正提示：请重新审视"${ann.text.slice(0, 20)}..."的评价是否基于候选人客观行为，避免偏见性判断`,
        relatedAnnotationId: ann.id,
        isCustom: false,
        priority: idx < 2 ? 'high' : 'medium',
      });
    }
  });

  if (evidenceAnns.length === 0 && noEvidenceAnns.length > 0) {
    questions.push({
      id: generateId('fq'),
      question: '整体追问：本轮纪要缺少行为证据。下一轮请每个评价点配套1-2个具体项目事例，按照STAR结构记录',
      isCustom: false,
      priority: 'high',
    });
  }

  if (evidenceAnns.length > 0 && evidenceAnns.length < noEvidenceAnns.length) {
    questions.push({
      id: generateId('fq'),
      question: `结构追问：当前证据判断(${evidenceAnns.length}条)少于主观评价(${noEvidenceAnns.length}条)，建议下一轮增加对候选人关键项目的深挖`,
      isCustom: false,
      priority: 'medium',
    });
  }

  return questions;
}
