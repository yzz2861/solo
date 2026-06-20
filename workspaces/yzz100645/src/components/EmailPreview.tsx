import type { Email, Attachment, ForwardChainItem } from "@/types";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ChevronDown,
  ChevronUp,
  FileImage,
  FileSpreadsheet,
  FileText,
  File,
  ScanEye,
  Forward,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  email: Email;
  showRaw?: boolean;
  evidenceRanges?: { range: [number, number]; className: string; label: string }[];
}

export default function EmailPreview({
  email,
  showRaw = false,
  evidenceRanges = [],
}: EmailPreviewProps) {
  const [forwardExpanded, setForwardExpanded] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-steel-50 to-white border-b border-steel-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base font-semibold text-steel-900 truncate">
              {email.subject}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-steel-500 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={12} />
                {email.sender}
                {email.senderEmail && (
                  <span className="text-steel-400">
                    {" "}
                    {"<"}
                    {email.senderEmail}
                    {">"}
                  </span>
                )}
              </span>
              <span>·</span>
              <span>{new Date(email.receivedAt).toLocaleString("zh-CN")}</span>
              {email.isForwarded && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                  <Forward size={11} />
                  转发邮件
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-steel-600 px-2.5 py-1 rounded-lg bg-steel-100">
              {email.supplierName}
            </span>
          </div>
        </div>
      </div>

      {email.attachments.length > 0 && (
        <div className="px-5 py-3 bg-amber-50/40 border-b border-amber-100/50">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-amber-800">
            <Paperclip size={13} />
            附件 ({email.attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        {email.forwardChain.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setForwardExpanded(!forwardExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-steel-50/80 hover:bg-steel-50 text-sm text-steel-600 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <Forward size={14} className="text-steel-400" />
                转发链 ({email.forwardChain.length} 层)
                <span className="text-[11px] text-amber-600 font-medium">
                  · 来自转发链的内容置信度较低
                </span>
              </span>
              {forwardExpanded ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}
            </button>
            <AnimatePresence>
              {forwardExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-dashed border-steel-200">
                    {email.forwardChain.map((item, idx) => (
                      <ForwardChainBlock
                        key={idx}
                        item={item}
                        isLatest={idx === 0}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="text-sm text-steel-800 leading-relaxed whitespace-pre-wrap break-words">
          {highlightContent(
            showRaw ? email.rawContent || email.content : email.content,
            evidenceRanges
          )}
        </div>
      </div>
    </div>
  );
}

function highlightContent(
  content: string,
  ranges: { range: [number, number]; className: string; label: string }[]
) {
  if (!ranges.length) return <p>{content}</p>;

  const sorted = [...ranges].sort((a, b) => a.range[0] - b.range[0]);
  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  sorted.forEach((r, i) => {
    const [start, end] = r.range;
    if (start <= lastEnd) return;
    if (start > lastEnd) {
      segments.push(
        <span key={`text-${i}`}>{content.slice(lastEnd, start)}</span>
      );
    }
    segments.push(
      <mark key={`hl-${i}`} className={cn(r.className)} title={r.label}>
        {content.slice(start, end)}
      </mark>
    );
    lastEnd = end;
  });

  if (lastEnd < content.length) {
    segments.push(<span key="text-end">{content.slice(lastEnd)}</span>);
  }

  return <p>{segments.length > 0 ? segments : content}</p>;
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const Icon = getAttachmentIcon(attachment.type);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all",
        attachment.isQuote
          ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
          : "bg-white border-steel-200 text-steel-600 hover:bg-steel-50"
      )}
    >
      <Icon
        size={14}
        className={attachment.isQuote ? "text-amber-600" : "text-steel-400"}
      />
      <div className="flex flex-col leading-tight">
        <span className="font-medium truncate max-w-[200px]">
          {attachment.name}
        </span>
        <span className="text-[10px] text-steel-400">
          {formatSize(attachment.size)}
          {attachment.isQuote && " · 报价单"}
        </span>
      </div>
      {attachment.isQuote && attachment.isOcrProcessed && (
        <span
          className="inline-flex items-center gap-0.5 pl-2 ml-1 border-l border-amber-200 text-[10px] font-medium text-amber-700"
          title="已进行OCR转写，置信度较低"
        >
          <ScanEye size={11} />
          OCR
        </span>
      )}
    </div>
  );
}

function getAttachmentIcon(type: Attachment["type"]) {
  switch (type) {
    case "image":
      return FileImage;
    case "excel":
      return FileSpreadsheet;
    case "pdf":
      return FileText;
    default:
      return File;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function ForwardChainBlock({
  item,
  isLatest,
}: {
  item: ForwardChainItem;
  isLatest: boolean;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl border",
        isLatest
          ? "bg-steel-50 border-steel-200"
          : "bg-white border-steel-100 opacity-80"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-steel-700 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-md bg-steel-700 text-white flex items-center justify-center text-[10px] font-bold">
            {item.index}
          </span>
          {item.sender}
        </span>
        <span className="text-[11px] text-steel-400">{item.date}</span>
      </div>
      <p className="text-xs text-steel-600 leading-relaxed line-clamp-3">
        {item.content}
      </p>
    </div>
  );
}
