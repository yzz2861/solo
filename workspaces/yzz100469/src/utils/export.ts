import type { InterviewRecord, AnnotationType } from '@/types';
import { ANNOTATION_TYPE_LABELS } from '@/types';

const TYPE_EMOJI: Record<AnnotationType, string> = {
  evidence: '✅',
  no_evidence: '⚠️',
  bias: '🚨',
  follow_up: '❓',
};

export function exportInterviewerSuggestions(record: InterviewRecord): string {
  const lines: string[] = [];
  lines.push(`# 面试纪要改进建议`);
  lines.push('');
  lines.push(`- **候选人**: ${record.candidateName}`);
  lines.push(`- **岗位**: ${record.position}`);
  lines.push(`- **面试轮次**: 第${record.round}轮`);
  lines.push(`- **面试官**: ${record.interviewerAlias}`);
  lines.push(`- **日期**: ${record.interviewDate}`);
  lines.push('');
  lines.push(`---`);
  lines.push('');

  const evidenceAnns = record.annotations.filter(a => a.type === 'evidence');
  const noEvidenceAnns = record.annotations.filter(a => a.type === 'no_evidence');
  const biasAnns = record.annotations.filter(a => a.type === 'bias');

  lines.push(`## 📊 纪要质量概览`);
  lines.push('');
  lines.push(`- ✅ 有证据的能力判断：${evidenceAnns.length} 条`);
  lines.push(`- ⚠️ 缺少证据的结论：${noEvidenceAnns.length} 条`);
  lines.push(`- 🚨 可能存在偏见的表述：${biasAnns.length} 条`);
  lines.push(`- 🎯 综合风险评分：${record.riskScore}/100`);
  lines.push('');

  if (evidenceAnns.length > 0) {
    lines.push(`## ✅ 做得好的地方（继续保持）`);
    lines.push('');
    evidenceAnns.slice(0, 5).forEach((ann, idx) => {
      lines.push(`${idx + 1}. **${ann.text}**`);
      if (ann.reason) lines.push(`   - _${ann.reason}_`);
    });
    lines.push('');
  }

  if (noEvidenceAnns.length > 0) {
    lines.push(`## ⚠️ 需要改进：补充行为证据`);
    lines.push('');
    lines.push(`以下表述缺少具体事例支撑，建议下次面试使用 **STAR法则** 记录：`);
    lines.push(`- **S (Situation)**: 具体情境`);
    lines.push(`- **T (Task)**: 任务目标`);
    lines.push(`- **A (Action)**: 候选人采取的行动`);
    lines.push(`- **R (Result)**: 行动结果`);
    lines.push('');
    noEvidenceAnns.slice(0, 8).forEach((ann, idx) => {
      lines.push(`${idx + 1}. ⚠️ **${ann.text}**`);
      if (ann.suggestion) lines.push(`   - 💡 ${ann.suggestion}`);
    });
    lines.push('');
  }

  if (biasAnns.length > 0) {
    lines.push(`## 🚨 需要修正：潜在偏见表述`);
    lines.push('');
    lines.push(`以下表述可能带有主观偏见，建议修改为基于客观行为的描述：`);
    lines.push('');
    biasAnns.forEach((ann, idx) => {
      lines.push(`${idx + 1}. 🚨 **${ann.text}**`);
      if (ann.reason) lines.push(`   - 原因：${ann.reason}`);
      if (ann.suggestion) lines.push(`   - 💡 修正建议：${ann.suggestion}`);
    });
    lines.push('');
  }

  if (record.followUpQuestions.length > 0) {
    lines.push(`## ❓ 下一轮面试建议追问`);
    lines.push('');
    const highPriority = record.followUpQuestions.filter(q => q.priority === 'high');
    const mediumPriority = record.followUpQuestions.filter(q => q.priority === 'medium');
    const lowPriority = record.followUpQuestions.filter(q => q.priority === 'low');

    [...highPriority, ...mediumPriority, ...lowPriority].slice(0, 10).forEach((q, idx) => {
      const priorityIcon = q.priority === 'high' ? '🔴' : q.priority === 'medium' ? '🟡' : '🟢';
      lines.push(`${idx + 1}. ${priorityIcon} ${q.question}`);
    });
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`> 📝 _由面试纪要偏差助手自动生成，请结合实际情况参考使用_`);

  return lines.join('\n');
}

export function exportArchivedVersion(record: InterviewRecord): string {
  const lines: string[] = [];
  lines.push(`# 面试纪要（留档版）`);
  lines.push('');
  lines.push(`- **候选人**: ${record.candidateName}`);
  lines.push(`- **岗位**: ${record.position}`);
  lines.push(`- **面试轮次**: 第${record.round}轮`);
  lines.push(`- **面试官**: ${record.interviewerAlias}`);
  lines.push(`- **日期**: ${record.interviewDate}`);
  lines.push(`- **状态**: ${record.status === 'confirmed' ? '已确认' : '草稿'}`);
  lines.push(`- **风险评分**: ${record.riskScore}/100`);
  lines.push('');
  lines.push(`---`);
  lines.push('');
  lines.push(`## 📄 原始纪要`);
  lines.push('');

  const annsByPara = new Map<number, typeof record.annotations>();
  record.annotations.forEach(ann => {
    const list = annsByPara.get(ann.paragraphIndex) || [];
    list.push(ann);
    annsByPara.set(ann.paragraphIndex, list);
  });

  record.paragraphs.forEach((para, idx) => {
    lines.push(`### 第${idx + 1}段`);
    lines.push('');
    lines.push(`> ${para}`);
    lines.push('');

    const paraAnns = annsByPara.get(idx);
    if (paraAnns && paraAnns.length > 0) {
      paraAnns.forEach(ann => {
        lines.push(`- ${TYPE_EMOJI[ann.type]} **${ANNOTATION_TYPE_LABELS[ann.type]}**：「${ann.text}」`);
        if (ann.reason) lines.push(`  - _原因：${ann.reason}_`);
        if (ann.suggestion) lines.push(`  - _建议：${ann.suggestion}_`);
        if (ann.isManual) lines.push(`  - _✏️ 人工标注/修正_`);
        lines.push(`  - _原文位置：字符 ${ann.start}-${ann.end}_`);
      });
      lines.push('');
    }
  });

  if (record.revisions.length > 0) {
    lines.push(`---`);
    lines.push('');
    lines.push(`## 📝 修正记录`);
    lines.push('');
    record.revisions
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((rev, idx) => {
        const time = new Date(rev.timestamp).toLocaleString('zh-CN');
        const actionText = { add: '新增标注', modify: '修改标注', delete: '删除标注' }[rev.action];
        lines.push(`${idx + 1}. **[${time}]** ${rev.operator === 'user' ? '招聘负责人' : '系统'} - ${actionText}`);
        if (rev.oldValue?.text) lines.push(`   - 修改前：${rev.oldValue.text}`);
        if (rev.newValue?.text) lines.push(`   - 修改后：${rev.newValue.text}`);
      });
    lines.push('');
  }

  if (record.followUpQuestions.length > 0) {
    lines.push(`---`);
    lines.push('');
    lines.push(`## ❓ 下一轮追问建议`);
    lines.push('');
    record.followUpQuestions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.question}${q.isCustom ? ' _(人工添加)_' : ''}`);
    });
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`> 📝 _留档版本，含原始纪要、系统标注、人工修正记录和追问建议_`);

  return lines.join('\n');
}

export function downloadAsFile(content: string, filename: string, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
