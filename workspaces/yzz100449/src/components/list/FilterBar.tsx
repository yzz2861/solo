import { useState } from 'react';
import dayjs from 'dayjs';
import { Search, Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { BRANDS, STATUS_LABEL, type RecycleStatus } from '/Users/bill/Documents/solo/workspaces/yzz100449/src/types';

export interface FilterValues {
  keyword: string;
  status: RecycleStatus | '';
  brand: string;
  dateStart: string;
  dateEnd: string;
}

interface Props {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onReset: () => void;
  totalCount: number;
}

export default function FilterBar({ filters, onChange, onReset, totalCount }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  const update = (patch: Partial<FilterValues>) => {
    onChange({ ...filters, ...patch });
  };

  const activeCount = [
    filters.keyword,
    filters.status,
    filters.brand,
    filters.dateStart,
    filters.dateEnd,
  ].filter(Boolean).length;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-soft">
            <Filter size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">筛选条件</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              共找到 <span className="font-bold text-brand-600">{totalCount}</span> 条回收记录
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={onReset}
              className="btn-ghost text-xs !px-3 !py-1.5 !min-h-[32px]"
            >
              <X size={14} />
              清除筛选 ({activeCount})
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost text-xs !px-3 !py-1.5 !min-h-[32px]"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label className="label">关键词搜索</label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="序列号 / 机型 / IMEI"
                value={filters.keyword}
                onChange={(e) => update({ keyword: e.target.value })}
              />
              {filters.keyword && (
                <button
                  onClick={() => update({ keyword: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 text-slate-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="label">状态</label>
            <div className="relative">
              <button
                onClick={() => { setStatusOpen(!statusOpen); setBrandOpen(false); }}
                className={`input text-left flex items-center justify-between ${filters.status ? '' : 'text-slate-400'}`}
              >
                <span>{filters.status ? STATUS_LABEL[filters.status as RecycleStatus] : '全部状态'}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-20 card !rounded-xl overflow-hidden py-1 max-h-64 overflow-auto">
                    <button
                      onClick={() => { update({ status: '' }); setStatusOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${!filters.status ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
                    >
                      全部状态
                    </button>
                    {Object.entries(STATUS_LABEL).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { update({ status: key as RecycleStatus }); setStatusOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${filters.status === key ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="label">品牌</label>
            <div className="relative">
              <button
                onClick={() => { setBrandOpen(!brandOpen); setStatusOpen(false); }}
                className={`input text-left flex items-center justify-between ${filters.brand ? '' : 'text-slate-400'}`}
              >
                <span>{filters.brand || '全部品牌'}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${brandOpen ? 'rotate-180' : ''}`} />
              </button>
              {brandOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBrandOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-20 card !rounded-xl overflow-hidden py-1 max-h-64 overflow-auto">
                    <button
                      onClick={() => { update({ brand: '' }); setBrandOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${!filters.brand ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
                    >
                      全部品牌
                    </button>
                    {BRANDS.map((brand) => (
                      <button
                        key={brand}
                        onClick={() => { update({ brand }); setBrandOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${filters.brand === brand ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} className="text-brand-600" />
                创建日期
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input text-xs"
                value={filters.dateStart}
                max={filters.dateEnd || dayjs().format('YYYY-MM-DD')}
                onChange={(e) => update({ dateStart: e.target.value })}
              />
              <span className="text-slate-400 text-sm shrink-0">~</span>
              <input
                type="date"
                className="input text-xs"
                value={filters.dateEnd}
                min={filters.dateStart}
                max={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => update({ dateEnd: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
