import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { X, Pencil, FileText, Check } from "lucide-react";
import type { ExtractFieldKey, ExtractedField } from "@/types";
import { EXTRACT_FIELD_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import ConfidenceBadge from "./ConfidenceBadge";

interface FieldEditModalProps {
  fieldKey: ExtractFieldKey | null;
  field: ExtractedField<unknown> | null;
  onConfirm: (newValue: unknown, note?: string) => void;
}

export default function FieldEditModal({
  fieldKey,
  field,
  onConfirm,
}: FieldEditModalProps) {
  const { editingField, setEditingField } = useUIStore();
  const isOpen = editingField !== null && fieldKey !== null && field !== null;

  const [value, setValue] = useState<string>("");
  const [note, setNote] = useState("");

  if (!isOpen || !fieldKey || !field) return null;

  const label = EXTRACT_FIELD_LABELS[fieldKey];
  const isList = fieldKey === "alternativeMaterials";
  const isNumber = fieldKey === "quantity" || fieldKey === "price";

  const currentValue = Array.isArray(field.value)
    ? field.value.join("、")
    : field.value === null
    ? ""
    : String(field.value);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingField(null);
      setValue("");
      setNote("");
    } else {
      setValue(currentValue);
    }
  };

  const initialMount = editingField !== null;

  const parseValue = (raw: string): unknown => {
    if (!raw.trim()) return isList ? [] : null;
    if (isList) {
      return raw
        .split(/[、，,；;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (isNumber) {
      const n = parseFloat(raw.replace(/,/g, ""));
      return isNaN(n) ? null : n;
    }
    return raw;
  };

  const handleConfirm = () => {
    const parsed = parseValue(value);
    onConfirm(parsed, note.trim() || undefined);
    setEditingField(null);
    setValue("");
    setNote("");
  };

  return (
    <AnimatePresence>
      {initialMount && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => handleOpenChange(false)}
          className="fixed inset-0 bg-steel-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <header className="px-5 py-4 border-b border-steel-100 bg-gradient-to-r from-steel-50 to-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <Pencil size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-base font-semibold text-steel-900 flex items-center gap-2">
                  编辑{label}
                  <ConfidenceBadge
                    confidence={field.confidence}
                    size="sm"
                    showIcon={false}
                  />
                </h2>
                <p className="text-xs text-steel-500 mt-0.5 truncate">
                  修改后置信度将自动置为高（人工修正）
                </p>
              </div>
              <button
                onClick={() => handleOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-500 hover:text-steel-700 transition-colors"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-steel-600 mb-1.5">
                  当前值
                </label>
                <div className="p-3 rounded-xl bg-steel-50 border border-steel-100">
                  <p className="text-sm text-steel-500 italic">
                    {currentValue || "(空)"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-steel-600 mb-1.5">
                  新值
                  {isList && (
                    <span className="ml-2 text-steel-400 font-normal">
                      用顿号、逗号或分号分隔多项
                    </span>
                  )}
                </label>
                {isNumber ? (
                  <input
                    type="number"
                    step="any"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`请输入${label}`}
                    autoFocus
                    className="input-field text-lg font-mono font-semibold"
                  />
                ) : isList ? (
                  <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`请输入${label}，多项用顿号分隔`}
                    autoFocus
                    rows={3}
                    className="input-field resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`请输入${label}`}
                    autoFocus
                    className="input-field"
                  />
                )}
              </div>

              {field.evidenceSentence && (
                <div>
                  <label className="block text-xs font-medium text-steel-600 mb-1.5 flex items-center gap-1.5">
                    <FileText size={12} className="text-steel-400" />
                    证据句参考
                  </label>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-sm text-amber-800 leading-relaxed">
                    {field.evidenceSentence}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-steel-600 mb-1.5">
                  修正备注
                  <span className="ml-2 text-steel-400 font-normal">可选</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="说明修改原因，便于后续追溯..."
                  rows={2}
                  className="input-field resize-none text-sm"
                />
              </div>
            </div>

            <footer className="px-5 py-4 border-t border-steel-100 bg-steel-50/50 flex items-center justify-end gap-2">
              <button
                onClick={() => handleOpenChange(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className={cn("btn-primary text-sm")}
                disabled={value.trim() === currentValue.trim() && !note.trim()}
              >
                <Check size={15} />
                保存修改
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
