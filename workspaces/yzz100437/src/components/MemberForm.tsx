import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Member, VoicePart } from '../types';
import { voicePartList } from '../utils/voiceParts';
import { useStore } from '../store/useStore';

interface MemberFormProps {
  member?: Member | null;
  onClose: () => void;
}

export const MemberForm = ({ member, onClose }: MemberFormProps) => {
  const addMember = useStore((state) => state.addMember);
  const updateMember = useStore((state) => state.updateMember);

  const [formData, setFormData] = useState({
    name: '',
    voicePart: 'soprano' as VoicePart,
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        voicePart: member.voicePart,
        status: member.status,
      });
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (member) {
      updateMember(member.id, formData);
    } else {
      addMember(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-bounce-in">
        <div className="flex items-center justify-between p-6 border-b border-burgundy-100">
          <h3 className="text-xl font-bold font-serif text-burgundy-900">
            {member ? '编辑成员' : '添加成员'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-burgundy-50 transition-colors"
          >
            <X className="w-5 h-5 text-charcoal/50" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="label">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="请输入成员姓名"
              autoFocus
            />
          </div>

          <div>
            <label className="label">声部</label>
            <select
              value={formData.voicePart}
              onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as VoicePart })}
              className="select-field"
            >
              {voicePartList.map((part) => (
                <option key={part.key} value={part.key}>
                  {part.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">状态</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-4 h-4 text-burgundy-700 focus:ring-burgundy-500"
                />
                <span className="text-sm">活跃</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-4 h-4 text-burgundy-700 focus:ring-burgundy-500"
                />
                <span className="text-sm">已离团</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {member ? '保存修改' : '添加成员'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
