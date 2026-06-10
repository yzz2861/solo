import { useAppStore } from "@/store/useAppStore";
import { exportLogsCsv, exportTagsCsv, downloadCsv } from "@/utils/exporter";
import { FileDown } from "lucide-react";
import { todayStr } from "@/utils/id";

export default function ExportBtn() {
  const tags = useAppStore((s) => s.tags);
  const logs = useAppStore((s) => s.logs);

  function d(name: "logs" | "tags") {
    const date = todayStr();
    if (name === "tags") {
      downloadCsv(exportTagsCsv(tags), `价签全量-${date}.csv`);
    } else {
      downloadCsv(exportLogsCsv(logs, tags), `交班流水-${date}.csv`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button className="btn !py-1.5 text-sm" onClick={() => d("tags")}>
        <FileDown size={14} /> 导出价签
      </button>
      <button className="btn-primary !py-1.5 text-sm" onClick={() => d("logs")}>
        <FileDown size={14} /> 导出交班流水
      </button>
    </div>
  );
}
