import { Save, Play, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/store/editorStore';
import { useLevelStore } from '@/store/levelStore';

export default function EditorPropertyPanel() {
  const navigate = useNavigate();
  const level = useEditorStore(s => s.level);
  const setLevelName = useEditorStore(s => s.setLevelName);
  const setLevelDescription = useEditorStore(s => s.setLevelDescription);
  const setTotalTurns = useEditorStore(s => s.setTotalTurns);
  const getLevel = useEditorStore(s => s.getLevel);
  const saveLevel = useLevelStore(s => s.saveLevel);

  const handleSave = () => {
    const lvl = getLevel();
    saveLevel(lvl);
  };

  const handleTestPlay = () => {
    handleSave();
    navigate(`/game/${level.id}`);
  };

  return (
    <div className="w-56 bg-slate-800 border-l border-slate-700 flex flex-col p-4 gap-3">
      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">关卡名称</label>
        <input type="text" value={level.name} onChange={e => setLevelName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">描述</label>
        <textarea value={level.description} onChange={e => setLevelDescription(e.target.value)} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 resize-none" />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">总回合数</label>
        <input type="number" min={1} max={99} value={level.totalTurns} onChange={e => setTotalTurns(Math.max(1, Number(e.target.value)))} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200" />
      </div>
      <button onClick={handleSave} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded py-2 transition-colors">
        <Save size={14} />保存关卡
      </button>
      <button onClick={handleTestPlay} className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded py-2 transition-colors">
        <Play size={14} />测试游玩
      </button>
      <button onClick={() => navigate('/')} className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded py-2 transition-colors">
        <Home size={14} />返回首页
      </button>
    </div>
  );
}
