import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  Phone,
  MessageCircle,
  AlertTriangle,
  Check,
  X,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  Textarea,
  Badge,
  EmptyState,
  Loading,
  AlertBanner,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { api } from '@/api';
import { cn, formatDate } from '@/utils/helpers';
import type { Client, ClientInput } from '@shared/types';

interface FormErrors {
  name?: string;
  phone?: string;
  wechat_id?: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const emptyForm: ClientInput = {
  name: '',
  phone: '',
  wechat_id: '',
  birthday: '',
  allergies: '',
  contraindications: '',
  is_sensitive_skin: 0,
};

export default function Clients() {
  const { clients, loading, loadClients, setLoading } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterAllergies, setFilterAllergies] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientInput>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (filterAllergies && !client.allergies) {
        return false;
      }
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(keyword);
        const matchesPhone = client.phone?.toLowerCase().includes(keyword);
        const matchesWechat = client.wechat_id?.toLowerCase().includes(keyword);
        if (!matchesName && !matchesPhone && !matchesWechat) {
          return false;
        }
      }
      return true;
    });
  }, [clients, searchKeyword, filterAllergies]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = '请输入客户姓名';
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = '请输入有效的手机号码';
      }
    }

    if (formData.wechat_id && formData.wechat_id.trim()) {
      if (formData.wechat_id.trim().length < 2) {
        errors.wechat_id = '微信号至少2个字符';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      id: client.id,
      name: client.name,
      phone: client.phone || '',
      wechat_id: client.wechat_id || '',
      birthday: client.birthday || '',
      allergies: client.allergies || '',
      contraindications: client.contraindications || '',
      is_sensitive_skin: client.is_sensitive_skin,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (client: Client) => {
    setDeletingClient(client);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingClient(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked ? 1 : 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData: ClientInput = {
        ...formData,
        phone: formData.phone?.trim() || null,
        wechat_id: formData.wechat_id?.trim() || null,
        birthday: formData.birthday?.trim() || null,
        allergies: formData.allergies?.trim() || null,
        contraindications: formData.contraindications?.trim() || null,
      };

      await api.clients.save(submitData);
      await loadClients({
        keyword: searchKeyword || undefined,
        hasAllergies: filterAllergies || undefined,
      });

      showFeedback(
        'success',
        editingClient ? '客户信息更新成功' : '客户添加成功'
      );
      closeModal();
    } catch (error) {
      console.error('Save client error:', error);
      showFeedback('error', '保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;

    setIsSubmitting(true);
    try {
      await api.clients.delete(deletingClient.id);
      await loadClients({
        keyword: searchKeyword || undefined,
        hasAllergies: filterAllergies || undefined,
      });

      showFeedback('success', '客户删除成功');
      closeDeleteModal();
    } catch (error) {
      console.error('Delete client error:', error);
      showFeedback('error', '删除失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients({
      keyword: searchKeyword || undefined,
      hasAllergies: filterAllergies || undefined,
    });
  };

  const handleFilterToggle = () => {
    const newFilter = !filterAllergies;
    setFilterAllergies(newFilter);
    loadClients({
      keyword: searchKeyword || undefined,
      hasAllergies: newFilter || undefined,
    });
  };

  if (loading.clients && clients.length === 0) {
    return (
      <div className="animate-slide-up">
        <h2 className="font-display text-2xl font-bold text-ivory-100 mb-6">客户管理</h2>
        <div className="flex items-center justify-center h-64">
          <Loading text="加载中..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ivory-100">客户管理</h2>
        <Button onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          新增客户
        </Button>
      </div>

      {feedback && (
        <AlertBanner
          level={feedback.type}
          message={feedback.message}
          dismissible
          onDismiss={() => setFeedback(null)}
        />
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <Input
                placeholder="搜索姓名、电话、微信..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </form>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFilterToggle}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
                  filterAllergies
                    ? 'bg-vermilion-700/20 border-vermilion-600 text-vermilion-400'
                    : 'bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-600'
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">仅显示有过敏史</span>
                {filterAllergies && <Check className="w-4 h-4" />}
              </button>
              <Badge variant="outline" size="md">
                共 {filteredClients.length} 位客户
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <EmptyState
              icon={<User className="w-10 h-10" />}
              title="暂无客户"
              description={
                searchKeyword || filterAllergies
                  ? '没有找到匹配的客户，请尝试其他搜索条件'
                  : '还没有添加任何客户，点击右上角"新增客户"开始添加'
              }
              action={
                !searchKeyword && !filterAllergies ? (
                  <Button onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
                    新增客户
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink-700">
                    <th className="px-6 py-4 text-left text-xs font-medium text-ink-400 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-ink-400 uppercase tracking-wider">
                      电话
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-ink-400 uppercase tracking-wider">
                      微信
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-ink-400 uppercase tracking-wider">
                      过敏史
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-ink-400 uppercase tracking-wider">
                      敏感肌肤
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-ink-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-ink-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-ink-800 border border-ink-700">
                            <User className="w-5 h-5 text-ivory-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ivory-100">
                              {client.name}
                            </p>
                            {client.birthday && (
                              <p className="text-xs text-ink-400">
                                生日: {formatDate(client.birthday)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {client.phone ? (
                          <div className="flex items-center gap-2 text-sm text-ivory-200">
                            <Phone className="w-4 h-4 text-ink-400" />
                            {client.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-ink-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.wechat_id ? (
                          <div className="flex items-center gap-2 text-sm text-ivory-200">
                            <MessageCircle className="w-4 h-4 text-ink-400" />
                            {client.wechat_id}
                          </div>
                        ) : (
                          <span className="text-sm text-ink-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.allergies ? (
                          <Badge variant="danger" size="sm" className="cursor-help" title={client.allergies}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            有过敏史
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            无
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.is_sensitive_skin ? (
                          <Badge variant="warning" size="sm">
                            敏感肌肤
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            否
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(client)}
                            leftIcon={<Edit2 className="w-4 h-4" />}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openDeleteModal(client)}
                            leftIcon={<Trash2 className="w-4 h-4" />}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingClient ? '编辑客户' : '新增客户'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {editingClient ? '保存修改' : '添加客户'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="客户姓名 *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="请输入客户姓名"
              error={formErrors.name}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="手机号码"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              placeholder="请输入手机号码"
              error={formErrors.phone}
              leftIcon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="微信号"
              name="wechat_id"
              value={formData.wechat_id || ''}
              onChange={handleInputChange}
              placeholder="请输入微信号"
              error={formErrors.wechat_id}
              leftIcon={<MessageCircle className="w-4 h-4" />}
            />
            <Input
              label="出生日期"
              name="birthday"
              type="date"
              value={formData.birthday || ''}
              onChange={handleInputChange}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ivory-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gold-500" />
              过敏史
            </label>
            <Textarea
              name="allergies"
              value={formData.allergies || ''}
              onChange={handleInputChange}
              placeholder="请描述过敏史，如：对某种麻药过敏、金属过敏等"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ivory-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-ink-400" />
              禁忌症
            </label>
            <Textarea
              name="contraindications"
              value={formData.contraindications || ''}
              onChange={handleInputChange}
              placeholder="请描述禁忌症，如：心脏病、糖尿病、怀孕等"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-ink-900 border border-ink-700">
            <input
              type="checkbox"
              id="is_sensitive_skin"
              name="is_sensitive_skin"
              checked={formData.is_sensitive_skin === 1}
              onChange={handleInputChange}
              className="w-5 h-5 rounded border-ink-600 bg-ink-900 text-vermilion-600 focus:ring-vermilion-500 cursor-pointer"
            />
            <label
              htmlFor="is_sensitive_skin"
              className="text-sm text-ivory-200 cursor-pointer"
            >
              敏感肌肤
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="确认删除"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isSubmitting}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              确认删除
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-vermilion-900/30 border border-vermilion-700/50">
              <AlertTriangle className="w-6 h-6 text-vermilion-400" />
            </div>
            <div>
              <p className="text-ivory-100 font-medium">
                确定要删除客户「{deletingClient?.name}」吗？
              </p>
              <p className="text-sm text-ink-400 mt-1">
                此操作不可撤销，相关的预约和设计记录不会被删除。
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
