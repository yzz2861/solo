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
    if (issue.severity === 'error') {
      if (isRejectionError(issue, options)) {
        hasRejectionError = true;
        reasons.push(`[退回] ${issue.message}`);
      } else {
        reasons.push(`[待补] ${issue.message}`);
        hasWarning = true;
      }
    } else if (issue.severity === 'warning') {
      reasons.push(`[提醒] ${issue.message}`);
      hasWarning = true;
    } else {
      reasons.push(`[信息] ${issue.message}`);
    }
  }

  for (const work of author.works) {
    const workIssues = detection.workIssues.get(work.id) || [];
    const photoIssues: Issue[] = [];
    
    for (const photo of work.photos) {
      const pIssues = detection.photoIssues.get(photo.id) || [];
      photoIssues.push(...pIssues);
    }

    for (const issue of [...workIssues, ...photoIssues]) {
      if (issue.severity === 'error') {
        if (isRejectionError(issue, options)) {
          hasRejectionError = true;
          reasons.push(`[退回] ${issue.message}`);
        } else {
          reasons.push(`[待补] ${issue.message}`);
          hasWarning = true;
        }
      } else if (issue.severity === 'warning') {
        reasons.push(`[提醒] ${issue.message}`);
        hasWarning = true;
      } else {
        reasons.push(`[信息] ${issue.message}`);
      }
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

  const errorReasons = reasons.filter(r => r.includes('[退回]'));
  const pendingReasons = reasons.filter(r => r.includes('[待补]'));
  const warningReasons = reasons.filter(r => r.includes('[提醒]'));

  switch (status) {
    case 'selected':
      greeting += `您好！很高兴地通知您，您的作品已成功通过${exhibitionName}初筛。\n\n`;
      body += '入围作品：\n';
      for (const work of author.works) {
        body += `- 《${work.title}》 (${work.photos.length}张)\n`;
      }
      if (warningReasons.length > 0) {
        body += '\n温馨提醒：\n';
        for (const r of warningReasons) {
          body += `- ${r.replace('[提醒] ', '')}\n`;
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
        body += '\n其他需要注意的问题：\n';
        for (const r of pendingReasons) {
          body += `- ${r.replace('[待补] ', '')}\n`;
        }
      }
      body += '\n期待您下次继续参与我们的影展。';
      break;
  }

  return greeting + body + closing;
}
