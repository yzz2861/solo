import { Scene3D } from "@/components/Scene3D";
import { ComponentPanel } from "@/components/ComponentPanel";
import { PropertyPanel } from "@/components/PropertyPanel";
import { RiskPanel } from "@/components/RiskPanel";
import { Toolbar } from "@/components/Toolbar";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <ComponentPanel />
        <div className="flex-1 relative">
          <Scene3D />
        </div>
        <div className="flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PropertyPanel />
          </div>
          <div className="h-64 shrink-0">
            <RiskPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
