import React, { useState } from 'react';
import { Star, Save, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { TastingNote } from '@/types';

interface TastingFormProps {
  batchId: string;
  existingNote?: TastingNote;
  onSubmit: (note: Omit<TastingNote, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}

export const TastingForm: React.FC<TastingFormProps> = ({
  batchId,
  existingNote,
  onSubmit,
  onCancel,
}) => {
  const [isEditing, setIsEditing] = useState(!existingNote);
  const [conclusion, setConclusion] = useState(existingNote?.conclusion || '');
  const [treatment, setTreatment] = useState(existingNote?.treatment || '');
  const [score, setScore] = useState(existingNote?.score || 75);
  const [author, setAuthor] = useState(existingNote?.author || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conclusion.trim() || !author.trim()) return;
    
    onSubmit({
      conclusion: conclusion.trim(),
      treatment: treatment.trim(),
      score,
      author: author.trim(),
    });
    
    if (!existingNote) {
      setConclusion('');
      setTreatment('');
      setScore(75);
      setAuthor('');
    }
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (existingNote) {
      setConclusion(existingNote.conclusion);
      setTreatment(existingNote.treatment);
      setScore(existingNote.score);
      setAuthor(existingNote.author);
      setIsEditing(false);
    } else if (onCancel) {
      onCancel();
    }
  };

  const renderStars = (value: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => setScore(star * 20) : undefined}
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
            disabled={!interactive}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star * 20 <= value
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isEditing && existingNote) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              品评记录
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit3 className="w-4 h-4 mr-1" />
              编辑
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="amber">{existingNote.author}</Badge>
            <div className="flex items-center gap-3">
              {renderStars(existingNote.score)}
              <span className="text-2xl font-bold text-amber-700">{existingNote.score}</span>
              <span className="text-amber-500">/100</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-amber-700 mb-1">品评结论</h4>
            <p className="text-amber-900 leading-relaxed">{existingNote.conclusion}</p>
          </div>
          
          {existingNote.treatment && (
            <div>
              <h4 className="text-sm font-medium text-amber-700 mb-1">处理措施</h4>
              <p className="text-amber-800 leading-relaxed">{existingNote.treatment}</p>
            </div>
          )}
          
          <p className="text-xs text-amber-500 text-right">
            记录时间：{new Date(existingNote.createdAt).toLocaleString('zh-CN')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          {existingNote ? '编辑品评记录' : '添加品评记录'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-2">
              评分 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              {renderStars(score, true)}
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value))}
                className="flex-1 h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <span className="text-2xl font-bold text-amber-700 w-12 text-right">{score}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-1">
              品评人 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入品评人姓名"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-1">
              品评结论 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="请描述风味、口感、是否有异常等..."
              rows={4}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-1">
              处理措施
            </label>
            <textarea
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="已采取或建议的处理措施..."
              rows={3}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
            <Button type="submit" disabled={!conclusion.trim() || !author.trim()}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
