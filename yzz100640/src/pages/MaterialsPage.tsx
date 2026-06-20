import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  BookOpen,
  Bug,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
} from 'lucide-react';
import SourceBadge from '@/components/SourceBadge';
import { useMaterialStore } from '@/stores/useMaterialStore';
import type { MaterialItem, SourceType } from '@/types';
import { cn } from '@/lib/utils';

type FilterType = SourceType | 'all';

const FILTER_OPTIONS: Array<{
  key: FilterType;
  label: string;
  Icon: typeof BookOpen;
}> = [
  { key: 'all', label: '全部', Icon: BookOpen },
  { key: 'manual', label: '手册', Icon: BookOpen },
  { key: 'pest', label: '病虫', Icon: Bug },
  { key: 'notice', label: '通知', Icon: Megaphone },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function MaterialsPage() {
  const [, setShowFormModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const {
    materials,
    isLoading,
    selectedType,
    list,
    search,
    setSelectedType,
    setSearchKeyword,
    remove,
  } = useMaterialStore();

  const debouncedKeyword = useDebounce(searchInput, 300);

  useEffect(() => {
    void list();
  }, [list]);

  useEffect(() => {
    if (debouncedKeyword.trim()) {
      void search(debouncedKeyword.trim());
    } else {
      setSearchKeyword('');
      void list(selectedType !== 'all' ? selectedType : undefined);
    }
  }, [debouncedKeyword, search, list, selectedType, setSearchKeyword]);

  const handleTypeChange = useCallback(
    (type: FilterType) => {
      setSelectedType(type);
      void list(type !== 'all' ? type : undefined);
    },
    [setSelectedType, list]
  );

  const handleEdit = (item: MaterialItem) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条资料吗？')) {
      void remove(id);
    }
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="h-6 w-24 bg-leaf-100 rounded-full" />
            <div className="flex gap-1">
              <div className="w-7 h-7 bg-leaf-100 rounded" />
              <div className="w-7 h-7 bg-leaf-100 rounded" />
            </div>
          </div>
          <div className="h-5 bg-leaf-100 rounded w-3/4 mb-2" />
          <div className="space-y-1.5 mb-3">
            <div className="h-3 bg-leaf-100 rounded w-full" />
            <div className="h-3 bg-leaf-100 rounded w-full" />
            <div className="h-3 bg-leaf-100 rounded w-2/3" />
          </div>
          <div className="h-px bg-leaf-100 my-3" />
          <div className="flex flex-wrap gap-1.5 mb-2">
            <div className="h-5 w-16 bg-leaf-100 rounded-full" />
            <div className="h-5 w-16 bg-leaf-100 rounded-full" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-leaf-100 rounded" />
            <div className="h-3 w-24 bg-leaf-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-fade-in-up">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-leaf-800">资料管理中心</h1>
          <p className="text-sm text-leaf-500 mt-1">
            统一管理种植手册、病虫资料、县级通知及本地经验条目
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary">
            <Upload className="w-4 h-4" />
            <span>导入资料</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditingItem(null);
              setShowFormModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>新增条目</span>
          </button>
        </div>
      </div>

      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-leaf-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="搜索标题、内容、关键词"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {FILTER_OPTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
              selectedType === key
                ? 'bg-leaf-600 text-white shadow-soft'
                : 'bg-white text-leaf-700 border border-leaf-200 hover:border-leaf-400 hover:bg-leaf-50'
            )}
            onClick={() => handleTypeChange(key)}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-stagger">
          {materials.map((item) => {
            const displayKeywords = item.keywords.slice(0, 3);
            const remainingKeywords = item.keywords.length - displayKeywords.length;

            return (
              <div key={item.id} className="card-hover p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <SourceBadge sourceType={item.sourceType} sourceName={item.sourceName} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-leaf-50 text-leaf-500 transition"
                      onClick={() => handleEdit(item)}
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-red-50 text-red-500 transition"
                      onClick={() => handleDelete(item.id)}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="font-medium text-leaf-900 mb-2 line-clamp-1">
                  {item.title}
                </h4>

                <p className="text-sm text-leaf-600 line-clamp-3 leading-relaxed mb-3">
                  {item.content}
                </p>

                <div className="border-t border-leaf-100/60 pt-3">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {displayKeywords.map((kw) => (
                      <span key={kw} className="chip-default">
                        {kw}
                      </span>
                    ))}
                    {remainingKeywords > 0 && (
                      <span className="chip-default">+{remainingKeywords}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-leaf-400">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {item.sourcePage ? `第${item.sourcePage}页` : '未标注页码'}
                    </span>
                    <span className="truncate max-w-[60%]">
                      适用{item.applicableCrops.join('、')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
