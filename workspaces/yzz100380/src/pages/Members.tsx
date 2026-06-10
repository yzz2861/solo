import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Search, Edit2, Trash2, History, UserPlus } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { isDateWithinDays } from '@/utils/helpers';

export default function Members() {
  const {
    members,
    sections,
    sectionHistories,
    addMember,
    updateMember,
    deleteMember,
    changeMemberSection,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sectionId: sections[0]?.id || '',
    phone: '',
    email: '',
    note: '',
    isLeader: false,
  });

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery);
    const matchSection = !filterSection || m.sectionId === filterSection;
    return matchSearch && matchSection;
  });

  const getSection = (sectionId: string) => sections.find((s) => s.id === sectionId);

  const hasRecentChange = (memberId: string) =>
    sectionHistories.some(
      (sh) => sh.memberId === memberId && isDateWithinDays(sh.changeDate, 7)
    );

  const handleOpenModal = (memberId?: string) => {
    if (memberId) {
      const member = members.find((m) => m.id === memberId);
      if (member) {
        setEditingMember(memberId);
        setFormData({
          name: member.name,
          sectionId: member.sectionId,
          phone: member.phone || '',
          email: member.email || '',
          note: member.note || '',
          isLeader: member.isLeader,
        });
      }
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        sectionId: sections[0]?.id || '',
        phone: '',
        email: '',
        note: '',
        isLeader: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingMember) {
      const oldMember = members.find((m) => m.id === editingMember);
      if (oldMember && oldMember.sectionId !== formData.sectionId) {
        changeMemberSection(editingMember, formData.sectionId, '编辑修改');
      }
      updateMember(editingMember, formData);
    } else {
      addMember({
        ...formData,
        joinDate: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该成员吗？')) {
      deleteMember(id);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="成员管理"
        subtitle="管理社团成员信息和声部分配"
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            添加成员
          </Button>
        }
      />

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400" />
              <input
                type="text"
                placeholder="搜索成员姓名或电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 bg-white text-sm"
              />
            </div>
          </div>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-4 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
          >
            <option value="">全部声部</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-wood-50 border-b border-wood-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-wood-600">成员</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-wood-600">声部</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-wood-600">联系方式</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-wood-600">入社时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-wood-600">状态</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-wood-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-100">
              {filteredMembers.map((member) => {
                const section = getSection(member.sectionId);
                const recentChange = hasRecentChange(member.id);

                return (
                  <tr key={member.id} className="hover:bg-wood-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                          style={{ backgroundColor: section?.color || '#8B4513' }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-wood-800 flex items-center gap-2">
                            {member.name}
                            {member.isLeader && (
                              <Badge variant="gold" size="sm">
                                社长
                              </Badge>
                            )}
                          </div>
                          {member.note && (
                            <div className="text-xs text-wood-500">{member.note}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: section?.color }}
                        />
                        <span className="text-sm text-wood-700">{section?.name}</span>
                        {recentChange && (
                          <span className="flex items-center text-amber-500 animate-pulse-soft">
                            <History className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-wood-600">
                      {member.phone || '-'}
                      {member.email && (
                        <div className="text-xs text-wood-400">{member.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-wood-600">{member.joinDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant="success">活跃</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(member.id)}
                          className="p-2 text-wood-500 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-wood-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-wood-400">
            <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>没有找到匹配的成员</p>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-wood-lg w-full max-w-md">
            <div className="p-5 border-b border-wood-200">
              <h3 className="text-lg font-serif font-bold text-wood-800">
                {editingMember ? '编辑成员' : '添加成员'}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">声部</label>
                <select
                  value={formData.sectionId}
                  onChange={(e) =>
                    setFormData({ ...formData, sectionId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 bg-white text-sm"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请输入电话"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm"
                  placeholder="请输入邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-wood-700 mb-1.5">备注</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-wood-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 text-sm resize-none"
                  rows={2}
                  placeholder="备注信息"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLeader"
                  checked={formData.isLeader}
                  onChange={(e) =>
                    setFormData({ ...formData, isLeader: e.target.checked })
                  }
                  className="w-4 h-4 text-gold-500 rounded focus:ring-gold-300"
                />
                <label htmlFor="isLeader" className="text-sm text-wood-700">
                  设为社长
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-wood-200 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingMember ? '保存修改' : '添加成员'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
