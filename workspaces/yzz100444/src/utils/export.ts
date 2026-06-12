import type { Project, Topic, Answer, ExportOptions } from '@/types';

const getTopicName = (topic: Topic): string => {
  return topic.customName || topic.name;
};

const getAnswersByTopic = (topic: Topic, answers: Answer[]): Answer[] => {
  return answers.filter(a => a.topicId === topic.id);
};

const getRepresentativeAnswers = (topic: Topic, answers: Answer[]): Answer[] => {
  return topic.representativeAnswerIds
    .map(id => answers.find(a => a.id === id))
    .filter((a): a is Answer => !!a);
};

const formatSentiment = (score: number): string => {
  if (score > 0.2) return '正面';
  if (score < -0.2) return '负面';
  return '中性';
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN');
};

export const exportToMarkdown = (
  project: Project,
  options: ExportOptions
): string => {
  const { topics, answers } = project;
  
  let md = `# ${project.name}\n\n`;
  md += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `## 统计概览\n\n`;
  md += `- 导入回答数：${project.importCount}\n`;
  md += `- 去重后有效回答数：${project.cleanedCount}\n`;
  md += `- 重复回答数：${project.duplicateCount}\n`;
  md += `- 主题数：${topics.length}\n`;
  md += `- 高风险主题数：${topics.filter(t => t.isRisk).length}\n\n`;
  
  const pinnedTopics = topics.filter(t => t.isPinned);
  const normalTopics = topics.filter(t => !t.isPinned);
  
  if (options.includeRiskAnalysis && pinnedTopics.length > 0) {
    md += `## ⚠️ 重要风险置顶\n\n`;
    for (const topic of pinnedTopics) {
      md += `### ${getTopicName(topic)}\n\n`;
      md += `- 回答数量：${topic.answerCount} (${topic.percentage.toFixed(1)}%)\n`;
      md += `- 风险等级：${topic.riskScore >= 3 ? '高' : topic.riskScore >= 2 ? '中' : '低'}\n`;
      md += `- 风险原因：${topic.riskReason || '无'}\n`;
      md += `- 情感倾向：${formatSentiment(topic.sentimentScore)}\n`;
      md += `- 关键词：${topic.keywords.join('、')}\n\n`;
      
      const representatives = getRepresentativeAnswers(topic, answers);
      md += `**代表原话：**\n\n`;
      for (const answer of representatives) {
        md += `> ${answer.originalText}\n\n`;
      }
    }
  }
  
  md += `## 主题分析\n\n`;
  const allTopics = [...pinnedTopics, ...normalTopics];
  for (const topic of allTopics) {
    if (topic.isPinned && options.includeRiskAnalysis) continue;
    
    md += `### ${getTopicName(topic)}\n\n`;
    md += `- 回答数量：${topic.answerCount} (${topic.percentage.toFixed(1)}%)\n`;
    if (topic.isRisk) {
      md += `- ⚠️ 风险等级：${topic.riskScore >= 3 ? '高' : topic.riskScore >= 2 ? '中' : '低'}\n`;
    }
    md += `- 情感倾向：${formatSentiment(topic.sentimentScore)}\n`;
    md += `- 关键词：${topic.keywords.join('、')}\n\n`;
    
    const representatives = getRepresentativeAnswers(topic, answers);
    md += `**代表原话：**\n\n`;
    for (const answer of representatives) {
      md += `> ${answer.originalText}\n\n`;
    }
    
    if (options.includeRawAnswers && !options.includeRepresentativesOnly) {
      const topicAnswers = getAnswersByTopic(topic, answers);
      md += `<details><summary>查看全部 ${topicAnswers.length} 条回答</summary>\n\n`;
      for (const answer of topicAnswers) {
        md += `- ${answer.originalText}`;
        if (answer.userId) md += ` (用户：${answer.userId})`;
        md += '\n';
      }
      md += `\n</details>\n\n`;
    }
  }
  
  return md;
};

