import { useState } from "react";
import SidePanel from "@/components/layout/SidePanel";
import EditableTable from "@/components/input/EditableTable";
import PreviewWall from "@/components/preview/PreviewWall";
import IssuesDrawer from "@/components/issues/IssuesDrawer";
import StatsBar from "@/components/issues/StatsBar";

export default function Workbench() {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col">
      <StatsBar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidePanel />
        <EditableTable highlightId={highlightId} setHighlightId={setHighlightId} />
        <PreviewWall highlightId={highlightId} setHighlightId={setHighlightId} />
      </div>
      <IssuesDrawer />
    </div>
  );
}
