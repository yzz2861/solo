import React, { useState, useCallback } from 'react';
import { ClipboardPaste, Trash2, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import Textarea from '../common/Textarea';
import Badge from '../common/Badge';

interface TextPasteProps {
  onDataLoaded: (data: string[]) => void;
  className?: string;
}

const TextPaste: React.FC<TextPasteProps> = ({ onDataLoaded, className = '' }) => {
  const [text, setText] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  const parseText = useCallback(
    (inputText: string) => {
      const lines = inputText
        .split(/\n|\r\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return lines;
    },
    []
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      const lines = parseText(newText);
      setParsedCount(lines.length);
    },
    [parseText]
  );

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      const lines = parseText(clipboardText);
      setParsedCount(lines.length);
    } catch {
      console.warn('无法访问剪贴板，请手动粘贴');
    }
  }, [parseText]);

  const handleClear = useCallback(() => {
    setText('');
    setParsedCount(null);
  }, []);

  const handleLoad = useCallback(() => {
    const lines = parseText(text);
    if (lines.length > 0) {
      onDataLoaded(lines);
    }
  }, [text, parseText, onDataLoaded]);

  const handlePasteFromClipboardEvent = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      setTimeout(() => {
        const currentText = e.currentTarget.value;
        const lines = parseText(currentText);
        setParsedCount(lines.length);
      }, 0);
    },
    [parseText]
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-900">粘贴文本</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ClipboardPaste className="w-4 h-4" />} onClick={handlePaste}>
            从剪贴板粘贴
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={handleClear}>
            清空
          </Button>
        </div>
      </div>

      <Textarea
        placeholder="请粘贴开放题回答，每行一条回答...&#10;&#10;例如：&#10;包装很精美，送人很有面子&#10;售后服务太差了，等了一周才回复&#10;孩子差点误食，太危险了！"
        value={text}
        onChange={handleTextChange}
        onPaste={handlePasteFromClipboardEvent}
        rows={10}
        className="font-mono text-sm"
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {parsedCount !== null && (
            <Badge variant={parsedCount > 0 ? 'success' : 'default'} size="sm">
              已识别 {parsedCount} 条回答
            </Badge>
          )}
          {parsedCount !== null && parsedCount === 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>请输入至少一条回答</span>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleLoad}
          disabled={parsedCount === null || parsedCount === 0}
        >
          导入这些回答
        </Button>
      </div>
    </div>
  );
};

export default TextPaste;
