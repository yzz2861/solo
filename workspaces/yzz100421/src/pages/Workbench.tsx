import { useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import FactoryScene from '@/components/three/FactoryScene';
import SchemeManagerModal from '@/components/modals/SchemeManagerModal';
import CompareModal from '@/components/modals/CompareModal';
import ExportReportModal from '@/components/modals/ExportReportModal';
import { useLayoutStore } from '@/store/useLayoutStore';
import { tickSimulation } from '@/engine/simulationEngine';
import { detectOverflows } from '@/engine/overflowDetector';
import { cn } from '@/lib/utils';

/**
 * 主工作台页面
 * 布局：左侧 ParamsPanel | 中间 3D Canvas | 右侧 Toolbar | 底部 SimulationBar
 */
export default function Workbench() {
  const initDefaultDemo = useLayoutStore((s) => s.initDefaultDemo);
  const toolMode = useLayoutStore((s) => s.toolMode);
  const entities = useLayoutStore((s) => s.entities);

  // 初始化演示数据
  useEffect(() => {
    initDefaultDemo();
    // 初始化后立即执行一次参数验证
    useLayoutStore.getState().validateAll();
  }, [initDefaultDemo]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useLayoutStore.getState().setToolMode('select');
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0F172A]">
      {/* 主体区域：左中右布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：参数面板 */}
        <aside className="w-72 shrink-0 border-r border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <ParamsPanel />
        </aside>

        {/* 中间：3D 画布 */}
        <main className="relative flex-1 overflow-hidden">
          {/* 工具模式提示 */}
          {toolMode !== 'select' && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-blue-600/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
              点击地面添加{getToolModeLabel(toolMode)}，按 ESC 取消
            </div>
          )}

          <Canvas
            camera={{ position: [0, 30, 30], fov: 50 }}
            shadows
            gl={{ antialias: true }}
          >
            <SimulationDriver />
            <FactoryScene />
          </Canvas>
        </main>

        {/* 右侧：工具栏 */}
        <aside className="w-56 shrink-0 border-l border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <Toolbar />
        </aside>
      </div>

      {/* 底部：模拟控制栏 */}
      <footer className="h-16 shrink-0 border-t border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
        <SimulationBar />
      </footer>

      {/* 弹窗组件 */}
      <SchemeManagerModal />
      <CompareModal />
      <ExportReportModal />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 左侧参数面板
// ---------------------------------------------------------------------------

function ParamsPanel() {
  const agvParams = useLayoutStore((s) => s.agvParams);
  const corridorParams = useLayoutStore((s) => s.corridorParams);
  const setAgvParams = useLayoutStore((s) => s.setAgvParams);
  const setCorridorParams = useLayoutStore((s) => s.setCorridorParams);
  const validationErrors = useLayoutStore((s) => s.validationErrors);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-700/50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-100">参数设置</h2>
      </div>

      <div className="flex-1 space-y-6 p-4">
        {/* AGV 参数 */}
        <section>
          <h3 className="mb-3 text-sm font-medium text-slate-300">AGV 车辆参数</h3>
          <div className="space-y-3">
            <NumberInput
              label="车体长度 (m)"
              value={agvParams.lengthMeters}
              onChange={(v) => setAgvParams({ lengthMeters: v })}
              error={validationErrors.lengthMeters}
              step={0.1}
              min={0.5}
              max={5}
            />
            <NumberInput
              label="车体宽度 (m)"
              value={agvParams.widthMeters}
              onChange={(v) => setAgvParams({ widthMeters: v })}
              error={validationErrors.widthMeters}
              step={0.1}
              min={0.3}
              max={3}
            />
            <NumberInput
              label="转弯半径 (m)"
              value={agvParams.turningRadius}
              onChange={(v) => setAgvParams({ turningRadius: v })}
              error={validationErrors.turningRadius}
              step={0.1}
              min={0.5}
              max={5}
            />
            <NumberInput
              label="充电时间 (分钟)"
              value={agvParams.chargeMinutes}
              onChange={(v) => setAgvParams({ chargeMinutes: v })}
              error={validationErrors.chargeMinutes}
              step={5}
              min={5}
              max={120}
            />
            <NumberInput
              label="高峰车辆数"
              value={agvParams.peakCount}
              onChange={(v) => setAgvParams({ peakCount: v })}
              error={validationErrors.peakCount}
              step={1}
              min={1}
              max={100}
            />
            <NumberInput
              label="低峰车辆数"
              value={agvParams.offPeakCount}
              onChange={(v) => setAgvParams({ offPeakCount: v })}
              error={validationErrors.offPeakCount}
              step={1}
              min={1}
              max={50}
            />
          </div>
        </section>

        {/* 通道参数 */}
        <section>
          <h3 className="mb-3 text-sm font-medium text-slate-300">通道参数</h3>
          <div className="space-y-3">
            <NumberInput
              label="主通道宽度 (m)"
              value={corridorParams.mainCorridorWidth}
              onChange={(v) => setCorridorParams({ mainCorridorWidth: v })}
              error={validationErrors.mainCorridorWidth}
              step={0.1}
              min={1}
              max={10}
            />
            <NumberInput
              label="叉车通道宽 (m)"
              value={corridorParams.forkliftWidth}
              onChange={(v) => setCorridorParams({ forkliftWidth: v })}
              error={validationErrors.forkliftWidth}
              step={0.1}
              min={1}
              max={5}
            />
            <NumberInput
              label="消防净空 (m)"
              value={corridorParams.fireClearance}
              onChange={(v) => setCorridorParams({ fireClearance: v })}
              error={validationErrors.fireClearance}
              step={0.1}
              min={0.5}
              max={5}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 右侧工具栏
// ---------------------------------------------------------------------------

function Toolbar() {
  const toolMode = useLayoutStore((s) => s.toolMode);
  const setToolMode = useLayoutStore((s) => s.setToolMode);
  const toggleSchemeManager = useLayoutStore((s) => s.toggleSchemeManager);
  const toggleComparison = useLayoutStore((s) => s.toggleComparison);
  const toggleExport = useLayoutStore((s) => s.toggleExport);

  const tools = [
    { mode: 'select' as const, label: '选择', icon: '↖' },
    { mode: 'add-charger' as const, label: '充电桩', icon: '⚡' },
    { mode: 'add-wait' as const, label: '等待区', icon: '⏸' },
    { mode: 'add-ped' as const, label: '行人道', icon: '🚶' },
    { mode: 'add-door' as const, label: '消防门', icon: '🚪' },
    { mode: 'add-path' as const, label: 'AGV路径', icon: '〰' },
    { mode: 'add-forbidden' as const, label: '禁区', icon: '⛔' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-700/50 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-100">工具栏</h2>
      </div>

      <div className="flex-1 space-y-1 p-3">
        {tools.map((tool) => (
          <button
            key={tool.mode}
            type="button"
            onClick={() => setToolMode(tool.mode)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              toolMode === tool.mode
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/50',
            )}
          >
            <span className="text-lg">{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        <button
          type="button"
          onClick={toggleSchemeManager}
          className="flex w-full items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
        >
          <span>📁</span>
          <span>方案管理</span>
        </button>
        <button
          type="button"
          onClick={toggleComparison}
          className="flex w-full items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
        >
          <span>⚖️</span>
          <span>方案对比</span>
        </button>
        <button
          type="button"
          onClick={toggleExport}
          className="flex w-full items-center gap-2 rounded-lg bg-blue-600/80 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600"
        >
          <span>📄</span>
          <span>导出报告</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 底部模拟控制栏
// ---------------------------------------------------------------------------

function SimulationBar() {
  const sim = useLayoutStore((s) => s.sim);
  const startSim = useLayoutStore((s) => s.startSim);
  const pauseSim = useLayoutStore((s) => s.pauseSim);
  const setSimSpeed = useLayoutStore((s) => s.setSimSpeed);
  const setSimScenario = useLayoutStore((s) => s.setSimScenario);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full items-center gap-6 px-6">
      {/* 播放控制 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={sim.running ? pauseSim : startSim}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors',
            sim.running
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-green-500 hover:bg-green-600',
          )}
        >
          {sim.running ? '⏸' : '▶'}
        </button>
      </div>

      {/* 时间显示 */}
      <div className="text-lg font-mono text-slate-200">
        {formatTime(sim.time)}
      </div>

      {/* 场景切换 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">场景:</span>
        <div className="flex rounded-lg bg-slate-700/50 p-0.5">
          {[
            { value: 'offPeak' as const, label: '低峰' },
            { value: 'peak' as const, label: '高峰' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSimScenario(opt.value)}
              className={cn(
                'rounded-md px-3 py-1 text-sm transition-colors',
                sim.scenario === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 速度控制 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">速度:</span>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={sim.speed}
          onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
          className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-slate-600 accent-blue-500"
        />
        <span className="w-10 text-sm font-medium text-slate-200">
          {sim.speed.toFixed(1)}x
        </span>
      </div>

      {/* 状态信息 */}
      <div className="ml-auto flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          <span className="text-slate-400">AGV:</span>
          <span className="font-medium text-slate-200">{sim.agvList.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              sim.overflowWarnings.length > 0 ? 'bg-red-500' : 'bg-green-500',
            )}
          />
          <span className="text-slate-400">警告:</span>
          <span
            className={cn(
              'font-medium',
              sim.overflowWarnings.length > 0 ? 'text-red-400' : 'text-slate-200',
            )}
          >
            {sim.overflowWarnings.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 辅助组件 & 函数
// ---------------------------------------------------------------------------

function NumberInput({
  label,
  value,
  onChange,
  error,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn(
          'w-full rounded-md border bg-slate-800/50 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500',
        )}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function getToolModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    'add-charger': '充电桩',
    'add-wait': '等待区',
    'add-ped': '行人通道',
    'add-door': '消防门',
    'add-path': 'AGV路径',
    'add-forbidden': '禁区',
  };
  return labels[mode] || '';
}

/**
 * 模拟引擎驱动组件
 * 每帧调用 tickSimulation 和 detectOverflows 更新模拟状态
 */
function SimulationDriver() {
  const lastTimeRef = useRef<number>(0);
  const isRunning = useLayoutStore((s) => s.sim.running);
  const simSpeed = useLayoutStore((s) => s.sim.speed);

  useFrame((state, delta) => {
    if (!isRunning) return;

    lastTimeRef.current += delta * simSpeed;

    if (lastTimeRef.current >= 0.05) {
      const dt = lastTimeRef.current;
      lastTimeRef.current = 0;

      const state = useLayoutStore.getState();
      const newSim = tickSimulation(
        state.sim,
        state.entities,
        state.agvParams,
        state.corridorParams,
        dt,
      );

      const warnings = detectOverflows(
        newSim.agvList,
        state.entities,
        state.corridorParams,
        state.agvParams,
      );

      state.setSimState({
        ...newSim,
        overflowWarnings: warnings,
      });
    }
  });

  return null;
}
