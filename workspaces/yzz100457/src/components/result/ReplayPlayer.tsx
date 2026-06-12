import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { TurnRecord } from '@/types/game';

interface ReplayPlayerProps {
  turnRecords: TurnRecord[];
  onTurnChange: (turnIdx: number) => void;
}

export default function ReplayPlayer({ turnRecords, onTurnChange }: ReplayPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const totalTurns = turnRecords.length - 1;

  useEffect(() => {
    if (!isPlaying || currentIdx >= totalTurns) return;
    const timer = setTimeout(() => {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      onTurnChange(next);
    }, 800);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIdx, totalTurns, onTurnChange]);

  useEffect(() => {
    if (currentIdx >= totalTurns) setIsPlaying(false);
  }, [currentIdx, totalTurns]);

  const stepBack = () => {
    if (currentIdx <= 0) return;
    const prev = currentIdx - 1;
    setCurrentIdx(prev);
    onTurnChange(prev);
  };

  const stepForward = () => {
    if (currentIdx >= totalTurns) return;
    const next = currentIdx + 1;
    setCurrentIdx(next);
    onTurnChange(next);
  };

  const togglePlay = () => {
    if (currentIdx >= totalTurns) {
      setCurrentIdx(0);
      onTurnChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSlider = (val: number) => {
    setIsPlaying(false);
    setCurrentIdx(val);
    onTurnChange(val);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
      <button onClick={stepBack} className="text-slate-300 hover:text-white transition-colors"><SkipBack size={18} /></button>
      <button onClick={togglePlay} className="text-slate-300 hover:text-white transition-colors">
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <button onClick={stepForward} className="text-slate-300 hover:text-white transition-colors"><SkipForward size={18} /></button>
      <input type="range" min={0} max={totalTurns} value={currentIdx} onChange={e => handleSlider(Number(e.target.value))} className="flex-1 accent-blue-500" />
      <span className="text-xs text-slate-400 whitespace-nowrap">回合 {currentIdx}/{totalTurns}</span>
    </div>
  );
}