export const exportToCSV = (
  project: Project,
  options: ExportOptions
): string => {
  const { topics, answers } = project;
  
  const rows: string[][] = [];
  
  rows.push([
    '主题ID',
    '主题名称',
    '是否风险',
    '风险等级',
    '回答数量',
    '占比',
    '关键词',
    '代表原话',
    '原始回答',
    '用户ID',
    '提交时间',
  ]);
  
  for (const topic of topics) {
    const topicAnswers = getAnswersByTopic(topic, answers);
    const representatives = getRepresentativeAnswers(topic, answers);
    const repTexts = representatives.map(r => r.originalText).join(' | ');
    
    if (options.includeRepresentativesOnly) {
      for (const answer of representatives) {
        rows.push([
          topic.id,
          getTopicName(topic),
          topic.isRisk ? '是' : '否',
          topic.riskScore >= 3 ? '高' : topic.riskScore >= 2 ? '中' : '低',
          topic.answerCount.toString(),
          `${topic.percentage.toFixed(1)}%`,
          topic.keywords.join('、'),
          repTexts,
          answer.originalText,
          answer.userId || '',
          answer.submitTime ? formatDate(answer.submitTime) : '',
        ]);
      }
    } else {
      for (const answer of topicAnswers) {
        rows.push([
          topic.id,
          getTopicName(topic),
          topic.isRisk ? '是' : '否',
          topic.riskScore >= 3 ? '高' : topic.riskScore >= 2 ? '中' : '低',
          topic.answerCount.toString(),
          `${topic.percentage.toFixed(1)}%`,
          topic.keywords.join('、'),
          repTexts,
          answer.originalText,
          answer.userId || '',
          answer.submitTime ? formatDate(answer.submitTime) : '',
        ]);
      }
    }
  }
  
  return '\uFEFF' + rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
};

export const exportToJSON = (
  project: Project,
  options: ExportOptions
): string => {
  const data: any = {
    projectName: project.name,
    exportTime: new Date().toISOString(),
    stats: {
      importCount: project.importCount,
      cleanedCount: project.cleanedCount,
      duplicateCount: project.duplicateCount,
      topicCount: project.topics.length,
      riskTopicCount: project.topics.filter(t => t.isRisk).length,
    },
    topics: [],
  };
  
  for (const topic of project.topics) {
    const topicData: any = {
      id: topic.id,
      name: getTopicName(topic),
      isRisk: topic.isRisk,
      riskScore: topic.riskScore,
      riskReason: topic.riskReason,
      answerCount: topic.answerCount,
      percentage: topic.percentage,
      keywords: topic.keywords,
      sentiment: formatSentiment(topic.sentimentScore),
      representativeAnswers: getRepresentativeAnswers(topic, project.answers).map(a => ({
        id: a.id,
        text: a.originalText,
        userId: a.userId,
        submitTime: a.submitTime,
        matchedRiskKeywords: a.matchedRiskKeywords,
      })),
    };
    
    if (options.includeRawAnswers && !options.includeRepresentativesOnly) {
      topicData.allAnswers = getAnswersByTopic(topic, project.answers).map(a => ({
        id: a.id,
        text: a.originalText,
        userId: a.userId,
        submitTime: a.submitTime,
        matchedRiskKeywords: a.matchedRiskKeywords,
        isDuplicate: a.isDuplicate,
      }));
    }
    
    data.topics.push(topicData);
  }
  
  return JSON.stringify(data, null, 2);
};

export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportProject = (
  project: Project,
  options: ExportOptions
): void => {
  let content: string;
  let filename: string;
  let mimeType: string;
  
  const baseName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  
  switch (options.format) {
    case 'markdown':
      content = exportToMarkdown(project, options);
      filename = `${baseName}_分析报告.md`;
      mimeType = 'text/markdown';
      break;
    case 'csv':
      content = exportToCSV(project, options);
      filename = `${baseName}_分析数据.csv`;
      mimeType = 'text/csv;charset=utf-8';
      break;
    case 'json':
      content = exportToJSON(project, options);
      filename = `${baseName}_分析数据.json`;
      mimeType = 'application/json';
      break;
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
  
  downloadFile(content, filename, mimeType);
};
