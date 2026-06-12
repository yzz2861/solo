import { useEffect, useState } from 'react';
import TopBar from '@/components/panels/TopBar';
import CraneParams from '@/components/panels/CraneParams';
import CargoParams from '@/components/panels/CargoParams';
import OperationPanel from '@/components/panels/OperationPanel';
import SceneCanvas from '@/components/scene/SceneCanvas';
import RiskPanel from '@/components/panels/RiskPanel';
import StatusBar from '@/components/panels/StatusBar';
import { usePlanStore } from '@/hooks/usePlanStore';
import { useRiskEngine } from '@/hooks/useRiskEngine';

export default function SceneHome() {
  const plan = usePlanStore((s) => s.currentPlan);
  const setRisks = usePlanStore((s) => s.setRisks);
  const loadPlansFromDB = usePlanStore((s) => s.loadPlansFromDB);

  const [activeOpId, setActiveOpId] = useState<string | undefined>(
    plan.operations[0]?.id
  );
  const [animate, setAnimate] = useState(true);

  const { allRisks, operationRisks, summary, cargoTon, firstOpSafeRadius } =
    useRiskEngine(
      plan.crane,
      plan.cargo,
      plan.zones,
      plan.operations,
      plan.windSpeed
    );

  useEffect(() => {
    setRisks(allRisks);
  }, [allRisks, setRisks]);

  useEffect(() => {
    loadPlansFromDB();
  }, [loadPlansFromDB]);

  useEffect(() => {
    if (!activeOpId && plan.operations.length > 0) {
      setActiveOpId(plan.operations[0].id);
    }
  }, [plan.operations, activeOpId]);

  const hasDanger = summary.danger > 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-dock-950 overflow-hidden">
      <TopBar />

      <div className="flex-1 flex min-h-0">
        <aside className="w-[360px] flex flex-col gap-2 p-2 overflow-y-auto border-r border-dock-700/60 bg-dock-900/60">
          <CraneParams />
          <CargoParams />
          <OperationPanel
            activeOpId={activeOpId}
            setActiveOpId={setActiveOpId}
            animate={animate}
            setAnimate={setAnimate}
          />
        </aside>

        <main className="flex-1 relative min-w-0">
          <SceneCanvas
            plan={plan}
            operationRisks={operationRisks}
            activeOperationId={animate ? activeOpId : undefined}
            hasDanger={hasDanger}
          />
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-dock-900/80 backdrop-blur-md text-[11px] text-slate-300 border border-dock-700/60 pointer-events-none">
            坐标网格：8m / 主格 32m · 鼠标左键旋转 / 右键平移 / 滚轮缩放
          </div>
        </main>

        <aside className="w-[380px] p-2 border-l border-dock-700/60 bg-dock-900/60 min-h-0">
          <RiskPanel
            plan={plan}
            risks={allRisks}
            summary={summary}
            operationRisks={operationRisks}
            cargoTon={cargoTon}
            firstOpSafeRadius={firstOpSafeRadius}
          />
        </aside>
      </div>

      <StatusBar
        plan={plan}
        operationRisks={operationRisks}
        firstOpSafeRadius={firstOpSafeRadius}
      />
    </div>
  );
}
