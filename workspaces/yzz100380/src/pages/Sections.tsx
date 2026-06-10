import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Edit2, Trash2, Palette, Music2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

const colorOptions = [
  '#E74C3C', '#3498DB', '#27AE60', '#9B59B6', '#F39C12',
  '#34495E', '#1ABC9C', '#E67E22', '#95A5A6', '#D35400',
];

export default function Sections() {
  const { sections, members, addSection, updateSection, deleteSection } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3498DB', description: '' });

  const getMemberCount = (sectionId: string) =>
    members.filter((m) => m.sectionId === sectionId).length;

  const handleOpenModal = (id?: string) => {
    if (id) {
      const section = sections.find((s) => s.id === id);
      if (section) {
        setEditingId(id);
        setFormData({
          name: section.name,
          color: section.color,
          description: section.description || '',
        });
      }
    } else {
      setEditingId(null);
      setFormData({ name: '', color: '#3498DB', description: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateSection(editingId, formData);
    } else {
      addSection(formData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该声部吗？')) {
      deleteSection(id);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="声部管理"
        subtitle="管理声部类型和配置"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            添加声部
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Card key={section.id} hover className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: section.color }}
                >
                  <Music2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-wood-800">{section.name}</h3>
                  <p className="text-sm text-wood-500">
                    {getMemberCount(section.id)} 名成员
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenModal(section.id)}
                  className="p-2 text-wood-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(section.id)}
                  className="p-2 text-wood-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {section.description && (
              <p className="mt-3 text-sm text-wood-500 line-clamp-2">
                {section.description}
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-wood-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-wood-400" />
              <div className="flex gap-1">
                <span
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: section.color }}
                />
              </div>
              <span className="text-xs text-wood-400 ml-auto">{section.color}</span>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-md">
            <div className="p-5 border-b border-wood-200">
              <h3 className="text-lg font-serif font-bold text-wood-800">
                {editingId ? '编辑声部' : '添加声部'}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  声部名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="如：高音部"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-2">
                  标签颜色
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color
                          ? 'border-wood-800 scale-110'
                          : 'border-white shadow-sm'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm resize-none"
                  rows={2}
                  placeholder="声部描述"
                />
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? '保存修改' : '添加声部'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
