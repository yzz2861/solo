import { useMemo } from 'react';
import { Calendar, Clock, Bot, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { getShiftColor } from '@/utils/colors';
import { cn } from '@/utils/cn';
import { calculateCoverageRate } from '@/services/analysisService';
export function ShiftSelector() {
 const { patrolShifts, checkpoints, selectedShiftId, visibleShiftIds, actions: { selectShift, toggleShiftVisibility }, } = useSceneStore();
 const { actions: { reset } } = usePlaybackStore();
 const shiftsByDate = useMemo(() => {
 const groups: {
 [date: string]: typeof patrolShifts;
 } = {};
 patrolShifts.forEach(shift => {
 if (!groups[shift.date]) {
 groups[shift.date] = [];
 }
 groups[shift.date].push(shift);
 });
 return groups;
 }, [patrolShifts]);
 const handleSelectShift = (shiftId: string) => {
 selectShift(shiftId);
 reset();
 };
 const getCoverageInfo = (shiftId: string) => {
 const shift = patrolShifts.find(s => s.id === shiftId);
 if (!shift)
 return { rate: 0, covered: 0, total: 0 };
 const { rate, covered } = calculateCoverageRate(shift, checkpoints);
 return { rate, covered: covered.length, total: checkpoints.length };
 };
 return (<div className="panel p-4">
 <h3 className="font-display font-semibold text-lg mb-4 text-primary">班次选择</h3>
 
 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
 {Object.entries(shiftsByDate).map(([date, shifts]) => (<div key={date} className="space-y-2">
 <div className="flex items-center gap-2 text-sm text-white/60">
 <Calendar size={14}/>
 <span>{date}</span>
 </div>
 
 <div className="space-y-2">
 {shifts.map((shift) => {
 const isSelected = shift.id === selectedShiftId;
 const isVisible = visibleShiftIds.includes(shift.id);
 const coverage = getCoverageInfo(shift.id);
 const color = getShiftColor(patrolShifts.findIndex(s => s.id === shift.id));
 return (<div key={shift.id} className={cn("rounded-lg border transition-all duration-200 overflow-hidden", isSelected
 ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
 : "border-white/10 bg-background-dark/50 hover:border-white/20")}>
 <div className="p-3 cursor-pointer" onClick={() => handleSelectShift(shift.id)}>
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}/>
 <span className="font-medium text-white">{shift.shiftName}</span>
 {isSelected && (<span className="badge-primary text-xs">当前</span>)}
 </div>
 
 <div className="flex items-center gap-1">
 <button onClick={(e) => {
 e.stopPropagation();
 toggleShiftVisibility(shift.id);
 }} className={cn("p-1 rounded transition-colors", isVisible ? "text-primary" : "text-white/30")} title={isVisible ? '隐藏轨迹' : '显示轨迹'}>
 {isVisible ? <Eye size={14}/> : <EyeOff size={14}/>}
 </button>
 </div>
 </div>
 
 <div className="flex items-center gap-4 text-xs text-white/60 mb-2">
 <div className="flex items-center gap-1">
 <Bot size={12}/>
 <span>{shift.robotId}</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock size={12}/>
 <span>
 {new Date(shift.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
 {' - '}
 {new Date(shift.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 </div>
 
 <div className="flex items-center justify-between">
 <div className="flex-1">
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="text-white/50">覆盖率</span>
 <span className={cn(coverage.rate >= 0.9 ? 'text-success' : coverage.rate >= 0.7 ? 'text-warning' : 'text-danger')}>
 {(coverage.rate * 100).toFixed(1)}%
 </span>
 </div>
 <div className="h-1.5 bg-background rounded-full overflow-hidden">
 <div className={cn("h-full rounded-full transition-all", coverage.rate >= 0.9 ? 'bg-success' : coverage.rate >= 0.7 ? 'bg-warning' : 'bg-danger')} style={{ width: `${coverage.rate * 100}%` }}/>
 </div>
 <div className="flex items-center justify-between mt-1 text-xs text-white/40">
 <span>{coverage.covered}/{coverage.total} 点位</span>
 <div className="flex items-center gap-1">
 {coverage.rate >= 0.9
 ? <CheckCircle2 size={12} className="text-success"/>
 : <XCircle size={12} className="text-danger"/>}
 </div>
 </div>
 </div>
 
 <div className="ml-4 text-center">
 <div className="text-lg font-display font-semibold text-white">
 {shift.alarms.length}
 </div>
 <div className="text-xs text-white/40">告警</div>
 </div>
 </div>
 </div>
 </div>);
 })}
 </div>
 </div>))}
 </div>
 </div>);
}

