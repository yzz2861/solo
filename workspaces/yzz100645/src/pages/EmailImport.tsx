import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Mail,
  Sparkles,
  ChevronDown,
  Building2,
  FileText,
  AlertCircle,
  Wand2,
  ArrowRight,
  History,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/stores/emailStore";
import { useCommitmentStore } from "@/stores/commitmentStore";
import { useUIStore } from "@/stores/uiStore";
import type { Supplier, Email } from "@/types";
import EmailPreview from "@/components/EmailPreview";

const SAMPLE_EMAILS = [
  {
    name: "标准承诺 - 鑫达电子",
    content: `主题: RE: PO-2026-0618 交期确认
发件人: 王经理 <wang.xd@xinda-electronics.com>

您好陈采购，

关于贵司订单 PO-2026-0618 的交期，我们确认如下：
预计下周三发 200 个，请知悉。
价格按上次的单价执行，人民币 12.5 元/个。

另外，这批货中有 50 个我们会使用替代料 XDA-220B（原物料为 XDA-220A），参数完全一致，请确认是否同意。
付款条件：款到发货。

有问题随时联系，谢谢！

鑫达电子 王经理`,
  },
  {
    name: "转发链 + 模糊时间 - 华瑞精密",
    content: `陈采购，这封是华瑞李总刚发的，你看看怎么处理。

---------- 转发邮件 ----------
发件人: 李总 <lihua@huarui-precision.com>
时间: 2026-06-19 10:30

关于 PO-2026-0610 / PO-2026-0612 两张订单的交付：
我们这边大概6月底左右可以安排出货，数量总共是 1500 套。
价格方面，由于钢材价格上涨，单价需要调整到 ¥48.00，较上次上浮 5%。

还请贵司确认价格，确认后我们安排生产。

华瑞精密 李总`,
  },
  {
    name: "反悔上下文 + 分批交付 - 科瑞包装",
    content: `主题: 更正 - PO-2026-0601 交期变更
发件人: 陈经理 <chen.k@kerui-pack.com>

陈采购您好：

很抱歉，关于 PO-2026-0601 之前说本周能交 5000 个的，现在可能需要延后。

刚才车间那边反馈，因为近期环保检查比较严，产能受限，我们更正一下：
PO-2026-0601 的交期预计推到 7 月 5 日，数量 3000 个，剩下 2000 个 7 月 15 日前补。
价格不变，还是按合同 0.85 元/只。

再次抱歉给贵司造成不便，请谅解。

科瑞包装 陈经理`,
  },
];

