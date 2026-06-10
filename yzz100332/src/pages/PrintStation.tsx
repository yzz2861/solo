import { useAppStore } from "@/store/useAppStore";
import LayoutSettings from "@/components/print/LayoutSettings";
import PrintPreviewSheet from "@/components/print/PrintPreviewSheet";

export default function PrintStation() {
  const tags = useAppStore((s) => s.tags);
  const markPrinted = useAppStore((s) => s.markPrinted);
  const ps = useAppStore((s) => s.printSettings);
  const currentOperator = useAppStore((s) => s.currentOperator);

  const toPrint = (
    ps.onlyConfirmed
      ? tags.filter((t) => t.status === "confirmed")
      : tags.filter((t) => t.status !== "printed")
  );

  function handlePrint() {
    if (toPrint.length === 0) return;
    if (
      !confirm(
        `将打印 ${toPrint.length} 张价签。\n打印完成后这些价签会自动标记为「已打印」，确定开始吗？`
      )
    )
      return;

    const ids = toPrint.map((t) => t.id);
    const originalStatus = new Map(ids.map((id) => [id, tags.find((t) => t.id === id)!.status]));

    const afterPrint = () => {
      window.removeEventListener("afterprint", afterPrint);
      const ok = confirm(
        `✅ ${toPrint.length} 张发送打印。\n\n请确认物理打印机已成功出纸，点击「确定」标记这些价签为已打印，「取消」保留原状态。`
      );
      if (ok) {
        markPrinted(ids);
      } else {
        originalStatus.forEach((_s, _id) => {
          // nothing to do: 保持原状态
        });
      }
    };

    window.addEventListener("afterprint", afterPrint);
    window.print();

    setTimeout(() => window.removeEventListener("afterprint", afterPrint), 30000);
  }

  return (
    <div className="h-full flex min-h-0 overflow-hidden">
      <LayoutSettings onPrint={handlePrint} printCount={toPrint.length} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-100">
        <div className="bg-white border-b border-brand-500/10 px-5 py-3 flex items-center justify-between no-print">
          <h2 className="font-display text-xl text-brand-500">🖨️ 打印工作台</h2>
          <div className="flex items-center gap-4 text-xs text-ink-light">
            <span>
              操作人：
              <b className="text-brand-500">{currentOperator || "未设置"}</b>
            </span>
            <span>
              待打印：<b className="text-warn-dark font-mono text-sm">{toPrint.length}</b> 张
            </span>
          </div>
        </div>
        <PrintPreviewSheet />
      </div>
    </div>
  );
}
