import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import CasualtyCard from '../components/CasualtyCard';
import TriageButtons from '../components/TriageButtons';
import PriorityList from '../components/PriorityList';
import EventModal from '../components/EventModal';
import { useGameStore, useUserStore } from '../stores';
import { getCaseById } from '../utils/storage';
import type { TriageLevel } from '../types';
import { cn } from '../lib/utils';

export default function TrainingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  
  const { currentUser } = useUserStore();
  const {
    currentCase,
    casualties,
    resources,
    answers,
    selectedCasualtyId,
    elapsedTime,
    isPlaying,
    currentEvent,
    triggeredEvents,
    startTraining,
    selectCasualty,
    setTriageLevel,
    updatePriority,
    submitAnswer,
    setElapsedTime,
    triggerEvent,
    dismissEvent,
    resetGame,
  } = useGameStore();
  
  const [showConfirm, setShowConfirm] = useState(false);
  
  useEffect(() => {
    if (!caseId) {
      navigate('/');
      return;
    }
    
    const caseData = getCaseById(caseId);
    if (caseData) {
      startTraining(caseData);
    } else {
      navigate('/');
    }
    
    return () => {
      resetGame();
    };
  }, [caseId]);
  
  useEffect(() => {
    if (!isPlaying || !currentCase?.timeLimit) return;
    
    const timer = setInterval(() => {
      const newTime = elapsedTime + 1;
      setElapsedTime(newTime);
      
      if (currentCase.specialEvents) {
        currentCase.specialEvents.forEach(event => {
          if (event.triggerTime === newTime && !triggeredEvents.includes(event.id)) {
            triggerEvent(event);
          }
        });
      }
      
      if (currentCase.timeLimit && newTime >= currentCase.timeLimit) {
        handleSubmit();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying, elapsedTime, currentCase, triggeredEvents]);
  
  const handleLevelSelect = useCallback((level: TriageLevel) => {
    if (selectedCasualtyId) {
      setTriageLevel(selectedCasualtyId, level);
    }
  }, [selectedCasualtyId, setTriageLevel]);
  
  const handleSubmit = () => {
    if (!currentUser) return;
    
    const record = submitAnswer(currentUser.name);
    if (record) {
      navigate(`/result/${record.id}`);
    }
  };
  
  const selectedAnswer = answers.find(a => a.casualtyId === selectedCasualtyId);
  const allAnswered = answers.length > 0 && answers.every(a => a.selectedLevel);
  
  if (!currentCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {currentEvent && <EventModal event={currentEvent} onDismiss={dismissEvent} />}
      
      <StatusBar
        elapsedTime={elapsedTime}
        timeLimit={currentCase.timeLimit}
        resources={resources}
        scenario={currentCase.scenario}
        casualtyCount={casualties.length}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => {
              if (confirm('确定要退出训练吗？当前进度将不会保存。')) {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            返回首页
          </button>
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{currentCase.name}</h1>
            <p className="text-gray-600">{currentCase.description}</p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">🏥</span>
                伤员列表
                <span className="text-sm font-normal text-gray-500">
                  （点击选择伤员，然后在下方选择分诊等级）
                </span>
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {casualties.map((casualty) => {
                  const answer = answers.find(a => a.casualtyId === casualty.id);
                  return (
                    <CasualtyCard
                      key={casualty.id}
                      casualty={casualty}
                      selectedLevel={answer?.selectedLevel as TriageLevel}
                      isSelected={selectedCasualtyId === casualty.id}
                      onClick={() => selectCasualty(casualty.id)}
                    />
                  );
                })}
              </div>
            </div>
            
            <div>
              <PriorityList
                casualties={casualties}
                answers={answers}
                onReorder={updatePriority}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white border-t shadow-lg sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-2">
                {selectedCasualtyId
                  ? `已选择: ${casualties.find(c => c.id === selectedCasualtyId)?.name} - 请选择分诊等级`
                  : '请先点击选择一名伤员'
                }
              </p>
              <TriageButtons
                selectedLevel={selectedAnswer?.selectedLevel as TriageLevel}
                onSelect={handleLevelSelect}
                disabled={!selectedCasualtyId}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                {allAnswered ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={16} />
                    全部已分级
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle size={16} />
                    还有伤员未分级
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!allAnswered}
                className={cn(
                  'px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg',
                  allAnswered
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl'
                    : 'bg-gray-300 cursor-not-allowed'
                )}
              >
                提交答案
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-slideUp">
            <h3 className="text-xl font-bold text-gray-800 mb-4">确认提交？</h3>
            <p className="text-gray-600 mb-6">
              提交后将无法修改答案，确定要提交吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                再检查一下
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
