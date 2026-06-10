import { useState, useRef, useEffect } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tag from '@/components/common/Tag';
import { standardDefects, getDefectSuggestion } from '@/utils/defectDictionary';

interface DefectTagsProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: { defect: string; suggestion: string }[];
}

const DefectTags: React.FC<DefectTagsProps> = ({ value, onChange, suggestions = [] }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredDefects = standardDefects.filter(
    (defect) =>
      defect.includes(inputValue) && !value.includes(defect)
  );

  const inputSuggestion = inputValue
    ? getDefectSuggestion(inputValue)
    : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = (defect?: string) => {
    const defectToAdd = defect || inputValue.trim();
    if (defectToAdd && !value.includes(defectToAdd)) {
      onChange([...value, defectToAdd]);
    }
    setInputValue('');
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const handleRemove = (defect: string) => {
    onChange(value.filter((d) => d !== defect));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDefects.length > 0 && showSuggestions) {
        handleAdd(filteredDefects[0]);
      } else if (inputValue.trim()) {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsAdding(false);
    }
  };

  const getSuggestionForDefect = (defect: string) => {
    return suggestions.find((s) => s.defect === defect);
  };

  const applySuggestion = (oldDefect: string, newDefect: string) => {
    const newValue = value.map((d) => (d === oldDefect ? newDefect : d));
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && !isAdding && (
          <span className="text-sm text-coffee-400 italic">暂无缺陷标记</span>
        )}
        {value.map((defect) => {
          const suggestion = getSuggestionForDefect(defect);
          const isStandard = standardDefects.includes(defect);
          
          return (
            <div key={defect} className="relative group">
              <Tag
                variant={isStandard ? 'warning' : 'danger'}
                size="md"
                onRemove={() => handleRemove(defect)}
                className={cn(!isStandard && 'ring-2 ring-red-300 ring-offset-1')}
              >
                {defect}
                {!isStandard && <AlertTriangle className="w-3 h-3 ml-1" />}
              </Tag>
              
              {suggestion && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-red-200 text-xs z-10 hidden group-hover:block whitespace-nowrap">
                  <p className="text-red-600 font-medium mb-1">建议修正</p>
                  <button
                    onClick={() => applySuggestion(defect, suggestion.suggestion)}
                    className="text-coffee-700 hover:text-coffee-900 underline"
                  >
                    → {suggestion.suggestion}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        {isAdding && (
          <div className="relative" ref={suggestionsRef}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="输入缺陷..."
              autoFocus
              className="w-28 px-2 py-1 text-sm border border-coffee-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
            />
            
            {showSuggestions && filteredDefects.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-40 max-h-48 overflow-y-auto bg-white rounded-lg shadow-lg border border-coffee-200 z-20">
                {filteredDefects.slice(0, 8).map((defect) => (
                  <button
                    key={defect}
                    type="button"
                    onClick={() => handleAdd(defect)}
                    className="w-full px-3 py-2 text-left text-sm text-coffee-700 hover:bg-coffee-50 transition-colors"
                  >
                    {defect}
                  </button>
                ))}
              </div>
            )}

            {inputSuggestion && !filteredDefects.includes(inputSuggestion) && (
              <div className="absolute top-full left-0 mt-1 w-48 p-2 bg-amber-50 rounded-lg shadow-lg border border-amber-200 z-20">
                <p className="text-xs text-amber-700 mb-1">是不是要找：</p>
                <button
                  type="button"
                  onClick={() => handleAdd(inputSuggestion)}
                  className="text-sm font-medium text-amber-800 hover:text-amber-900 underline"
                >
                  {inputSuggestion}
                </button>
              </div>
            )}
          </div>
        )}
        
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        )}
        
        {isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setInputValue('');
              setShowSuggestions(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-coffee-400 hover:text-coffee-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            取消
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-coffee-100">
        <p className="text-xs text-coffee-400 mb-2">常用缺陷：</p>
        <div className="flex flex-wrap gap-1">
          {standardDefects.slice(0, 10).map((defect) => (
            <button
              key={defect}
              type="button"
              onClick={() => {
                if (!value.includes(defect)) {
                  onChange([...value, defect]);
                }
              }}
              disabled={value.includes(defect)}
              className={cn(
                'px-2 py-0.5 text-xs rounded-full border transition-all',
                value.includes(defect)
                  ? 'bg-coffee-700 text-white border-coffee-700'
                  : 'bg-transparent text-coffee-500 border-coffee-300 hover:border-coffee-500 hover:text-coffee-700'
              )}
            >
              {defect}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DefectTags;
