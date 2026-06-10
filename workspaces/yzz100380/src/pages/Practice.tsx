import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Music, Users, Edit3, Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { getMasteryTextColor, getPracticedBarCount } from '@/utils/helpers';

export default function Practice() {
  const {
    sheets,
    members,
    sections,
    practices,
    addPractice,
    updatePractice,
    getPractice,
  } = useAppStore();

  const [selectedSheetId, setSelectedSheetId] = useState(sheets[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPractice, setEditingPractice] = useState<{
    memberId: string;
    sheetId: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    practicedBars: '',
    mastery: 0,
    note: '',
    teacherModified: false,
  });
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    const matchSection = !selectedSectionId || m.sectionId === selectedSectionId;
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery);
    return matchSection && matchSearch;
  });

  const selectedSheet = sheets.find((s) => s.id === selectedSheetId);

  const handleOpenEdit = (memberId: string, sheetId: string) => {
    const practice = getPractice(memberId, sheetId);
    if (practice) {
      setFormData({
        practicedBars: practice.practicedBars,
        mastery: practice.mastery,
        note: practice.note,
        teacherModified: practice.teacherModified,
      });
    } else {
      setFormData({
        practicedBars: '',
        mastery: 0,
        note: '',
        teacherModified: false,
      });
    }
    setEditingPractice({ memberId, sheetId });
  };

  const handleSubmit = () => {
    if (!editingPractice) return;

    const existing = getPractice(editingPractice.memberId, editingPractice.sheetId);

    if (existing) {
      updatePractice(existing.id, {
        ...formData,
        lastPracticeDate: new Date().toISOString().split('T')[0],
      });
    } else {
      addPractice({
        memberId: editingPractice.memberId,
        sheetId: editingPractice.sheetId,
        ...formData,
        lastPracticeDate: new Date().toISOString().split('T')[0],
      });
    }
    setEditingPractice(null);
  };

  const getMemberPractice = (memberId: string, sheetId: string) =>
    practices.find((p) => p.memberId === memberId && p.sheetId === sheetId);

  const teacherModifiedCount = practices.filter((p) => p.teacherModified).length;

  return (
    <div className="p-6">
      <PageHeader
        title="练习进度"
        subtitle="追踪成员练习进度和老师批注"
        actions={
          <Badge variant="info" size="md">
            <Pencil className="w-3 h-3 mr-1" />
            {teacherModifiedCount} 条老师批注
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-gold-500" />
              选择曲谱
            </h3>
            <div className="space-y-1">
              {sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => setSelectedSheetId(sheet.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedSheetId === sheet.id
                      ? 'bg-gold-100 text-gold-800 font-medium'
                      : 'hover:bg-wood-50 text-wood-700'
                  }`}
                >
                  <div className="text-sm">{sheet.title}</div>
                  <div className="text-xs text-wood-500 mt-0.5">
                    {sheet.totalBars} 小节 · {sheet.composer || '未知'}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-wood-200 my-4" />

            <h3 className="font-medium text-wood-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-500" />
              声部筛选
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedSectionId('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !selectedSectionId
                    ? 'bg-gold-100 text-gold-800 font-medium'
                    : 'hover:bg-wood-50 text-wood-600'
                }`}
              >
                全部声部
              </button>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    selectedSectionId === sec.id
                      ? 'bg-gold-100 text-gold-800 font-medium'
                      : 'hover:bg-wood-50 text-wood-600'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: sec.color }}
                  />
                  {sec.name}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="mb-4">
            <div className="p-4 border-b border-wood-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold text-wood-800">
                    {selectedSheet?.title || '请选择曲谱'}
                  </h2>
                  <p className="text-sm text-wood-500">
                    {selectedSheet?.composer || ''} · {selectedSheet?.totalBars || 0} 小节
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400" />
                  <input
                    type="text"
                    placeholder="搜索成员..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 bg-white text-sm w-48"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="divide-y divide-wood-100">
              {filteredMembers.map((member) => {
                const practice = getMemberPractice(member.id, selectedSheetId);
                const section = sections.find((s) => s.id === member.sectionId);
                const practicedCount = practice
                  ? getPracticedBarCount(practice.practicedBars)
                  : 0;
                const isExpanded = expandedMember === member.id;

                return (
                  <div key={member.id}>
                    <div
                      className="p-4 hover:bg-wood-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedMember(isExpanded ? null : member.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: section?.color || '#8B4513' }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-wood-800 flex items-center gap-2">
                              {member.name}
                              {practice?.teacherModified && (
                                <span className="flex items-center text-blue-500">
                                  <Pencil className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-wood-500 flex items-center gap-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: section?.color }}
                              />
                              {section?.name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <ProgressBar
                              value={practice?.mastery || 0}
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium w-12 text-right ${getMasteryTextColor(
                              practice?.mastery || 0
                            )}`}
                          >
                            {practice?.mastery || 0}%
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(member.id, selectedSheetId);
                            }}
                            className="p-2 text-wood-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-wood-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-wood-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-wood-50/50">
                        <div className="ml-13 pl-14 space-y-3">
                          <div className="flex gap-6">
                            <div>
                              <div className="text-xs text-wood-500 mb-1">已练小节</div>
                              <div className="text-sm font-medium text-wood-800">
                                {practice?.practicedBars || '未开始'}
                              </div>
                              {selectedSheet && (
                                <div className="text-xs text-wood-400">
                                  {practicedCount} / {selectedSheet.totalBars} 小节
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-wood-500 mb-1">最后练习</div>
                              <div className="text-sm font-medium text-wood-800">
                                {practice?.lastPracticeDate || '-'}
                              </div>
                            </div>
                          </div>

                          {practice?.note && (
                            <div className="p-3 bg-white rounded-lg border border-wood-200">
                              <div className="text-xs text-wood-500 mb-1 flex items-center gap-1">
                                {practice.teacherModified && (
                                  <Pencil className="w-3 h-3 text-blue-500" />
                                )}
                                练习备注
                              </div>
                              <p className="text-sm text-wood-700">{practice.note}</p>
                            </div>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(member.id, selectedSheetId);
                            }}
                          >
                            编辑进度
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-wood-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>没有找到匹配的成员</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {editingPractice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-md">
            <div className="p-5 border-b border-wood-200">
              <h3 className="text-lg font-serif font-bold text-wood-800">编辑练习进度</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  已练习小节
                </label>
                <input
                  type="text"
                  value={formData.practicedBars}
                  onChange={(e) =>
                    setFormData({ ...formData, practicedBars: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="如：1-16, 20-24"
                />
                <p className="text-xs text-wood-400 mt-1">格式：1-16, 20-24 或 1,2,3</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  掌握程度：{formData.mastery}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.mastery}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mastery: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-wood-200 rounded-lg appearance-none cursor-pointer accent-gold-500"
                />
                <div className="flex justify-between text-xs text-wood-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  练习备注
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm resize-none"
                  rows={3}
                  placeholder="记录练习情况..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="teacherModified"
                  checked={formData.teacherModified}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherModified: e.target.checked })
                  }
                  className="w-4 h-4 text-gold-500 rounded focus:ring-gold-300"
                />
                <label htmlFor="teacherModified" className="text-sm text-wood-700">
                  <span className="flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    老师批注/改动
                  </span>
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingPractice(null)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