export default function EmailImport() {
  const navigate = useNavigate();
  const { suppliers, importEmail } = useEmailStore();
  const { createCommitment } = useCommitmentStore();
  const { showToast } = useUIStore();

  const [rawContent, setRawContent] = useState("");
  const [overrideSender, setOverrideSender] = useState("");
  const [overrideSubject, setOverrideSubject] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [parsedEmail, setParsedEmail] = useState<Email | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSampleLoading, setIsSampleLoading] = useState(false);

  const canParse = rawContent.trim().length > 20;
  const hasQuoteAttachment = parsedEmail?.attachments.some((a) => a.isQuote);

  const handleParse = () => {
    if (!canParse) return;
    setIsProcessing(true);
    setTimeout(() => {
      const email = importEmail(
        rawContent,
        overrideSender || undefined,
        overrideSubject || undefined,
        selectedSupplier || undefined
      );
      setParsedEmail(email);
      setIsProcessing(false);
      showToast("info", "邮件解析完成，可预览结构后确认导入");
    }, 600);
  };

  const handleConfirm = () => {
    if (!parsedEmail) return;
    setIsProcessing(true);
    setTimeout(() => {
      createCommitment(parsedEmail);
      setIsProcessing(false);
      showToast("success", "承诺抽取完成，跳转至确认页面");
      setTimeout(() => {
        navigate(`/commitments/pending`);
      }, 800);
    }, 800);
  };

  const handleSample = (content: string) => {
    setIsSampleLoading(true);
    setTimeout(() => {
      setRawContent(content);
      setOverrideSender("");
      setOverrideSubject("");
      setSelectedSupplier(null);
      setParsedEmail(null);
      setIsSampleLoading(false);
    }, 300);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      setRawContent(text);
      showToast("success", `已导入文件: ${file.name}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="h1-display">邮件导入</h1>
          <p className="text-sm text-steel-500 mt-1">
            粘贴邮件正文或上传邮件文件，系统将自动识别转发链、附件并抽取承诺信息
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card gradient-border p-5"
          >
            <h2 className="h3-card mb-4 flex items-center gap-2">
              <Mail size={16} className="text-steel-600" />
              快速导入示例
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_EMAILS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSample(sample.content)}
                  disabled={isSampleLoading}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all group",
                    "bg-white border-steel-100 hover:border-steel-300 hover:shadow-card-hover hover:-translate-y-0.5",
                    isSampleLoading && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Wand2
                      size={14}
                      className="text-amber-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform"
                    />
                    <p className="text-xs font-medium text-steel-700 leading-snug">
                      {sample.name}
                    </p>
                  </div>
                  <p className="text-[11px] text-steel-400 mt-2 pl-6 line-clamp-2">
                    点击加载示例邮件正文，体验完整抽取流程
                  </p>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card gradient-border p-5"
          >
            <h2 className="h3-card mb-4 flex items-center gap-2">
              <FileText size={16} className="text-steel-600" />
              邮件元信息
              <span className="text-[11px] font-normal text-steel-400 ml-2">
                可选，留空则从正文自动提取
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-steel-600 mb-1.5">
                  发件人
                </label>
                <input
                  type="text"
                  value={overrideSender}
                  onChange={(e) => setOverrideSender(e.target.value)}
                  placeholder="如：王经理"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-steel-600 mb-1.5">
                  邮件主题
                </label>
                <input
                  type="text"
                  value={overrideSubject}
                  onChange={(e) => setOverrideSubject(e.target.value)}
                  placeholder="如：RE: PO-2026-0618 交期确认"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-steel-600 mb-1.5">
                供应商
                <span className="text-steel-400 font-normal ml-2">
                  留空自动识别
                </span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-steel-200 bg-white hover:border-steel-300 transition-colors"
                >
                  <span
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      selectedSupplier ? "text-steel-800" : "text-steel-400"
                    )}
                  >
                    <Building2 size={14} />
                    {selectedSupplier
                      ? `${selectedSupplier.name}（${selectedSupplier.contactPerson}）`
                      : "选择或搜索供应商..."}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-steel-400 transition-transform",
                      supplierDropdownOpen && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {supplierDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      className="absolute left-0 right-0 mt-2 p-2 rounded-xl bg-white border border-steel-100 shadow-xl z-20 max-h-64 overflow-y-auto scrollbar-thin"
                    >
                      {suppliers.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedSupplier(s);
                            setSupplierDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                            selectedSupplier?.id === s.id
                              ? "bg-steel-700 text-white"
                              : "hover:bg-steel-50 text-steel-700"
                          )}
                        >
                          <p className="font-medium truncate">{s.name}</p>
                          <p
                            className={cn(
                              "text-[11px] mt-0.5",
                              selectedSupplier?.id === s.id
                                ? "text-steel-200"
                                : "text-steel-400"
                            )}
                          >
                            {s.contactPerson} · {s.email}
                          </p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card gradient-border p-5"
          >
            <h2 className="h3-card mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Upload size={16} className="text-steel-600" />
                邮件正文
              </span>
              <label
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all",
                  "bg-steel-50 text-steel-600 hover:bg-steel-100 border border-steel-200"
                )}
              >
                <Upload size={12} />
                上传 .eml/.txt
                <input
                  type="file"
                  accept=".txt,.eml,.html"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={cn(
                "relative rounded-2xl transition-all",
                dragActive && "ring-2 ring-steel-500 ring-offset-2"
              )}
            >
              <textarea
                value={rawContent}
                onChange={(e) => {
                  setRawContent(e.target.value);
                  setParsedEmail(null);
                }}
                rows={16}
                placeholder={
                  "将供应商邮件正文粘贴到此处...\n\n例如：\n您好陈采购，关于贵司订单的交期，我们确认如下：\n预计下周三发 200 个，请知悉。\n价格按上次的单价执行，人民币 12.5 元/个。\n..."
                }
                className="textarea-field text-sm font-mono leading-relaxed min-h-[280px]"
              />
              {rawContent.length === 0 && dragActive && (
                <div className="absolute inset-0 rounded-2xl bg-steel-50/80 backdrop-blur-sm flex items-center justify-center pointer-events-none border-2 border-dashed border-steel-400">
                  <div className="text-center">
                    <Upload
                      size={36}
                      className="text-steel-400 mx-auto mb-2"
                    />
                    <p className="text-sm font-medium text-steel-600">
                      释放鼠标以上传文件
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-xs text-steel-500">
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} />
                  {rawContent.length.toLocaleString()} 字符
                </span>
                {!canParse && rawContent.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertCircle size={12} />
                    内容过短，可能无法有效抽取
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRawContent("");
                    setParsedEmail(null);
                  }}
                  disabled={!rawContent}
                  className={cn(
                    "btn-secondary text-sm",
                    !rawContent && "opacity-50 cursor-not-allowed"
                  )}
                >
                  清空
                </button>
                <button
                  onClick={handleParse}
                  disabled={!canParse || isProcessing}
                  className={cn(
                    "btn-primary text-sm",
                    (!canParse || isProcessing) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Sparkles size={15} />
                  {isProcessing ? "解析中..." : "解析邮件"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <AnimatePresence mode="wait">
            {!parsedEmail ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-card gradient-border p-6 h-full min-h-[400px]"
              >
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-steel-100 to-amber-50 flex items-center justify-center mb-5 shadow-inner">
                    <Sparkles
                      size={32}
                      className="text-steel-400"
                    />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-steel-800 mb-2">
                    解析预览区
                  </h3>
                  <p className="text-sm text-steel-500 max-w-xs leading-relaxed mb-6">
                    粘贴邮件正文并点击「解析邮件」后，
                    <br />
                    此处将展示邮件结构、转发链、附件识别结果
                  </p>
                  <div className="space-y-2 w-full max-w-xs text-left">
                    {[
                      "转发链自动识别并折叠",
                      "附件列表与报价单标记",
                      "证据句位置高亮显示",
                      "供应商信息自动匹配",
                    ].map((text, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-steel-600"
                      >
                        <CheckCircle2
                          size={14}
                          className="text-emerald-500 flex-shrink-0"
                        />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">
                      解析完成
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      检测到 {parsedEmail.forwardChain.length} 层转发链 ·{" "}
                      {parsedEmail.attachments.length} 个附件
                      {hasQuoteAttachment && " · 含报价单附件"}
                    </p>
                  </div>
                </div>

                {hasQuoteAttachment && (
                  <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <AlertCircle
                      size={16}
                      className="text-amber-600 mt-0.5 flex-shrink-0"
                    />
                    <div className="text-xs text-amber-800">
                      <p className="font-semibold mb-0.5">
                        ⚠️ 检测到报价单附件
                      </p>
                      <p className="text-amber-700 leading-relaxed">
                        报价信息可能包含在附件中，若附件为图片已自动进行OCR转写，
                        抽取结果置信度较低，请务必人工核对。
                      </p>
                    </div>
                  </div>
                )}

                <EmailPreview email={parsedEmail} />

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={cn(
                    "w-full btn-primary py-3 text-base",
                    isProcessing && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Sparkles size={18} className="animate-spin" />
                      抽取承诺中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      确认导入并抽取承诺
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card gradient-border p-5"
          >
            <h3 className="h3-card mb-3 flex items-center gap-2">
              <History size={14} className="text-steel-500" />
              最近导入
            </h3>
            <RecentEmails />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function RecentEmails() {
  const { emails } = useEmailStore();
  const navigate = useNavigate();

  const recent = emails.slice(0, 5);

  if (recent.length === 0) {
    return (
      <p className="text-xs text-steel-400 py-4 text-center">
        暂无导入记录
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {recent.map((email, i) => (
        <motion.div
          key={email.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => navigate("/commitments/pending")}
          className="p-2.5 rounded-lg hover:bg-steel-50 cursor-pointer transition-colors group"
        >
          <p className="text-xs font-medium text-steel-700 truncate">
            {email.subject}
          </p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-steel-400">
            <span>{email.sender}</span>
            <div className="flex items-center gap-2">
              {email.isForwarded && (
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                  转发
                </span>
              )}
              {email.attachments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-steel-50 text-steel-500">
                  {email.attachments.length}附件
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
