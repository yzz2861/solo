import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Heart, Wind, Droplets, Brain, ShieldAlert } from 'lucide-react';
import type { Casualty, TriageLevel } from '../types';
import { getLevelColorClass, getLevelShortLabel } from '../utils/scoring';
import { cn } from '../lib/utils';

interface CasualtyCardProps {
  casualty: Casualty;
  selectedLevel?: TriageLevel;
  isSelected: boolean;
  onClick: () => void;
  showAnswer?: boolean;
}

const breathingLabels: Record<string, string> = {
  normal: '正常',
  fast: '急促',
  slow: '缓慢',
  absent: '停止',
};

const bleedingLabels: Record<string, string> = {
  none: '无出血',
  minor: '少量',
  moderate: '中等',
  severe: '大量',
};

const consciousnessLabels: Record<string, string> = {
  alert: '清醒',
  verbal: '呼之能应',
  pain: '对痛有反应',
  unresponsive: '无反应',
};

const pulseLabels: Record<string, string> = {
  normal: '正常',
  fast: '偏快',
  weak: '微弱',
  absent: '无',
};

export default function CasualtyCard({
  casualty,
  selectedLevel,
  isSelected,
  onClick,
  showAnswer = false,
}: CasualtyCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const displayLevel = showAnswer ? casualty.correctLevel : selectedLevel;
  
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1',
        isSelected && 'ring-4 ring-cyan-400 ring-offset-2',
        displayLevel && `border-l-4 ${getLevelBorderColor(displayLevel)}`
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold',
              casualty.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
            )}>
              {casualty.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{casualty.name}</h3>
              <p className="text-sm text-gray-500">
                {casualty.age}岁 · {casualty.gender === 'male' ? '男' : '女'}
              </p>
            </div>
          </div>
          {displayLevel && (
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-semibold',
              getLevelColorClass(displayLevel)
            )}>
              {getLevelShortLabel(displayLevel)}
            </span>
          )}
        </div>
        
        {(casualty.hasChronicDisease || casualty.isChild || casualty.deniesInjury) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {casualty.isChild && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                <ShieldAlert size={12} />
                儿童{casualty.isCrying ? '·哭闹' : ''}
              </span>
            )}
            {casualty.hasChronicDisease && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                <AlertTriangle size={12} />
                有基础病
              </span>
            )}
            {casualty.deniesInjury && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">
                <AlertTriangle size={12} />
                否认伤情
              </span>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Wind className="text-cyan-500" size={16} />
            <span className="text-gray-600">呼吸:</span>
            <span className={cn(
              'font-medium',
              casualty.breathing === 'absent' && 'text-red-600',
              casualty.breathing === 'fast' && 'text-orange-600',
              casualty.breathing === 'slow' && 'text-yellow-600',
              casualty.breathing === 'normal' && 'text-gray-700'
            )}>
              {breathingLabels[casualty.breathing]}
              {casualty.respiratoryRate && ` (${casualty.respiratoryRate}次/分)`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Droplets className="text-red-500" size={16} />
            <span className="text-gray-600">出血:</span>
            <span className={cn(
              'font-medium',
              casualty.bleeding === 'severe' && 'text-red-600',
              casualty.bleeding === 'moderate' && 'text-orange-600',
              casualty.bleeding === 'minor' && 'text-yellow-600',
              casualty.bleeding === 'none' && 'text-gray-700'
            )}>
              {bleedingLabels[casualty.bleeding]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Brain className="text-purple-500" size={16} />
            <span className="text-gray-600">意识:</span>
            <span className={cn(
              'font-medium',
              casualty.consciousness === 'unresponsive' && 'text-red-600',
              casualty.consciousness === 'pain' && 'text-orange-600',
              casualty.consciousness === 'verbal' && 'text-yellow-600',
              casualty.consciousness === 'alert' && 'text-gray-700'
            )}>
              {consciousnessLabels[casualty.consciousness]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Heart className="text-rose-500" size={16} />
            <span className="text-gray-600">脉搏:</span>
            <span className={cn(
              'font-medium',
              casualty.pulse === 'absent' && 'text-red-600',
              casualty.pulse === 'weak' && 'text-orange-600',
              casualty.pulse === 'fast' && 'text-yellow-600',
              casualty.pulse === 'normal' && 'text-gray-700',
              !casualty.pulse && 'text-gray-400'
            )}>
              {casualty.pulse ? pulseLabels[casualty.pulse] : '未测'}
            </span>
          </div>
        </div>
        
        {expanded && (
          <div className="border-t pt-3 mt-2 space-y-2 animate-fadeIn">
            {casualty.bloodPressure && (
              <div className="text-sm">
                <span className="text-gray-500">血压: </span>
                <span className="font-medium text-gray-700">
                  {casualty.bloodPressure.systolic}/{casualty.bloodPressure.diastolic} mmHg
                </span>
              </div>
            )}
            {casualty.oxygenSaturation !== undefined && (
              <div className="text-sm">
                <span className="text-gray-500">血氧饱和度: </span>
                <span className={cn(
                  'font-medium',
                  casualty.oxygenSaturation < 90 ? 'text-red-600' : 
                  casualty.oxygenSaturation < 95 ? 'text-orange-600' : 'text-gray-700'
                )}>
                  {casualty.oxygenSaturation}%
                </span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-gray-500">症状: </span>
              <span className="text-gray-700">{casualty.symptoms.join('、')}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">伤情描述: </span>
              <span className="text-gray-700">{casualty.injuryDescription}</span>
            </div>
            {casualty.specialNotes && (
              <div className="text-sm bg-amber-50 border-l-4 border-amber-400 pl-2 py-1">
                <span className="text-amber-700">⚠️ {casualty.specialNotes}</span>
              </div>
            )}
            {casualty.chronicDiseaseDesc && (
              <div className="text-sm">
                <span className="text-gray-500">基础病: </span>
                <span className="text-orange-600">{casualty.chronicDiseaseDesc}</span>
              </div>
            )}
            {showAnswer && (
              <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800 mb-1">分诊解析:</p>
                <p className="text-sm text-emerald-700">{casualty.explanation}</p>
              </div>
            )}
          </div>
        )}
        
        <button
          className="w-full mt-2 py-1 text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <>收起 <ChevronUp size={16} /></>
          ) : (
            <>展开详情 <ChevronDown size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}

function getLevelBorderColor(level: TriageLevel): string {
  const colors: Record<TriageLevel, string> = {
    red: 'border-red-500',
    yellow: 'border-amber-500',
    green: 'border-emerald-500',
    black: 'border-gray-800',
  };
  return colors[level];
}
