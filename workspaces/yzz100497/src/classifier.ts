import { Author, Work, PhotoFile, SubmissionStatus, ProcessedSubmission, Issue } from './types';
import { DetectionResult } from './issueDetector';

export interface ClassifyOptions {
  rejectOnMissingAuthorization: boolean;
  rejectOnSmallImages: boolean;
  rejectOnMissingSignature: boolean;
  allowPendingWithWarnings: boolean;
}

const DEFAULT_OPTIONS: ClassifyOptions = {
  rejectOnMissingAuthorization: true,
  rejectOnSmallImages: true,
  rejectOnMissingSignature: true,
  allowPendingWithWarnings: true
};

export function classifySubmissions(
  authors: Author[],
  detection: DetectionResult,
  options: Partial<ClassifyOptions> = {}
): ProcessedSubmission[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: ProcessedSubmission[] = [];

  for (const author of authors) {
    const { status, reasons } = classifyAuthor(author, detection, opts);

    results.push({
      author,
      status,
      reasons
    });
  }

  return results;
}

function classifyAuthor(
  author: Author,
  detection: DetectionResult,
  options: ClassifyOptions
): { status: SubmissionStatus; reasons: string[] } {
  const reasons: string[] = [];
  let hasRejectionError = false;
  let hasWarning = false;

  const authorIssues = detection.authorIssues.get(author.id) || [];

  for (const issue of authorIssues) {
    const tag = tagIssue(issue, options);
    reasons.push(`${tag} ${issue.message}`);
    if (tag === '[退回]') hasRejectionError = true;
    else if (tag === '[待补]') hasWarning = true;
    else if (tag === '[提醒]') hasWarning = true;
  }

  for (const work of author.works) {
    const workIssues = detection.workIssues.get(work.id) || [];
    const photoIssues: Issue[] = [];
    
    for (const photo of work.photos) {
      const pIssues = detection.photoIssues.get(photo.id) || [];
      photoIssues.push(...pIssues);
    }

    for (const issue of [...workIssues, ...photoIssues]) {
      const tag = tagIssue(issue, options);
      reasons.push(`${tag} ${issue.message}`);
      if (tag === '[退回]') hasRejectionError = true;
      else if (tag === '[待补]') hasWarning = true;
      else if (tag === '[提醒]') hasWarning = true;
    }
  }

  const globalErrors = detection.globalIssues.filter(i => 
    i.relatedItemId === author.id && i.severity === 'error'
  );
  for (const issue of globalErrors) {
    reasons.push(`[信息] ${issue.message}`);
  }

  let status: SubmissionStatus;
  if (hasRejectionError) {
    status = 'rejected';
  } else if (hasWarning && options.allowPendingWithWarnings) {
    status = 'pending';
  } else {
    status = 'selected';
  }

  return { status, reasons };
}

function tagIssue(issue: Issue, options: ClassifyOptions): string {
  if (issue.severity === 'error') {
    if (isRejectionError(issue, options)) {
      return '[退回]';
    }
    return '[待补]';
  }
  if (issue.severity === 'warning') {
    if (isActionableWarning(issue)) {
      return '[待补]';
    }
    return '[提醒]';
  }
  return '[信息]';
}

function isActionableWarning(issue: Issue): boolean {
  return [
    'missing_document',
    'missing_statement',
    'duplicate',
    'missing_signature',
    'missing_authorization'
  ].includes(issue.category);
}

function isRejectionError(issue: Issue, options: ClassifyOptions): boolean {
  switch (issue.category) {
    case 'missing_authorization':
      return options.rejectOnMissingAuthorization;
    case 'missing_signature':
      return options.rejectOnMissingSignature;
    case 'small_image':
      return options.rejectOnSmallImages;
    default:
      return false;
  }
}

export function getSubmissionsByStatus(
  submissions: ProcessedSubmission[],
  status: SubmissionStatus
): ProcessedSubmission[] {
  return submissions.filter(s => s.status === status);
}

export function generateReplyTemplate(
  submission: ProcessedSubmission,
  exhibitionName: string = '影展'
): string {
  const { author, status, reasons } = submission;

  let greeting = `尊敬的${author.name}老师：\n\n`;
  let body = '';
  let closing = `\n此致\n敬礼\n\n${exhibitionName}组委会`;

  const errorReasons = reasons.filter(r => r.startsWith('[退回]'));
  const pendingReasons = reasons.filter(r => r.startsWith('[待补]'));
  const warningReasons = reasons.filter(r => r.startsWith('[提醒]'));
  const infoReasons = reasons.filter(r => r.startsWith('[信息]'));

  switch (status) {
    case 'selected':
      greeting += `您好！很高兴地通知您，您的作品已成功通过${exhibitionName}初筛。\n\n`;
      body += '入围作品：\n';
      for (const work of author.works) {
        body += `- 《${work.title}》 (${work.photos.length}张)\n`;
      }
      if (warningReasons.length > 0) {
        body += '\n需要注意：\n';
        for (const r of warningReasons) {
          body += `- ${r.replace('[提醒] ', '')}\n`;
        }
      }
      if (infoReasons.length > 0) {
        body += '\n温馨提示：\n';
        for (const r of infoReasons) {
          body += `- ${r.replace('[信息] ', '')}\n`;
        }
      }
      body += '\n我们将尽快与您联系后续参展事宜。';
      break;

    case 'pending':
      greeting += `您好！感谢您参加${exhibitionName}投稿。您的作品目前处于待补充材料状态。\n\n`;
      body += '需要补充的材料：\n';
      for (const r of pendingReasons) {
        body += `- ${r.replace('[待补] ', '')}\n`;
      }
      if (warningReasons.length > 0) {
        body += '\n同时请注意：\n';
        for (const r of warningReasons) {
          body += `- ${r.replace('[提醒] ', '')}\n`;
        }
      }
      body += '\n请在7个工作日内补充上述材料，以便我们继续审核。';
      break;

    case 'rejected':
      greeting += `您好！感谢您参加${exhibitionName}投稿。经过评审，很遗憾您的作品未能通过初筛。\n\n`;
      body += '未通过原因：\n';
      for (const r of errorReasons) {
        body += `- ${r.replace('[退回] ', '')}\n`;
      }
      if (pendingReasons.length > 0) {
        body += '\n其他需要补充的材料：\n';
        for (const r of pendingReasons) {
          body += `- ${r.replace('[待补] ', '')}\n`;
        }
      }
      if (warningReasons.length > 0) {
        body += '\n同时请注意：\n';
        for (const r of warningReasons) {
          body += `- ${r.replace('[提醒] ', '')}\n`;
        }
      }
      body += '\n期待您下次继续参与我们的影展。';
      break;
  }

  return greeting + body + closing;
}
