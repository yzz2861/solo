import React from 'react';
import { Settings, Info } from 'lucide-react';
import { ImportOptions } from '../../types';
import Checkbox from '../common/Checkbox';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';

interface ImportSettingsProps {
  settings: ImportOptions;
  onSettingsChange: (settings: ImportOptions) => void;
  onUseSampleData?: () => void;
  className?: string;
}

const ImportSettings: React.FC<ImportSettingsProps> = ({
  settings,
  onSettingsChange,
  onUseSampleData,
  className = '',
}) => {
  const updateSetting = <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">导入设置</h3>
        </div>
        {onUseSampleData && (
          <Button variant="secondary" size="sm" onClick={onUseSampleData}>
            加载示例数据
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            文本预处理
          </h4>
          <div className="space-y-3">
            <Checkbox
              checked={settings.removeEmojis}
              onChange={(checked) => updateSetting('removeEmojis', checked)}
              label="自动移除表情符号"
            />
            <Checkbox
              checked={settings.correctTypos}
              onChange={(checked) => updateSetting('correctTypos', checked)}
              label="自动修正常见错别字"
            />
            <Checkbox
              checked={settings.markDuplicates}
              onChange={(checked) => updateSetting('markDuplicates', checked)}
              label="标记重复内容（相似度 > 95%）"
            />
            <Checkbox
              checked={settings.filterShortAnswers}
              onChange={(checked) => updateSetting('filterShortAnswers', checked)}
              label="过滤过短回答（< 2个字符）"
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            聚类设置
          </h4>
          <div className="space-y-4">
            <Select
              label="聚类敏感度"
              value={String(settings.clusteringSensitivity)}
              options={[
                { value: '0.3', label: '低 - 较少主题，大类合并' },
                { value: '0.5', label: '中 - 平衡推荐（默认）' },
                { value: '0.7', label: '高 - 较多主题，细分精确' },
              ]}
              onChange={(e) => updateSetting('clusteringSensitivity', parseFloat(e.target.value))}
              helperText="敏感度越高，分类越细，主题数量越多"
            />
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-start gap-2 p-3 bg-primary-50 rounded-lg">
            <Info className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-primary-700">
              <p className="font-medium mb-1">关于数据安全</p>
              <p className="text-primary-600">
                所有数据处理均在您的浏览器本地完成，不会上传到任何服务器。
                处理后的数据保存在浏览器的 localStorage 中。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportSettings;
