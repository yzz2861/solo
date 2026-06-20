import type {
  Email,
  Attachment,
  ForwardChainItem,
  Supplier,
} from "@/types";
import { MOCK_SUPPLIERS } from "@/data/mockData";

const uuid = () => Math.random().toString(36).slice(2, 10);

const FORWARD_PATTERNS = [
  /^-{2,}\s*转发邮件\s*-{2,}/im,
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
  /^\s*发件人\s*[:：]/m,
  /^\s*From\s*[:：].*\s+(?:Sent|Date|时间)\s*[:：]/im,
  /^>\s*From:\s/m,
];

const REPLY_PATTERNS = [
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^\s*在\s*\d{4}.*写道[:：]?\s*$/m,
  /^On\s+.*wrote[:：]?\s*$/m,
];

export const detectForwardChain = (
  rawContent: string
): { cleanContent: string; forwardChain: ForwardChainItem[]; isForwarded: boolean } => {
  let content = rawContent.trim();
  const chain: ForwardChainItem[] = [];

  const forwardMatch = FORWARD_PATTERNS.some((p) => p.test(content));
  const replyMatch = REPLY_PATTERNS.some((p) => p.test(content));
  const isForwarded = forwardMatch || replyMatch;

  if (isForwarded) {
    const sections = content.split(
      /(?:^-{2,}.*-{2,}$|^\s*发件人\s*[:：].*$|^From\s*[:：].*$)/im
    );
    const headers = content.match(
      /(?:^-{2,}.*-{2,}$|^\s*发件人\s*[:：].*$|^From\s*[:：].*$)/gim
    ) || [];

    for (let i = 1; i < sections.length; i++) {
      const rawChunk = sections[i].trim();
      if (!rawChunk) continue;
      const headerLine = headers[i - 1] || "";
      const senderMatch = headerLine.match(
        /(?:From|发件人)[:：]?\s*([^<\n]+?)(?:\s*<[^>]+>)?(?:\s|$)/i
      );
      const dateMatch = rawChunk.match(
        /(?:时间|Date)[:：]\s*([^\n]+)/i
      );
      chain.push({
        index: chain.length + 1,
        sender: senderMatch?.[1]?.trim() || "未知发件人",
        date: dateMatch?.[1]?.trim() || "未知日期",
        content: rawChunk
          .replace(/^\s*(?:时间|Date|Sent|To|收件人|Subject|主题)[:：][^\n]*\n/gim, "")
          .trim()
          .slice(0, 500),
      });
    }
    content = sections[0].trim();
  }

  return { cleanContent: content, forwardChain: chain, isForwarded };
};

export const detectAttachments = (rawContent: string): Attachment[] => {
  const attachments: Attachment[] = [];
  const patterns = [
    /附件[：:]\s*([^\n，,。；;]+)/g,
    /附件中[是有]\s*([^\n，,。；;]+)/g,
    /见附件\s*[：:]?\s*([^\n，,。；;]*)/g,
  ];
  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(rawContent)) !== null) {
      const fileName = m[1]?.trim();
      if (!fileName) continue;
      let type: Attachment["type"] = "other";
      const lower = fileName.toLowerCase();
      if (/\.(png|jpg|jpeg|gif|bmp|webp)$/.test(lower)) type = "image";
      else if (/\.pdf$/.test(lower)) type = "pdf";
      else if (/\.(xlsx?|xls|csv)$/.test(lower)) type = "excel";
      const isQuote =
        /(报价|quote|price|价格)/i.test(fileName) ||
        /(报价|报价单|价格表)/.test(rawContent.slice(m.index - 20, m.index + 20));
      attachments.push({
        id: `att-${uuid()}`,
        name: fileName,
        type,
        size: Math.floor(Math.random() * 900000) + 100000,
        isQuote,
        isOcrProcessed: type === "image" && isQuote,
        ocrText:
          type === "image" && isQuote
            ? "[OCR转写] 识别到图片中含报价信息，建议人工核对。"
            : undefined,
      });
    }
  }
  return attachments;
};

export const detectSupplier = (
  senderEmail: string,
  subject: string,
  content: string
): Supplier | null => {
  for (const sup of MOCK_SUPPLIERS) {
    if (senderEmail && sup.email && senderEmail.includes(sup.email.split("@")[1])) {
      return sup;
    }
  }
  for (const sup of MOCK_SUPPLIERS) {
    const keys = sup.name.replace(/(有限公司|厂|公司|精密|材料|电子|机械|包装)/g, "").trim();
    if (keys && (subject.includes(keys) || content.includes(keys))) {
      return sup;
    }
  }
  return null;
};

export const detectHeaderFields = (raw: string) => {
  const lines = raw.split(/\r?\n/).slice(0, 15);
  let sender = "";
  let senderEmail = "";
  let subject = "";
  for (const l of lines) {
    const from = l.match(/^(?:发件人|From)[:：]\s*([^<\n]+?)(?:\s*<([^>]+)>)?\s*$/i);
    if (from) {
      sender = from[1]?.trim() || sender;
      senderEmail = from[2] || senderEmail;
    }
    const subj = l.match(/^(?:主题|Subject)[:：]\s*(.+)\s*$/i);
    if (subj) subject = subj[1].trim();
  }
  return { sender, senderEmail, subject };
};

export const parseEmail = (
  rawContent: string,
  overrideSender = "",
  overrideSubject = "",
  overrideSupplier?: Supplier
): Email => {
  const header = detectHeaderFields(rawContent);
  const sender = overrideSender || header.sender || "未知发件人";
  const senderEmail = header.senderEmail || "";
  const subject = overrideSubject || header.subject || "(无主题)";
  const { cleanContent, forwardChain, isForwarded } = detectForwardChain(rawContent);
  const attachments = detectAttachments(rawContent);
  const supplier =
    overrideSupplier || detectSupplier(senderEmail, subject, cleanContent) || MOCK_SUPPLIERS[0];
  return {
    id: `em-${uuid()}`,
    subject,
    sender,
    senderEmail,
    supplierId: supplier.id,
    supplierName: supplier.name,
    receivedAt: new Date().toISOString(),
    content: cleanContent,
    rawContent,
    forwardChain,
    attachments,
    isForwarded,
  };
};
