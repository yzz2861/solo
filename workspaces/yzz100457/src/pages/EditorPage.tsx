import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '@/store/editorStore';
import { useLevelStore } from '@/store/levelStore';
import EditorMap from '@/components/editor/EditorMap';
import EditorToolbar from '@/components/editor/EditorToolbar';
import EditorPropertyPanel from '@/components/editor/EditorPropertyPanel';

export default function EditorPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const loadLevel = useEditorStore(s => s.loadLevel);
  const createNew = useEditorStore(s => s.createNew);
  const getLevel = useLevelStore(s => s.getLevel);

  useEffect(() => {
    if (levelId) {
      const existing = getLevel(levelId);
      if (existing) {
        loadLevel(existing);
      }
    } else {
      createNew();
    }
  }, [levelId, loadLevel, createNew, getLevel]);

  return (
    <div className="h-screen flex" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #0f2a46 100%)' }}>
      <EditorToolbar />
      <div className="flex-1 relative">
        <EditorMap />
      </div>
      <EditorPropertyPanel />
    </div>
  );
}
