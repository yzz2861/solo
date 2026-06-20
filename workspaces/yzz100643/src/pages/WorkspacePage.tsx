import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  AlertTriangle,
  Users,
  FileText,
  CheckCircle2,
  Edit3,
  Save,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Input, TextArea, Select } from '@/components/ui/Form';
import StampBadge from '@/components/ui/StampBadge';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import Progress from '@/components/ui/Progress';
import useArchiveStore from '@/store/useArchiveStore';
import { getFieldLabel, getConfidenceBgColor } from '@/utils/common';
import type { ArchiveRecord, ExtractedField } from '@/types';

const WorkspacePage = () => {
  const navigate = useNavigate();
  const { 
    getCurrentProject, 
    getFilteredRecords, 
    filterOptions, 
    setFilter,
    selectedRecordId,
    setSelectedRecord,
    updateRecordField,
    updateRecordStatus,
    updateRecordNotes,
    getRecordById
  } = useArchiveStore();
  
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localNotes, setLocalNotes] = useState('');
  
  const project = getCurrentProject();
  const records = getFilteredRecords();
  const selectedRecord = selectedRecordId ? getRecordById(selectedRecordId) : null;
  
  const materialTypes = useMemo(() => {
    const types = new Set<string>();
    records.forEach(r => {
      const typeField = r.fields.find(f => f.fieldName === 'materialType');
      if (typeField?.ocrValue) types.add(typeField.ocrValue);
    });
    return Array.from(types);
  }, [records]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-archive-300" />
            <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
              请先选择或创建项目
            </h3>
            <p className="text-archive-500 mb-6">
              返回首页导入数据或选择已有项目
            </p>
            <Button onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSelectRecord = (record: ArchiveRecord) => {
    setSelectedRecord(record.id);
    setZoom(100);
    setRotation(0);
    setEditingField(null);
    setLocalNotes(record.reviewNotes || '');
  };

  const handleStartEdit = (field: ExtractedField) => {
    setEditingField(field.id);
    setEditValue(field.correctedValue || field.ocrValue);
  };

  const handleSaveEdit = (field: ExtractedField) => {
    if (selectedRecord) {
      updateRecordField(selectedRecord.id, field.id, editValue);
      setEditingField(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveNotes = () => {
    if (selectedRecord) {
      updateRecordNotes(selectedRecord.id, localNotes);
    }
  };

  const handlePrevious = () => {
    const currentIndex = records.findIndex(r => r.id === selectedRecordId);
    if (currentIndex > 0) {
      handleSelectRecord(records[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = records.findIndex(r => r.id === selectedRecordId);
    if (currentIndex < records.length - 1) {
      handleSelectRecord(records[currentIndex + 1]);
    }
  };

  const handleMarkStatus = (status: 'corrected' | 'approved') => {
    if (selectedRecord) {
      updateRecordStatus(selectedRecord.id, status);
    }
  };

  const renderFieldRow = (field: ExtractedField) => {
    const fieldLabel = getFieldLabel(field.fieldName);
    const isEditing = editingField === field.id;
    const displayValue = field.correctedValue || field.ocrValue;
    
    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-archive-700">{fieldLabel}</span>
            {field.isLowConfidence && (
              <Badge variant="warning" size="sm">低置信</Badge>
            )}
            {field.isAmbiguous && (
              <Badge variant="info" size="sm">多匹配</Badge>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={() => handleStartEdit(field)}
              className="text-archive-400 hover:text-archive-600 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className={`rounded-lg p-3 ${getConfidenceBgColor(field.confidence)}`}>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button size="sm" onClick={() => handleSaveEdit(field)}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className={`font-medium ${field.correctedValue ? 'text-success' : 'text-archive-800'}`}>
                {displayValue || <span className="text-archive-400 italic">未识别</span>}
              </p>
              {field.ocrValue && field.correctedValue && field.ocrValue !== field.correctedValue && (
                <p className="text-xs text-archive-500 line-through">
                  原OCR: {field.ocrValue}
                </p>
              )}
              <ConfidenceIndicator confidence={field.confidence} size="sm" showLabel={false} />
              {field.ambiguousMatches && field.ambiguousMatches.length > 0 && (
                <div className="mt-2 pt-2 border-t border-archive-200/50">
                  <p className="text-xs text-archive-500 mb-1">其他可能匹配：</p>
                  <div className="flex flex-wrap gap-1">
                    {field.ambiguousMatches.map((match, i) => (
                      <Badge key={i} variant="info" size="sm">{match}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const stats = useMemo(() => {
    const total = records.length;
    const lowConf = records.filter(r => r.fields.some(f => f.isLowConfidence)).length;
    const corrected = records.filter(r => r.status === 'corrected' || r.status === 'approved').length;
    const missingPages = records.filter(r => r.hasMissingPage).length;
    const sameNames = records.filter(r => r.hasSameNameWarning).length;
    return { total, lowConf, corrected, missingPages, sameNames };
  }, [records]);

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-archive-900 mb-1">
            {project.name}
          </h1>
          <p className="text-archive-500 text-sm">{project.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-archive-700">
              {stats.corrected} / {stats.total} 已处理
            </p>
            <Progress 
              value={stats.corrected} 
              max={stats.total} 
              className="w-32"
            />
          </div>
          <Button variant="secondary" onClick={() => navigate('/')}>
            返回项目列表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-archive-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-archive-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-archive-800 font-serif">{stats.total}</p>
                <p className="text-xs text-archive-500">总记录数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning font-serif">{stats.lowConf}</p>
                <p className="text-xs text-archive-500">低置信度</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-error font-serif">{stats.missingPages}</p>
                <p className="text-xs text-archive-500">疑似缺页</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-archive-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-archive-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-archive-800 font-serif">{stats.sameNames}</p>
                <p className="text-xs text-archive-500">同名提醒</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-archive-400" />
                  <Input
                    placeholder="搜索文本..."
                    value={filterOptions.search}
                    onChange={(e) => setFilter('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label=""
                    value={filterOptions.status}
                    onChange={(e) => setFilter('status', e.target.value)}
                    options={[
                      { value: 'all', label: '全部状态' },
                      { value: 'pending', label: '待校对' },
                      { value: 'reviewing', label: '校对中' },
                      { value: 'corrected', label: '已修正' },
                      { value: 'approved', label: '已通过' }
                    ]}
                  />
                  <Select
                    label=""
                    value={filterOptions.confidence}
                    onChange={(e) => setFilter('confidence', e.target.value)}
                    options={[
                      { value: 'all', label: '全部置信度' },
                      { value: 'low', label: '低置信' },
                      { value: 'medium', label: '中置信' },
                      { value: 'high', label: '高置信' }
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label=""
                    value={filterOptions.field}
                    onChange={(e) => setFilter('field', e.target.value)}
                    options={[
                      { value: 'all', label: '全部字段' },
                      { value: 'name', label: '姓名' },
                      { value: 'date', label: '日期' },
                      { value: 'documentNumber', label: '编号' },
                      { value: 'pageNumber', label: '页码' },
                      { value: 'materialType', label: '材料类型' }
                    ]}
                  />
                  <Select
                    label=""
                    value={filterOptions.materialType}
                    onChange={(e) => setFilter('materialType', e.target.value)}
                    options={[
                      { value: 'all', label: '全部类型' },
                      ...materialTypes.map(t => ({ value: t, label: t }))
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {records.length === 0 ? (
                <div className="text-center py-12 text-archive-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>没有符合条件的记录</p>
                </div>
              ) : (
                <ul className="divide-y divide-archive-50">
                  {records.map(record => {
                    const nameField = record.fields.find(f => f.fieldName === 'name');
                    const dateField = record.fields.find(f => f.fieldName === 'date');
                    const isSelected = selectedRecordId === record.id;
                    const hasLowConfidence = record.fields.some(f => f.isLowConfidence);
                    
                    return (
                      <li
                        key={record.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-archive-950/5 border-l-4 border-archive-950' 
                            : 'hover:bg-archive-50 border-l-4 border-transparent'
                        }`}
                        onClick={() => handleSelectRecord(record)}
                      >
                        <div className="flex items-start gap-3">
                          <StampBadge status={record.status} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-medium truncate ${isSelected ? 'text-archive-900' : 'text-archive-800'}`}>
                                {nameField?.correctedValue || nameField?.ocrValue || '未识别姓名'}
                              </p>
                              <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-archive-950' : 'text-archive-300'}`} />
                            </div>
                            <p className="text-xs text-archive-500 mb-1">
                              {dateField?.correctedValue || dateField?.ocrValue || '未识别日期'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <ConfidenceIndicator 
                                confidence={record.overallConfidence} 
                                showLabel 
                                showBar={false}
                                size="sm"
                              />
                              {hasLowConfidence && (
                                <Badge variant="warning" size="sm">待校对</Badge>
                              )}
                              {record.hasMissingPage && (
                                <Badge variant="error" size="sm">缺页</Badge>
                              )}
                              {record.hasSameNameWarning && (
                                <Badge variant="info" size="sm">同名</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8 flex flex-col min-h-0">
          {selectedRecord ? (
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
              <Card className="flex flex-col min-h-0">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">照片预览</CardTitle>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setZoom(z => Math.max(50, z - 25))}
                        className="p-2 hover:bg-archive-100 rounded-lg transition-colors"
                      >
                        <ZoomOut className="w-4 h-4 text-archive-600" />
                      </button>
                      <span className="text-sm text-archive-600 w-12 text-center">{zoom}%</span>
                      <button
                        onClick={() => setZoom(z => Math.min(200, z + 25))}
                        className="p-2 hover:bg-archive-100 rounded-lg transition-colors"
                      >
                        <ZoomIn className="w-4 h-4 text-archive-600" />
                      </button>
                      <button
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-2 hover:bg-archive-100 rounded-lg transition-colors"
                      >
                        <RotateCw className="w-4 h-4 text-archive-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-archive-500 truncate">
                      {selectedRecord.photoFileName}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={handlePrevious} disabled={records.findIndex(r => r.id === selectedRecordId) === 0}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleNext} disabled={records.findIndex(r => r.id === selectedRecordId) === records.length - 1}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto flex items-center justify-center bg-archive-50 p-4">
                  <div
                    className="max-w-full max-h-full shadow-lg rounded-lg overflow-hidden bg-white"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                  >
                    <img
                      src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`old chinese archive document paper, aged yellow paper texture, traditional chinese handwriting, red seals, vintage document, detailed`)}&image_size=portrait_4_3`}
                      alt={selectedRecord.photoFileName}
                      className="max-w-md h-auto"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4 min-h-0">
                <Card className="flex-shrink-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">字段信息</CardTitle>
                      <StampBadge status={selectedRecord.status} size="sm" />
                    </div>
                    {selectedRecord.hasMissingPage && (
                      <div className="mt-2 p-2 bg-error/5 border border-error/20 rounded-lg">
                        <p className="text-xs text-error flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {selectedRecord.missingPageReason}
                        </p>
                      </div>
                    )}
                    {selectedRecord.hasSameNameWarning && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          存在同名人员记录，请注意核对
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                    {selectedRecord.fields.map(field => renderFieldRow(field))}
                    
                    <div className="pt-3 border-t border-archive-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-archive-700">整体置信度</span>
                      </div>
                      <ConfidenceIndicator 
                        confidence={selectedRecord.overallConfidence} 
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleMarkStatus('corrected')}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        标记已修正
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkStatus('approved')}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        审核通过
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">校对备注</CardTitle>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={handleSaveNotes}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        保存
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-4">
                    <TextArea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="输入校对备注..."
                      className="h-full resize-none"
                    />
                  </CardContent>
                </Card>

                <Card className="flex-shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">原始OCR文本</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <p className="text-sm text-archive-600 whitespace-pre-wrap leading-relaxed font-mono">
                      {selectedRecord.ocrText || '无OCR文本'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-archive-300" />
                <h3 className="font-serif text-xl font-semibold text-archive-800 mb-2">
                  选择一条记录开始校对
                </h3>
                <p className="text-archive-500">
                  从左侧列表中点击记录查看详情
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;
