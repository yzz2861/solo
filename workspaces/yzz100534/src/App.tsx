import { useState } from 'react';
import Header from './components/layout/Header';
import EvidencePanel from './components/evidence/EvidencePanel';
import TimelineView from './components/timeline/TimelineView';
import DetectionPanel from './components/detection/DetectionPanel';
import SupplementPanel from './components/supplement/SupplementPanel';
import { useCaseStore } from './store/useCaseStore';
import { ChevronLeft, ChevronRight, FileText, AlertTriangle } from 'lucide-react';

function App() {
  const { currentCase } = useCaseStore();
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightTab, setRightTab] = useState<'detection' | 'supplement'>('detection');

  const unresolvedCount = currentCase.detections.filter(d => !d.resolved).length;
  const supplementCount = currentCase.supplements.filter(s => !s.completed).length;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <EvidencePanel />

        <TimelineView />

        <div className="relative flex flex-col" style={{ width: showRightPanel ? '384px' : '48px' }}>
          {showRightPanel && (
            <div className="h-full flex flex-col">
              <div className="bg-white border-l border-b border-gray-200 flex">
                <button
                  onClick={() => setRightTab('detection')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    rightTab === 'detection'
                      ? 'border-primary-900 text-primary-900 bg-primary-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  智能检测
                  {unresolvedCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {unresolvedCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightTab('supplement')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    rightTab === 'supplement'
                      ? 'border-primary-900 text-primary-900 bg-primary-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  补件清单
                  {supplementCount > 0 && (
                    <span className="bg-primary-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {supplementCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-hidden border-l border-gray-200">
                {rightTab === 'detection' && <DetectionPanel />}
                {rightTab === 'supplement' && <SupplementPanel />}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-16 bg-white border border-gray-200 rounded-l shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center z-10"
            title={showRightPanel ? '收起面板' : '展开面板'}
          >
            {showRightPanel ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
