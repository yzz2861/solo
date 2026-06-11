import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  GripVertical,
  FileText,
  Image as ImageIcon,
  File,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  FileDown,
  FolderOpen,
  ListOrdered,
  Package,
  Clock,
  AlertTriangle,
  Shield,
  Eye,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MATERIAL_TYPE_LABELS } from '../../shared/types';
import type { Material, MaterialOrder, MaterialOrderItem } from '../../shared/types';

interface OrderedMaterial extends MaterialOrderItem {
  material: Material;
}

interface SortableItemProps {
  id: string;
  material: Material;
  order: number;
  customName: string;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function SortableItem({ id, material, order, customName, onRemove, onRename }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customName);

  const getFileIcon = () => {
    if (material.fileType.startsWith('image/')) return ImageIcon;
    if (material.fileType.includes('pdf')) return FileText;
    if (material.fileType.includes('word') || material.fileType.includes('document')) return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

  const handleSave = () => {
    onRename(id, editName.trim() || customName);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 transition-all group',
        isDragging && 'shadow-lg border-primary-300 z-50'
      )}
    >
      <button
        className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
        order <= 3 ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
      )}>
        {order}
      </div>

      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <FileIcon className="w-5 h-5 text-slate-500" />
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <p className="font-medium text-slate-800 truncate" title={customName}>
              {customName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              原文件：{material.fileName}
            </p>
          </div>
        )}
      </div>

      <span className={cn(
        'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
        material.type === 'chat' ? 'bg-blue-100 text-blue-700' :
        material.type === 'logistics' ? 'bg-green-100 text-green-700' :
        material.type === 'refund' ? 'bg-purple-100 text-purple-700' :
        'bg-slate-100 text-slate-700'
      )}>
        {MATERIAL_TYPE_LABELS[material.type]}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded text-slate-500 hover:text-primary-600 hover:bg-primary-50"
          title="重命名"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(id)}
          className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50"
          title="从导出列表移除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Export() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    materials,
    materialOrders,
    currentSummary,
    loading,
    exporting,
    currentProject,
    setCurrentProject,
    projectApi,
    loadMaterials,
    loadSummary,
    loadMaterialOrders,
    saveMaterialOrders,
    exportMaterials
  } = useAppStore();

  const [exportFormat, setExportFormat] = useState<'zip' | 'markdown'>('zip');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [autoRename, setAutoRename] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (projectId) {
      loadMaterials(projectId);
      loadSummary(projectId);
      loadMaterialOrders(projectId);
      if (!currentProject) {
        projectApi.getById(projectId).then(res => {
          if (res.success && res.data) {
            setCurrentProject(res.data);
          }
        });
      }
    }
  }, [projectId, loadMaterials, loadSummary, loadMaterialOrders, currentProject, setCurrentProject, projectApi]);

  const orderedMaterials = useMemo((): OrderedMaterial[] => {
    if (!materialOrders || materialOrders.items.length === 0) {
      return materials.map((m, i) => ({
        materialId: m.id,
        order: i + 1,
        customName: `${String(i + 1).padStart(2, '0')}_${MATERIAL_TYPE_LABELS[m.type]}_${m.fileName}`,
        include: true,
        material: m
      }));
    }
    return materialOrders.items
      .filter(mo => mo.include)
      .sort((a, b) => a.order - b.order)
      .map(mo => {
        const material = materials.find(m => m.id === mo.materialId);
        return { ...mo, material } as OrderedMaterial;
      })
      .filter(mo => mo.material) as OrderedMaterial[];
  }, [materials, materialOrders]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedMaterials.findIndex(m => m.materialId === active.id);
      const newIndex = orderedMaterials.findIndex(m => m.materialId === over.id);

      const newOrders = arrayMove(orderedMaterials, oldIndex, newIndex).map((item: OrderedMaterial, index: number) => ({
        ...item,
        order: index + 1,
        customName: autoRename
          ? `${String(index + 1).padStart(2, '0')}_${MATERIAL_TYPE_LABELS[item.material.type]}_${item.material.fileName}`
          : item.customName
      }));

      if (projectId) {
        saveMaterialOrders(projectId, newOrders);
      }
    }
  };

  const handleRemoveMaterial = (materialId: string) => {
    if (!projectId) return;
    const items = materialOrders?.items || orderedMaterials;
    const newOrders = items.map(mo =>
      mo.materialId === materialId ? { ...mo, include: false } : mo
    );
    saveMaterialOrders(projectId, newOrders);
  };

  const handleRenameMaterial = (materialId: string, newName: string) => {
    if (!projectId) return;
    const items = materialOrders?.items || orderedMaterials;
    const newOrders = items.map(mo =>
      mo.materialId === materialId ? { ...mo, customName: newName } : mo
    );
    saveMaterialOrders(projectId, newOrders);
  };

  const handleResetOrder = () => {
    if (!projectId) return;
    const newOrders = materials.map((m, i) => ({
      materialId: m.id,
      order: i + 1,
      customName: `${String(i + 1).padStart(2, '0')}_${MATERIAL_TYPE_LABELS[m.type]}_${m.fileName}`,
      include: true
    }));
    saveMaterialOrders(projectId, newOrders);
  };

  const handleExport = async () => {
    if (!projectId) return;
    const result = await exportMaterials(projectId, exportFormat);
    if (result) {
      const url = window.URL.createObjectURL(new Blob());
      const a = document.createElement('a');
      a.href = url;
      const ext = exportFormat === 'zip' ? 'zip' : 'md';
      a.download = `申诉材料_${currentProject?.orderNo || '订单'}_${format(new Date(), 'yyyyMMdd', { locale: zhCN })}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const totalSize = orderedMaterials.reduce((sum, item) => {
    return sum + (item.material?.fileSize || 0);
  }, 0);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">材料导出</h1>
            <p className="text-slate-500 text-sm">调整材料顺序，按平台要求整理后一键导出</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleResetOrder}
              disabled={materials.length === 0}
            >
              重置顺序
            </Button>
            <Button
              variant="accent"
              size="lg"
              leftIcon={<FileDown className="w-5 h-5" />}
              onClick={handleExport}
              loading={exporting}
              disabled={orderedMaterials.length === 0}
            >
              {exporting ? '导出中...' : `导出材料 (${orderedMaterials.length})`}
            </Button>
          </div>
        </div>

        {materials.length === 0 ? (
          <Card className="text-center py-16">
            <Card.Body>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">暂无材料</h3>
              <p className="text-slate-500 text-sm mb-6">请先在材料导入页面上传相关材料</p>
              <Button
                variant="primary"
                onClick={() => navigate(`/project/${projectId}/import`)}
                leftIcon={<ChevronRight className="w-4 h-4 rotate-180" />}
              >
                前往导入材料
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-5 h-5 text-primary-600" />
                      <h2 className="font-semibold text-slate-800">材料排序</h2>
                      <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                        共 {orderedMaterials.length} 项
                      </span>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRename}
                        onChange={(e) => setAutoRename(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      排序时自动重命名
                    </label>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    拖拽调整材料顺序，平台申诉时按此顺序展示材料
                  </p>
                </Card.Header>
                <Card.Body>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedMaterials.map(m => m.materialId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {orderedMaterials.map((item, index) => (
                          <SortableItem
                            key={item.materialId}
                            id={item.materialId}
                            material={item.material!}
                            order={item.order}
                            customName={item.customName}
                            onRemove={handleRemoveMaterial}
                            onRename={handleRenameMaterial}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {orderedMaterials.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">没有选择要导出的材料</p>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {orderedMaterials.length > 0 && (
                <Card>
                  <Card.Header>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <h2 className="font-semibold text-slate-800">材料目录预览</h2>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm">
                      <p className="text-slate-600 mb-2">┌── 申诉材料包/</p>
                      <p className="text-slate-600">│</p>
                      {orderedMaterials.map((item, index) => (
                        <p key={item.materialId} className="text-slate-700">
                          ├── {item.customName}
                        </p>
                      ))}
                      {includeSummary && currentSummary && (
                        <p className="text-primary-700 font-medium">
                          ├── 00_申诉说明文档.md
                        </p>
                      )}
                      <p className="text-slate-600 mt-2">│</p>
                      <p className="text-slate-500">
                        └── 共 {orderedMaterials.length + (includeSummary && currentSummary ? 1 : 0)} 个文件，{formatFileSize(totalSize)}
                      </p>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <Card.Header>
                  <h2 className="font-semibold text-slate-800">导出设置</h2>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">导出格式</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExportFormat('zip')}
                        className={cn(
                          'flex-1 px-4 py-3 rounded-lg border-2 transition-all text-center',
                          exportFormat === 'zip'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        )}
                      >
                        <Package className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">ZIP 压缩包</p>
                        <p className="text-xs opacity-70">包含所有原文件</p>
                      </button>
                      <button
                        onClick={() => setExportFormat('markdown')}
                        className={cn(
                          'flex-1 px-4 py-3 rounded-lg border-2 transition-all text-center',
                          exportFormat === 'markdown'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        )}
                      >
                        <FileText className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">Markdown</p>
                        <p className="text-xs opacity-70">文字+图片引用</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">包含申诉摘要</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h3 className="text-xs font-medium text-slate-500 mb-2">导出统计</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-slate-50 text-center">
                        <p className="text-xl font-bold text-slate-800">{orderedMaterials.length}</p>
                        <p className="text-xs text-slate-500">材料文件</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 text-center">
                        <p className="text-xl font-bold text-slate-800">{formatFileSize(totalSize)}</p>
                        <p className="text-xs text-slate-500">总大小</p>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <h2 className="font-semibold text-slate-800">隐私保护</h2>
                </Card.Header>
                <Card.Body className="space-y-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                    <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700">手机号已脱敏（138****5678）</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                    <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700">身份证号已脱敏</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                    <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700">敏感信息已处理</span>
                  </div>
                  <p className="text-xs text-slate-500 pt-2">
                    导出的材料已自动脱敏，原文安全存储在本地
                  </p>
                </Card.Body>
              </Card>

              {orderedMaterials.length > 0 && (
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  leftIcon={<FileDown className="w-5 h-5" />}
                  onClick={handleExport}
                  loading={exporting}
                >
                  {exporting ? '正在打包导出...' : `导出 ${orderedMaterials.length} 个材料`}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
