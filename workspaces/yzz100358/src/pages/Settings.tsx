import { useState, useEffect } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  MapPin,
  Database,
  Download,
  Upload,
  ImageOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  Settings2,
  Users,
  HardDrive,
  Copyright,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/api';
import { useAppStore } from '@/store';
import { cn } from '@/utils/helpers';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Modal,
  AlertBanner,
  Loading,
  Input,
  Textarea,
} from '@/components/ui';
import type { Artist, BodyPart, ImageCheckResult } from '@shared/types';

interface ArtistFormData {
  id?: number;
  name: string;
  specialty: string;
  is_active: number;
}

export default function Settings() {
  const { artists, bodyParts, loadArtists, loadBodyParts } = useAppStore();
  const [activeTab, setActiveTab] = useState<'artists' | 'bodyParts' | 'data' | 'about'>('artists');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [artistModal, setArtistModal] = useState<{
    isOpen: boolean;
    artist: ArtistFormData | null;
  }>({ isOpen: false, artist: null });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    danger?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });

  const [dbPath, setDbPath] = useState<string>('');
  const [imageCheckResult, setImageCheckResult] = useState<ImageCheckResult | null>(null);

  const appVersion = '1.0.0';
  const copyrightYear = new Date().getFullYear();

  useEffect(() => {
    loadArtists();
    loadBodyParts();
    fetchDbPath();
  }, [loadArtists, loadBodyParts]);

  const fetchDbPath = async () => {
    try {
      const path = await api.app.getDbPath();
      setDbPath(path);
    } catch (error) {
      console.error('Failed to get DB path:', error);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
  };

  const handleSaveArtist = async (data: ArtistFormData) => {
    setLoading((prev) => ({ ...prev, saveArtist: true }));
    try {
      await api.artists.save({
        id: data.id,
        name: data.name,
        specialty: data.specialty || null,
        is_active: data.is_active,
      });
      await loadArtists();
      setArtistModal({ isOpen: false, artist: null });
      showAlert('success', data.id ? '师傅信息已更新' : '师傅已添加');
    } catch (error) {
      showAlert('error', '保存失败，请重试');
    } finally {
      setLoading((prev) => ({ ...prev, saveArtist: false }));
    }
  };

  const handleDeleteArtist = async (artist: Artist) => {
    setConfirmModal({
      isOpen: true,
      title: '确认删除',
      message: `确定要删除师傅「${artist.name}」吗？此操作不可撤销。`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.artists.save({
            id: artist.id,
            name: artist.name,
            specialty: artist.specialty,
            is_active: 0,
          });
          await loadArtists();
          showAlert('success', '师傅已删除');
        } catch (error) {
          showAlert('error', '删除失败，请重试');
        }
      },
    });
  };

  const handleToggleArtistActive = async (artist: Artist) => {
    try {
      await api.artists.save({
        id: artist.id,
        name: artist.name,
        specialty: artist.specialty,
        is_active: artist.is_active === 1 ? 0 : 1,
      });
      await loadArtists();
      showAlert('success', artist.is_active === 1 ? '师傅已停用' : '师傅已启用');
    } catch (error) {
      showAlert('error', '操作失败，请重试');
    }
  };

  const handleBackupDb = async () => {
    setLoading((prev) => ({ ...prev, backup: true }));
    try {
      const result = await api.app.backupDb();
      if (result.success) {
        showAlert('success', `数据库已备份: ${result.filePath}`);
      } else {
        showAlert('error', '备份失败');
      }
    } catch (error) {
      showAlert('error', '备份失败，请重试');
    } finally {
      setLoading((prev) => ({ ...prev, backup: false }));
    }
  };

  const handleRestoreDb = async () => {
    setConfirmModal({
      isOpen: true,
      title: '确认恢复数据库',
      message: '恢复数据库将覆盖当前所有数据。请确保已备份最新数据，此操作不可撤销。',
      danger: true,
      onConfirm: async () => {
        setLoading((prev) => ({ ...prev, restore: true }));
        try {
          const result = await api.app.restoreDb();
          if (result.success) {
            showAlert('success', `数据库已恢复，备份文件: ${result.backupPath}`);
            await loadArtists();
            await loadBodyParts();
          } else {
            showAlert('error', '恢复失败或已取消');
          }
        } catch (error) {
          showAlert('error', '恢复失败，请重试');
        } finally {
          setLoading((prev) => ({ ...prev, restore: false }));
        }
      },
    });
  };

  const handleCheckImages = async () => {
    setLoading((prev) => ({ ...prev, checkImages: true }));
    try {
      const result = await api.designs.checkImages();
      setImageCheckResult(result);
      if (result.invalid.length === 0) {
        showAlert('success', `所有 ${result.valid.length} 张图片均有效`);
      } else {
        showAlert('error', `发现 ${result.invalid.length} 张失效图片`);
      }
    } catch (error) {
      showAlert('error', '检查失败，请重试');
    } finally {
      setLoading((prev) => ({ ...prev, checkImages: false }));
    }
  };

  const handleConfirmAction = async () => {
    const { onConfirm } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    await onConfirm();
  };

  const tabs = [
    { id: 'artists', label: '师傅管理', icon: Users },
    { id: 'bodyParts', label: '身体部位', icon: MapPin },
    { id: 'data', label: '数据管理', icon: HardDrive },
    { id: 'about', label: '关于', icon: Info },
  ] as const;

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ivory-100">系统设置</h2>
      </div>

      {alert && (
        <AlertBanner
          level={alert.type}
          message={alert.message}
          dismissible
          onDismiss={() => setAlert(null)}
        />
      )}

      <div className="flex gap-1 p-1 bg-ink-800/50 rounded-lg border border-ink-700 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-vermilion-700 text-ivory-100'
                  : 'text-ink-300 hover:text-ivory-200 hover:bg-ink-700/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'artists' && (
        <Card decorativeBorder>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-500" />
                师傅管理
              </div>
              <Button
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() =>
                  setArtistModal({
                    isOpen: true,
                    artist: { name: '', specialty: '', is_active: 1 },
                  })
                }
              >
                添加师傅
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artists.length === 0 ? (
              <div className="text-center py-12 text-ink-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无师傅数据</p>
                <p className="text-sm mt-1">点击上方按钮添加第一位师傅</p>
              </div>
            ) : (
              <div className="space-y-3">
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                      artist.is_active === 1
                        ? 'bg-ink-800/50 border-ink-700 hover:border-ink-600'
                        : 'bg-ink-900/30 border-ink-700/50 opacity-60'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-ivory-100">{artist.name}</span>
                        {artist.is_active === 1 ? (
                          <Badge variant="success" size="sm">
                            在职
                          </Badge>
                        ) : (
                          <Badge variant="info" size="sm">
                            已停用
                          </Badge>
                        )}
                      </div>
                      {artist.specialty && (
                        <p className="text-sm text-ink-400">专长: {artist.specialty}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleArtistActive(artist)}
                        className="p-2 text-ink-400 hover:text-ivory-300 hover:bg-ink-700 rounded-lg transition-colors"
                        title={artist.is_active === 1 ? '停用' : '启用'}
                      >
                        {artist.is_active === 1 ? (
                          <ToggleRight className="w-5 h-5 text-military-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-ink-500" />
                        )}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Pencil className="w-4 h-4" />}
                        onClick={() =>
                          setArtistModal({
                            isOpen: true,
                            artist: {
                              id: artist.id,
                              name: artist.name,
                              specialty: artist.specialty || '',
                              is_active: artist.is_active,
                            },
                          })
                        }
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDeleteArtist(artist)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'bodyParts' && (
        <Card decorativeBorder>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold-500" />
              身体部位管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bodyParts.length === 0 ? (
              <div className="text-center py-12 text-ink-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无身体部位数据</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bodyParts.map((part) => (
                  <div
                    key={part.id}
                    className={cn(
                      'p-3 rounded-lg border transition-all duration-200',
                      part.is_sensitive === 1
                        ? 'bg-vermilion-900/20 border-vermilion-700/50'
                        : 'bg-ink-800/50 border-ink-700 hover:border-ink-600'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={cn(
                            'font-medium block truncate',
                            part.is_sensitive === 1 ? 'text-vermilion-300' : 'text-ivory-100'
                          )}
                        >
                          {part.name}
                        </span>
                        {part.category && (
                          <span className="text-xs text-ink-400">{part.category}</span>
                        )}
                      </div>
                      {part.is_sensitive === 1 && (
                        <Badge variant="danger" size="sm">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'data' && (
        <div className="space-y-6">
          <Card decorativeBorder>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gold-500" />
                数据库
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-ink-400 uppercase tracking-wider">数据库路径</label>
                <p className="mt-1 text-sm text-ivory-200 font-mono bg-ink-900/50 p-3 rounded-lg border border-ink-700 break-all">
                  {dbPath || '加载中...'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  leftIcon={<Download className="w-4 h-4" />}
                  loading={loading.backup}
                  onClick={handleBackupDb}
                >
                  备份数据库
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<Upload className="w-4 h-4" />}
                  loading={loading.restore}
                  onClick={handleRestoreDb}
                >
                  恢复数据库
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card decorativeBorder>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageOff className="w-5 h-5 text-gold-500" />
                  图片有效性检查
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  loading={loading.checkImages}
                  onClick={handleCheckImages}
                >
                  开始检查
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imageCheckResult === null ? (
                <div className="text-center py-8 text-ink-400">
                  <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>点击上方按钮检查图案图片的有效性</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-military-500" />
                      <span className="text-ivory-200">
                        有效图片: <span className="font-bold">{imageCheckResult.valid.length}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-vermilion-500" />
                      <span className="text-ivory-200">
                        失效图片: <span className="font-bold">{imageCheckResult.invalid.length}</span>
                      </span>
                    </div>
                  </div>

                  {imageCheckResult.invalid.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-vermilion-400 mb-2">
                        失效图片列表
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {imageCheckResult.invalid.map((item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-vermilion-900/20 border border-vermilion-700/50 rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-ivory-200 font-medium">{item.designName}</p>
                                <p className="text-xs text-ink-400 font-mono mt-1 break-all">
                                  {item.path}
                                </p>
                              </div>
                              <Badge variant="danger" size="sm">
                                失效
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'about' && (
        <Card decorativeBorder>
          <CardContent className="py-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-vermilion-700 to-vermilion-900 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings2 className="w-10 h-10 text-ivory-100" />
              </div>
              <h3 className="text-2xl font-bold text-ivory-100 font-display mb-2">
                纹身预约图案柜
              </h3>
              <p className="text-ink-400 mb-6">纹身工作室预约管理系统</p>

              <div className="space-y-3 text-left bg-ink-900/30 p-4 rounded-lg border border-ink-700">
                <div className="flex justify-between">
                  <span className="text-ink-400">版本号</span>
                  <span className="text-ivory-200 font-mono">v{appVersion}</span>
                </div>
                <div className="border-t border-ink-700" />
                <div className="flex justify-between">
                  <span className="text-ink-400">构建类型</span>
                  <span className="text-ivory-200">桌面应用 (Electron)</span>
                </div>
                <div className="border-t border-ink-700" />
                <div className="flex justify-between">
                  <span className="text-ink-400">数据库</span>
                  <span className="text-ivory-200">SQLite</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-ink-700">
                <p className="text-ink-500 text-sm flex items-center justify-center gap-1">
                  <Copyright className="w-4 h-4" />
                  {copyrightYear} Tattoo Studio. All rights reserved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={artistModal.isOpen}
        onClose={() => setArtistModal({ isOpen: false, artist: null })}
        title={artistModal.artist?.id ? '编辑师傅' : '添加师傅'}
        footer={
          artistModal.artist && (
            <>
              <Button
                variant="ghost"
                leftIcon={<X className="w-4 h-4" />}
                onClick={() => setArtistModal({ isOpen: false, artist: null })}
              >
                取消
              </Button>
              <Button
                leftIcon={<Save className="w-4 h-4" />}
                loading={loading.saveArtist}
                onClick={() => {
                  if (artistModal.artist && artistModal.artist.name.trim()) {
                    handleSaveArtist(artistModal.artist);
                  }
                }}
                disabled={!artistModal.artist?.name.trim()}
              >
                保存
              </Button>
            </>
          )
        }
      >
        {artistModal.artist && (
          <div className="space-y-4">
            <Input
              label="师傅姓名"
              value={artistModal.artist.name}
              onChange={(e) =>
                setArtistModal((prev) => ({
                  ...prev,
                  artist: prev.artist ? { ...prev.artist, name: e.target.value } : null,
                }))
              }
              placeholder="请输入师傅姓名"
            />
            <Textarea
              label="专长"
              value={artistModal.artist.specialty}
              onChange={(e) =>
                setArtistModal((prev) => ({
                  ...prev,
                  artist: prev.artist ? { ...prev.artist, specialty: e.target.value } : null,
                }))
              }
              placeholder="例如: 传统纹身、黑灰写实、小清新..."
              rows={3}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-ivory-300">状态:</label>
              <button
                type="button"
                onClick={() =>
                  setArtistModal((prev) => ({
                    ...prev,
                    artist: prev.artist
                      ? {
                          ...prev.artist,
                          is_active: prev.artist.is_active === 1 ? 0 : 1,
                        }
                      : null,
                  }))
                }
                className="flex items-center gap-2 text-sm"
              >
                {artistModal.artist.is_active === 1 ? (
                  <ToggleRight className="w-6 h-6 text-military-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-ink-500" />
                )}
                <span
                  className={
                    artistModal.artist.is_active === 1 ? 'text-military-400' : 'text-ink-400'
                  }
                >
                  {artistModal.artist.is_active === 1 ? '在职' : '已停用'}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              取消
            </Button>
            <Button
              variant={confirmModal.danger ? 'danger' : 'primary'}
              onClick={handleConfirmAction}
            >
              确认
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg flex-shrink-0',
              confirmModal.danger ? 'bg-vermilion-900/50' : 'bg-gold-900/50'
            )}
          >
            <AlertTriangle
              className={cn('w-6 h-6', confirmModal.danger ? 'text-vermilion-400' : 'text-gold-400')}
            />
          </div>
          <p className="text-ivory-200">{confirmModal.message}</p>
        </div>
      </Modal>
    </div>
  );
}
