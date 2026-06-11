import { useEffect } from 'react';
import { Settings, History, AlertTriangle, Layers } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import { Header } from '../components/layout/Header';
import { DeviceToolbar } from '../components/layout/DeviceToolbar';
import { SafetySettings } from '../components/layout/SafetySettings';
import { HistoryPanel } from '../components/layout/HistoryPanel';
import { Scene3D } from '../components/three3d/Scene3D';
import { PropertyPanel } from '../components/properties/PropertyPanel';
import { RiskList } from '../components/risk/RiskList';
import { RiskStats } from '../components/risk/RiskStats';
import { Button } from '../components/ui/Button';
import type { Position } from '../types/devices';

const tabs = [
  { id: 'properties', label: '属性', icon: Layers },
  { id: 'risks', label: '风险', icon: AlertTriangle },
  { id: 'history', label: '历史', icon: History },
  { id: 'safety', label: '安全设置', icon: Settings },
] as const;

export default function EditorPage() {
  const { project, initNewProject, addDevice, loadHistory } = useProjectStore();
  const { activePanel, setActivePanel } = useUIStore();

  useEffect(() => {
    if (!project) {
      initNewProject();
    } else {
      loadHistory();
    }
  }, [project, initNewProject, loadHistory]);

  const handleGroundClick = (position: Position) => {
    const { placingDeviceType } = useUIStore.getState();
    if (placingDeviceType) {
      addDevice(placingDeviceType, position);
    }
  };

  const renderRightPanel = () => {
    switch (activePanel) {
      case 'properties':
        return <PropertyPanel />;
      case 'risks':
        return <RiskList />;
      case 'history':
        return <HistoryPanel />;
      case 'safety':
        return <SafetySettings />;
      default:
        return <PropertyPanel />;
    }
  };

  const riskCount = project?.risks.length || 0;
  const criticalCount = project?.risks.filter(r => r.level === 'critical').length || 0;

  return (
    <div className="h-screen flex flex-col bg-[#1a1d23] text-[#f8fafc] overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <Scene3D onGroundClick={handleGroundClick} />
          <DeviceToolbar />

          {project && (
            <div className="absolute bottom-4 left-4 z-10">
              <div className="bg-[rgba(35,39,47,0.95)] backdrop-blur-sm border border-[#3a4150] p-3">
                <RiskStats />
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-80 z-10">
            <div className="bg-[rgba(35,39,47,0.95)] backdrop-blur-sm border border-[#3a4150] p-2">
              <p className="text-[10px] text-[#64748b] font-mono">
                鼠标左键: 旋转视角 | 滚轮: 缩放 | 右键: 平移
              </p>
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-[#3a4150] flex flex-col bg-[#23272f] flex-shrink-0">
          <div className="flex border-b border-[#3a4150] flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePanel === tab.id;
              const showBadge = tab.id === 'risks' && riskCount > 0;
              const showCriticalBadge = tab.id === 'risks' && criticalCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors relative ${
                    isActive
                      ? 'bg-[#2d323b] text-[#3b82f6] border-b-2 border-[#3b82f6]'
                      : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#2d323b]/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px]">{tab.label}</span>
                  {showBadge && (
                    <span
                      className={`absolute top-1 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium ${
                        showCriticalBadge
                          ? 'bg-[#ef4444] text-white'
                          : 'bg-[#f59e0b] text-white'
                      }`}
                    >
                      {riskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-hidden">
            {renderRightPanel()}
          </div>
        </div>
      </div>

      {project && (
        <div className="h-7 bg-[#23272f] border-t border-[#3a4150] flex items-center px-4 gap-4 flex-shrink-0">
          <span className="text-[10px] text-[#64748b] font-mono">
            设备: {project.devices.length}
          </span>
          <span className="text-[10px] text-[#64748b] font-mono">
            吊点: {project.devices.filter(d => d.type === 'hoistPoint').length}
          </span>
          <span className="text-[10px] text-[#64748b] font-mono">
            灯架: {project.devices.filter(d => d.type === 'lightRig').length}
          </span>
          <span className="text-[10px] text-[#64748b] font-mono">
            音箱: {project.devices.filter(d => d.type === 'speaker').length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-[#64748b] font-mono">
              更新时间: {new Date(project.updatedAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
