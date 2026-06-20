import { ReactNode } from "react";
import {
  CalendarDays,
  Package,
  BadgeDollarSign,
  RefreshCcw,
  FileText,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import type {
  ExtractedField,
  ConfidenceLevel,
  ExtractFieldKey,
} from "@/types";
import { EXTRACT_FIELD_LABELS, EXTRACT_FIELD_ICONS } from "@/types";
import { cn } from "@/lib/utils";
import ConfidenceBadge, { ReasonTagList } from "./ConfidenceBadge";

interface FieldCardProps<T> {
  fieldKey: ExtractFieldKey;
  field: ExtractedField<T>;
  valueRender: (value: T | null) => ReactNode;
  onEdit?: () => void;
  onEvidenceClick?: () => void;
  animationDelay?: number;
  compact?: boolean;
}

const iconMap: Record<string, typeof CalendarDays> = {
  CalendarDays,
  Package,
  BadgeDollarSign,
  RefreshCcw,
  FileText,
};

const fieldColorClasses: Record<
  ExtractFieldKey,
  { bg: string; text: string; bar: string; evidence: string }
> = {
  deliveryDate: {
    bg: "from-emerald-50 to-emerald-100/40",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    evidence: "evidence-highlight-delivery",
  },
  quantity: {
    bg: "from-sky-50 to-sky-100/40",
    text: "text-sky-700",
    bar: "bg-sky-500",
    evidence: "evidence-highlight-quantity",
  },
  price: {
    bg: "from-amber-50 to-amber-100/40",
    text: "text-amber-700",
    bar: "bg-amber-500",
    evidence: "evidence-highlight-price",
  },
  alternativeMaterials: {
    bg: "from-violet-50 to-violet-100/40",
    text: "text-violet-700",
    bar: "bg-violet-500",
    evidence: "evidence-highlight-alternative",
  },
  additionalTerms: {
    bg: "from-rose-50 to-rose-100/40",
    text: "text-rose-700",
    bar: "bg-rose-500",
    evidence: "evidence-highlight-terms",
  },
};

export default function FieldCard<T>({
  fieldKey,
  field,
  valueRender,
  onEdit,
  onEvidenceClick,
  animationDelay = 0,
  compact = false,
}: FieldCardProps<T>) {
  const label = EXTRACT_FIELD_LABELS[fieldKey];
  const Icon = iconMap[EXTRACT_FIELD_ICONS[fieldKey]];
  const colors = fieldColorClasses[fieldKey];

  const confidence: ConfidenceLevel = field.confidence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.4, ease: "easeOut" }}
      className="field-card glass-card-hover group"
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
          colors.bar,
          field.confidence === "low" && "animate-pulse-soft"
        )}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
              colors.bg,
              colors.text
            )}
          >
            {Icon && <Icon size={16} />}
          </div>
          <div>
            <h3 className="h3-card">{label}</h3>
            <p className="text-[11px] text-steel-500 mt-0.5">
              自动抽取
              {field.isEdited && (
                <span className="ml-1.5 text-sky-600 font-medium">
                  · 已人工修正
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ConfidenceBadge confidence={confidence} />
          {onEdit && (
            <button
              onClick={onEdit}
              className={cn(
                "p-1.5 rounded-lg text-steel-400 hover:bg-steel-100 hover:text-steel-700 transition-all opacity-0 group-hover:opacity-100"
              )}
              title={`编辑${label}`}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mb-3 px-3 py-3 rounded-xl bg-gradient-to-r",
          colors.bg,
          "border border-white/60"
        )}
      >
        <div
          className={cn(
            "font-serif font-semibold tracking-tight",
            colors.text,
            compact ? "text-lg" : "text-2xl"
          )}
        >
          {field.value === null ||
          (Array.isArray(field.value) && field.value.length === 0) ? (
            <span className="text-steel-400 font-normal text-base italic">
              未抽取到
            </span>
          ) : (
            valueRender(field.value)
          )}
        </div>
      </div>

      {field.evidenceSentence && (
        <div
          onClick={onEvidenceClick}
          className={cn(
            "mt-2 p-2.5 rounded-lg bg-white/50 border border-steel-100 text-xs leading-relaxed text-steel-700 cursor-pointer hover:bg-white transition-colors",
            onEvidenceClick && colors.evidence
          )}
        >
          <div className="flex items-start gap-1.5 mb-1">
            <AlertCircle size={12} className="text-steel-400 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] font-medium text-steel-500 uppercase tracking-wide">
              证据句
            </span>
          </div>
          <p className="text-steel-700 pl-[18px] line-clamp-2">
            {field.evidenceSentence}
          </p>
        </div>
      )}

      {field.reasons.length > 1 && !compact && (
        <div className="mt-3 pt-3 border-t border-dashed border-steel-100">
          <ReasonTagList reasons={field.reasons} />
        </div>
      )}
    </motion.div>
  );
}
