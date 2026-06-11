import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Plus,
  X,
  Check,
  Upload,
  ImageOff,
  Eye,
  Edit3,
  Clock,
  User,
  ChevronRight,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Select,
  Input,
  Textarea,
  Modal,
  Badge,
  Card,
  CardContent,
  AlertBanner,
  ImagePreview,
  Loading,
  EmptyState,
} from '@/components/ui';
import { api } from '@/api';
import { useAppStore } from '@/store';
import {
  formatDateTime,
  imageToBase64,
  cn,
} from '@/utils/helpers';
import type {
  DesignDetail,
  DesignVersion,
  DesignInput,
} from '@shared/types';

interface DesignDrawerState {
  isOpen: boolean;
  design: DesignDetail | null;
}

interface CompareState {
  version1: DesignVersion | null;
  version2: DesignVersion | null;
  showCompare: boolean;
}

export default function Gallery() {
  const {
    designs,
    clients,
    bookings,
    loading,
    loadDesigns,
    loadClients,
    loadBookings,
    setLoading,
  } = useAppStore();

  const [filterClientId, setFilterClientId] = useState<number | null>(null);
  const [filterBookingId, setFilterBookingId] = useState<number | null>(null);

  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<DesignDetail | null>(null);
  const [drawer, setDrawer] = useState<DesignDrawerState>({
    isOpen: false,
    design: null,
  });
  const [compareState, setCompareState] = useState<CompareState>({
    version1: null,
    version2: null,
    showCompare: false,
  });

  const [formData, setFormData] = useState<Partial<DesignInput>>({
    client_id: 0,
    booking_id: null,
    name: '',
    description: '',
    image_path: '',
    feedback: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [versionImages, setVersionImages] = useState<Record<number, string | null>>({});
  const [invalidImages, setInvalidImages] = useState<Set<number>>(new Set());

  const clientOptions = useMemo(
    () => [
      { value: 0, label: '全部客户' },
      ...clients.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const bookingOptions = useMemo(() => {
    const filtered = filterClientId
      ? bookings.filter((b) => b.client_id === filterClientId)
      : bookings;
    return [
      { value: 0, label: '全部预约' },
      ...filtered.map((b) => ({
        value: b.id,
        label: `${b.client_name} - ${dayjs(b.start_time).format('MM-DD HH:mm')}`,
      })),
    ];
  }, [bookings, filterClientId]);

  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => {
      if (filterClientId && d.client_id !== filterClientId) return false;
      if (filterBookingId && d.booking_id !== filterBookingId) return false;
      return true;
    });
  }, [designs, filterClientId, filterBookingId]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadClients(), loadBookings(), loadDesigns()]);
    };
    init();
  }, [loadClients, loadBookings, loadDesigns]);

  useEffect(() => {
    loadDesigns({
      ...(filterClientId ? { clientId: filterClientId } : {}),
      ...(filterBookingId ? { bookingId: filterBookingId } : {}),
    });
  }, [filterClientId, filterBookingId, loadDesigns]);

  const loadVersionImage = async (version: DesignVersion, designId: number) => {
    const cacheKey = version.id;
    if (versionImages[cacheKey] !== undefined) {
      return versionImages[cacheKey];
    }

    try {
      const base64 = await imageToBase64(version.image_path);
      if (base64) {
        setVersionImages((prev) => ({ ...prev, [cacheKey]: base64 }));
        return base64;
      } else {
        setInvalidImages((prev) => new Set([...prev, cacheKey]));
        setVersionImages((prev) => ({ ...prev, [cacheKey]: null }));
        return null;
      }
    } catch {
      setInvalidImages((prev) => new Set([...prev, cacheKey]));
      setVersionImages((prev) => ({ ...prev, [cacheKey]: null }));
      return null;
    }
  };

  const openDesignModal = (design?: DesignDetail) => {
    if (design) {
      setEditingDesign(design);
      setFormData({
        client_id: design.client_id,
        booking_id: design.booking_id,
        name: design.name,
        description: design.description || '',
        image_path: '',
        feedback: '',
      });
    } else {
      setEditingDesign(null);
      setFormData({
        client_id: filterClientId || 0,
        booking_id: filterBookingId,
        name: '',
        description: '',
        image_path: '',
        feedback: '',
      });
    }
    setImagePreview(null);
    setFormErrors({});
    setDesignModalOpen(true);
  };

  const closeDesignModal = () => {
    setDesignModalOpen(false);
    setEditingDesign(null);
    setImagePreview(null);
    setFormErrors({});
  };

  const openDrawer = (design: DesignDetail) => {
    setDrawer({ isOpen: true, design });
    design.versions.forEach((v) => loadVersionImage(v, design.id));
  };

  const closeDrawer = () => {
    setDrawer({ isOpen: false, design: null });
    setCompareState({ version1: null, version2: null, showCompare: false });
  };

  const handleUploadImage = async () => {
    try {
      const filePath = await api.dialog.openFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
      });
      if (!filePath) return;

      setUploadingImage(true);

      if (editingDesign) {
        const result = await api.designs.uploadImage(filePath, editingDesign.id);
        setFormData((prev) => ({ ...prev, image_path: result.savedPath }));

        const base64 = await imageToBase64(result.savedPath);
        setImagePreview(base64);
      } else {
        const base64 = await imageToBase64(filePath);
        setImagePreview(base64);
        setFormData((prev) => ({ ...prev, image_path: filePath }));
      }
    } catch (error) {
      console.error('Upload image error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.client_id) {
      errors.client_id = '请选择客户';
    }
    if (!formData.name?.trim()) {
      errors.name = '请输入图案名称';
    }
    if (!editingDesign && !formData.image_path) {
      errors.image_path = '请上传图案图片';
    }
    if (editingDesign && formData.feedback && !formData.image_path) {
      errors.image_path = '新增版本请上传图案图片';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDesign = async () => {
    if (!validateForm()) return;

    setLoading('saveDesign', true);
    try {
      let savedDesign: DesignDetail;

      if (editingDesign) {
        const updateData: DesignInput = {
          id: editingDesign.id,
          client_id: formData.client_id!,
          booking_id: formData.booking_id || null,
          name: formData.name!,
          description: formData.description || null,
          ...(formData.image_path
            ? {
                image_path: formData.image_path,
                feedback: formData.feedback || null,
              }
            : {}),
        };
        savedDesign = await api.designs.save(updateData);
      } else {
        const newData: DesignInput = {
          client_id: formData.client_id!,
          booking_id: formData.booking_id || null,
          name: formData.name!,
          description: formData.description || null,
          image_path: formData.image_path!,
        };
        savedDesign = await api.designs.save(newData);
      }

      await loadDesigns({
        ...(filterClientId ? { clientId: filterClientId } : {}),
        ...(filterBookingId ? { bookingId: filterBookingId } : {}),
      });

      closeDesignModal();
    } catch (error) {
      console.error('Save design error:', error);
    } finally {
      setLoading('saveDesign', false);
    }
  };

  const handleDeleteDesign = async (designId: number) => {
    const confirm = window.confirm('确定要删除这个图案吗？所有版本历史都将被删除。');
    if (!confirm) return;

    setLoading('deleteDesign', true);
    try {
      await api.designs.delete(designId);
      await loadDesigns({
        ...(filterClientId ? { clientId: filterClientId } : {}),
        ...(filterBookingId ? { bookingId: filterBookingId } : {}),
      });
      closeDrawer();
    } catch (error) {
      console.error('Delete design error:', error);
    } finally {
      setLoading('deleteDesign', false);
    }
  };

  const toggleCompareVersion = (version: DesignVersion) => {
    setCompareState((prev) => {
      if (prev.version1?.id === version.id) {
        return { ...prev, version1: null, showCompare: false };
      }
      if (prev.version2?.id === version.id) {
        return { ...prev, version2: null, showCompare: false };
      }
      if (!prev.version1) {
        return { ...prev, version1: version, showCompare: false };
      }
      if (!prev.version2) {
        return { ...prev, version2: version, showCompare: true };
      }
      return { version1: version, version2: null, showCompare: false };
    });
  };

  const clearCompare = () => {
    setCompareState({ version1: null, version2: null, showCompare: false });
  };

  const renderDesignCard = (design: DesignDetail) => {
    const latestVersion = design.versions[design.versions.length - 1];
    const revisionCount = design.versions.length - 1;
    const hasInvalidImage = latestVersion && invalidImages.has(latestVersion.id);
    const imageSrc = latestVersion ? versionImages[latestVersion.id] : null;

    return (
      <Card
        key={design.id}
        hoverable
        decorativeBorder
        className="group overflow-hidden"
        onClick={() => openDrawer(design)}
      >
        <div className="relative aspect-square overflow-hidden">
          {latestVersion ? (
            <>
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={design.name}
                  className={cn(
                    'w-full h-full object-cover',
                    'transition-transform duration-500',
                    'group-hover:scale-110'
                  )}
                />
              ) : hasInvalidImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 text-ink-400">
                  <ImageOff className="w-10 h-10 mb-2" />
                  <span className="text-xs">图片加载失败</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
                  <Loading size="sm" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 text-ink-400">
              <ImageOff className="w-10 h-10 mb-2" />
              <span className="text-xs">暂无图片</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Eye className="w-4 h-4" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDrawer(design);
                  }}
                >
                  查看详情
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDesignModal(design);
                  }}
                >
                  编辑
                </Button>
              </div>
            </div>
          </div>

          {hasInvalidImage && (
            <div className="absolute top-2 right-2">
              <Badge variant="danger" size="sm">
                图片失效
              </Badge>
            </div>
          )}

          {revisionCount > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="warning" size="sm">
                改稿 {revisionCount} 次
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-3">
          <h4 className="font-medium text-ivory-100 truncate mb-1">{design.name}</h4>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">
              版本 v{design.current_version}
            </span>
            {latestVersion && (
              <span className="text-ink-500">
                {dayjs(latestVersion.created_at).format('MM-DD')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-ink-400 mt-1">
            <User className="w-3 h-3" />
            <span className="truncate">{design.client_name}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderVersionItem = (version: DesignVersion, index: number) => {
    const isSelected =
      compareState.version1?.id === version.id ||
      compareState.version2?.id === version.id;
    const imageSrc = versionImages[version.id];
    const hasError = invalidImages.has(version.id);

    return (
      <div
        key={version.id}
        className={cn(
          'p-3 rounded-lg border transition-all cursor-pointer',
          isSelected
            ? 'bg-vermilion-700/20 border-vermilion-600'
            : 'bg-ink-900 border-ink-700 hover:border-ink-500'
        )}
        onClick={() => toggleCompareVersion(version)}
      >
        <div className="flex items-start gap-3">
          <div className="w-20 h-20 flex-shrink-0">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={`版本 ${version.version_number}`}
                className="w-full h-full object-cover rounded"
              />
            ) : hasError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-ink-800 rounded text-ink-500">
                <ImageOff className="w-6 h-6" />
                <span className="text-[10px]">失效</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-ink-800 rounded">
                <Loading size="sm" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-ivory-100">
                v{version.version_number}
              </span>
              {index === 0 && (
                <Badge variant="success" size="sm">
                  初始版本
                </Badge>
              )}
              {isSelected && (
                <Badge variant="primary" size="sm">
                  {compareState.version1?.id === version.id ? '对比 1' : '对比 2'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-400 mb-1">
              <Clock className="w-3 h-3" />
              <span>{formatDateTime(version.created_at)}</span>
            </div>
            {version.feedback && (
              <p className="text-xs text-ink-300 line-clamp-2">
                改稿意见: {version.feedback}
              </p>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-ink-500 flex-shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <div className="animate-slide-up h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-ivory-100">图案柜</h2>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => openDesignModal()}
        >
          新增图案
        </Button>
      </div>

      <Card decorativeBorder className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-ink-700">
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              options={clientOptions}
              value={filterClientId || 0}
              onChange={(e) => {
                setFilterClientId(parseInt(e.target.value) || null);
                setFilterBookingId(null);
              }}
              className="w-40"
            />
            <Select
              options={bookingOptions}
              value={filterBookingId || 0}
              onChange={(e) => setFilterBookingId(parseInt(e.target.value) || null)}
              className="w-60"
              disabled={!filterClientId && bookings.length > 10}
            />
            {(filterClientId || filterBookingId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterClientId(null);
                  setFilterBookingId(null);
                }}
              >
                清除筛选
              </Button>
            )}
          </div>
        </div>

        {loading.designs ? (
          <div className="flex-1 flex items-center justify-center">
            <Loading text="加载图案中..." />
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="暂无图案"
              description={
                filterClientId || filterBookingId
                  ? '当前筛选条件下没有图案，请尝试其他筛选条件'
                  : '点击右上角按钮添加第一个图案'
              }
              action={
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => openDesignModal()}
                >
                  新增图案
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 scrollbar-thin">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDesigns.map(renderDesignCard)}
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={designModalOpen}
        onClose={closeDesignModal}
        title={editingDesign ? '编辑图案' : '新增图案'}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={closeDesignModal}>
              取消
            </Button>
            <Button
              onClick={handleSaveDesign}
              loading={loading.saveDesign}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editingDesign && formData.image_path ? '保存新版本' : '保存'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {editingDesign && (
            <AlertBanner
              level="info"
              message="编辑模式下，上传新图片将创建新版本。"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="客户"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.client_id || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  client_id: parseInt(e.target.value),
                  booking_id: null,
                }))
              }
              placeholder="请选择客户"
              error={formErrors.client_id}
            />
            <Select
              label="关联预约（可选）"
              options={
                formData.client_id
                  ? bookings
                      .filter((b) => b.client_id === formData.client_id)
                      .map((b) => ({
                        value: b.id,
                        label: `${dayjs(b.start_time).format('YYYY-MM-DD HH:mm')}`,
                      }))
                  : []
              }
              value={formData.booking_id || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  booking_id: parseInt(e.target.value) || null,
                }))
              }
              placeholder={formData.client_id ? '请选择预约' : '请先选择客户'}
              disabled={!formData.client_id}
            />
          </div>

          <Input
            label="图案名称"
            value={formData.name || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="输入图案名称"
            error={formErrors.name}
          />

          <Textarea
            label="描述"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="图案描述信息"
            rows={2}
          />

          {editingDesign && (
            <Textarea
              label="改稿意见（新增版本时填写）"
              value={formData.feedback || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, feedback: e.target.value }))
              }
              placeholder="这次修改的意见或说明"
              rows={2}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-ivory-300 mb-1.5">
              {editingDesign ? '图案图片（留空则不新增版本）' : '图案图片'}
            </label>
            {imagePreview ? (
              <div className="relative">
                <ImagePreview
                  src={imagePreview}
                  alt="图案预览"
                  aspectRatio="aspect-video"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setFormData((prev) => ({ ...prev, image_path: '' }));
                  }}
                  className="absolute top-2 right-2 p-1 bg-ink-900/80 rounded text-ink-400 hover:text-ivory-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={handleUploadImage}
                loading={uploadingImage}
                leftIcon={<Upload className="w-4 h-4" />}
                className="w-full"
              >
                上传图案图片
              </Button>
            )}
            {formErrors.image_path && (
              <p className="text-sm text-vermilion-400 mt-1">
                {formErrors.image_path}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {drawer.isOpen && drawer.design && (
        <>
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-40 animate-fade-in"
            onClick={closeDrawer}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-ink-800 border-l border-ink-700 z-50 animate-slide-up shadow-2xl">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold-700" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold-700" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold-700" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold-700" />

            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-ink-700">
                <div>
                  <h3 className="text-lg font-semibold text-ivory-100 font-display">
                    {drawer.design.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-ink-400">
                    <User className="w-4 h-4" />
                    <span>{drawer.design.client_name}</span>
                    <span className="text-ink-600">|</span>
                    <span>
                      版本 v{drawer.design.current_version}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!compareState.showCompare && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit3 className="w-4 h-4" />}
                      onClick={() => {
                        closeDrawer();
                        openDesignModal(drawer.design!);
                      }}
                    >
                      编辑
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleDeleteDesign(drawer.design!.id)}
                    loading={loading.deleteDesign}
                  >
                    删除
                  </Button>
                  <button
                    onClick={closeDrawer}
                    className="p-1.5 text-ink-400 hover:text-ivory-100 hover:bg-ink-700 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {drawer.design.description && (
                <div className="p-4 border-b border-ink-700">
                  <p className="text-ink-300">{drawer.design.description}</p>
                </div>
              )}

              {compareState.showCompare &&
              compareState.version1 &&
              compareState.version2 ? (
                <div className="flex-1 p-4 overflow-auto scrollbar-thin">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-ivory-100">版本对比</h4>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearCompare}
                    >
                      退出对比
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-center mb-2">
                        <Badge variant="primary">v{compareState.version1.version_number}</Badge>
                        <p className="text-xs text-ink-400 mt-1">
                          {formatDateTime(compareState.version1.created_at)}
                        </p>
                      </div>
                      {versionImages[compareState.version1.id] ? (
                        <img
                          src={versionImages[compareState.version1.id]!}
                          alt={`版本 ${compareState.version1.version_number}`}
                          className="w-full rounded border border-ink-700"
                        />
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-ink-900 rounded border border-ink-700 text-ink-400">
                          <ImageOff className="w-8 h-8" />
                        </div>
                      )}
                      {compareState.version1.feedback && (
                        <div className="mt-2 p-2 bg-ink-900 rounded border border-ink-700">
                          <p className="text-xs text-ink-300">
                            {compareState.version1.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-center mb-2">
                        <Badge variant="success">v{compareState.version2.version_number}</Badge>
                        <p className="text-xs text-ink-400 mt-1">
                          {formatDateTime(compareState.version2.created_at)}
                        </p>
                      </div>
                      {versionImages[compareState.version2.id] ? (
                        <img
                          src={versionImages[compareState.version2.id]!}
                          alt={`版本 ${compareState.version2.version_number}`}
                          className="w-full rounded border border-ink-700"
                        />
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-ink-900 rounded border border-ink-700 text-ink-400">
                          <ImageOff className="w-8 h-8" />
                        </div>
                      )}
                      {compareState.version2.feedback && (
                        <div className="mt-2 p-2 bg-ink-900 rounded border border-ink-700">
                          <p className="text-xs text-ink-300">
                            {compareState.version2.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-4 overflow-auto scrollbar-thin">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-ivory-100">版本历史</h4>
                    <div className="flex items-center gap-2">
                      {compareState.version1 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ArrowLeftRight className="w-4 h-4" />}
                          onClick={clearCompare}
                        >
                          取消选择
                        </Button>
                      )}
                      {compareState.version1 && !compareState.version2 && (
                        <Badge variant="info">再选一个版本进行对比</Badge>
                      )}
                    </div>
                  </div>

                  {drawer.design.versions.length === 0 ? (
                    <EmptyState
                      title="暂无版本"
                      description="该图案还没有上传任何版本"
                    />
                  ) : (
                    <div className="space-y-3">
                      {[...drawer.design.versions]
                        .sort((a, b) => b.version_number - a.version_number)
                        .map((version, index) =>
                          renderVersionItem(
                            version,
                            drawer.design!.versions.length - 1 - index
                          )
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
