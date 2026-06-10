import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, FileText, Edit2, Trash2, AlertTriangle, CheckCircle, Music, Search, FolderOpen } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { getDifficultyLabel, getDifficultyColor } from '@/utils/helpers';

export default function Sheets() {
  const { sheets, sections, addSheet, updateSheet, deleteSheet, toggleSheetValid } =
    useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterValid, setFilterValid] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    filePath: '',
    fileValid: true,
    totalBars: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    sectionIds: [] as string[],
  });

  const filteredSheets = sheets.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.composer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDifficulty = !filterDifficulty || s.difficulty === filterDifficulty;
    const matchValid = filterValid === '' || s.fileValid === (filterValid === 'valid');
    return matchSearch && matchDifficulty && matchValid;
  });

  const handleOpenModal = (id?: string) => {
    if (id) {
      const sheet = sheets.find((s) => s.id === id);
      if (sheet) {
        setEditingId(id);
        setFormData({
          title: sheet.title,
          composer: sheet.composer || '',
          filePath: sheet.filePath,
          fileValid: sheet.fileValid,
          totalBars: sheet.totalBars,
          difficulty: sheet.difficulty,
          sectionIds: sheet.sectionIds,
        });
      }
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        composer: '',
        filePath: '',
        fileValid: true,
        totalBars: 0,
        difficulty: 'medium',
        sectionIds: [],
      });
    }
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingId) {
      updateSheet(editingId, formData);
    } else {
      addSheet(formData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该曲谱吗？')) {
      deleteSheet(id);
    }
  };

  const toggleSection = (sectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      sectionIds: prev.sectionIds.includes(sectionId)
        ? prev.sectionIds.filter((id) => id !== sectionId)
        : [...prev.sectionIds, sectionId],
    }));
  };

  const invalidCount = sheets.filter((s) => !s.fileValid).length;

  return (
    <div className="p-6">
      <PageHeader
        title="曲谱管理"
        subtitle="管理曲谱文件和声部关联"
        actions={
          <div className="flex items-center gap-2">
            {invalidCount > 0 && (
              <Badge variant="danger" size="md">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {invalidCount} 个路径失效
              </Badge>
            )}
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              添加曲谱
            </Button>
          </div>
        }
      />

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400" />
              <input
                type="text"
                placeholder="搜索曲谱名称或作曲家..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 bg-white text-sm"
              />
            </div>
          </div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
          >
            <option value="">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          <select
            value={filterValid}
            onChange={(e) => setFilterValid(e.target.value)}
            className="px-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
          >
            <option value="">全部状态</option>
            <option value="valid">路径有效</option>
            <option value="invalid">路径失效</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSheets.map((sheet) => {
          const sheetSections = sections.filter((sec) =>
            sheet.sectionIds.includes(sec.id)
          );

          return (
            <Card key={sheet.id} hover className="overflow-hidden">
              <div
                className={`h-32 flex items-center justify-center ${
                  sheet.fileValid ? 'bg-gradient-to-br from-gold-100 to-gold-200' : 'bg-gradient-to-br from-red-100 to-red-200'
                }`}
              >
                <div className="text-center">
                  {sheet.fileValid ? (
                    <FileText className="w-12 h-12 text-gold-600 mx-auto" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-wood-800">{sheet.title}</h3>
                    {sheet.composer && (
                      <p className="text-sm text-wood-500">{sheet.composer}</p>
                    )}
                  </div>
                  <Badge
                    variant={sheet.difficulty === 'easy' ? 'success' : sheet.difficulty === 'medium' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {getDifficultyLabel(sheet.difficulty)}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {sheetSections.map((sec) => (
                    <span
                      key={sec.id}
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: sec.color }}
                    >
                      {sec.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-wood-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" />
                    {sheet.totalBars} 小节
                  </span>
                  <span className="flex items-center gap-1">
                    {sheet.fileValid ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        路径有效
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        路径失效
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1 pt-3 border-t border-wood-100">
                  <button
                    onClick={() => toggleSheetValid(sheet.id)}
                    className={`flex-1 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      sheet.fileValid
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {sheet.fileValid ? '标记失效' : '标记有效'}
                  </button>
                  <button
                    onClick={() => handleOpenModal(sheet.id)}
                    className="flex-1 py-2 text-xs text-wood-600 hover:bg-wood-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(sheet.id)}
                    className="p-2 text-wood-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredSheets.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-wood-300" />
          <p className="text-wood-500">没有找到匹配的曲谱</p>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-wood-200 sticky top-0 bg-white">
              <h3 className="text-lg font-serif font-bold text-wood-800">
                {editingId ? '编辑曲谱' : '添加曲谱'}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  曲谱名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请输入曲谱名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  作曲家
                </label>
                <input
                  type="text"
                  value={formData.composer}
                  onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请输入作曲家"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  文件路径
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.filePath}
                    onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                    className="flex-1 px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm font-mono text-xs"
                    placeholder="/path/to/score.pdf"
                  />
                  <Button variant="outline" size="md" icon={<FolderOpen className="w-4 h-4" />}>
                    选择
                  </Button>
                </div>
                <p className="text-xs text-wood-400 mt-1">
                  由于浏览器安全限制，无法自动检测路径有效性，请手动标记
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-wood-700 mb-1.5">
                    总小节数
                  </label>
                  <input
                    type="number"
                    value={formData.totalBars}
                    onChange={(e) =>
                      setFormData({ ...formData, totalBars: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-wood-700 mb-1.5">
                    难度
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                      })
                    }
                    className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-2">
                  关联声部
                </label>
                <div className="flex flex-wrap gap-2">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => toggleSection(sec.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        formData.sectionIds.includes(sec.id)
                          ? 'text-white shadow-md'
                          : 'bg-wood-100 text-wood-600 hover:bg-wood-200'
                      }`}
                      style={{
                        backgroundColor: formData.sectionIds.includes(sec.id)
                          ? sec.color
                          : undefined,
                      }}
                    >
                      {sec.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fileValid"
                  checked={formData.fileValid}
                  onChange={(e) => setFormData({ ...formData, fileValid: e.target.checked })}
                  className="w-4 h-4 text-gold-500 rounded focus:ring-gold-300"
                />
                <label htmlFor="fileValid" className="text-sm text-wood-700">
                  文件路径有效
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? '保存修改' : '添加曲谱'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
