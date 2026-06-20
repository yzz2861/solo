import React, { useMemo } from 'react';
import { useQAStore } from '@/stores/useQAStore';
import { CROP_LIBRARY, REGION_LIBRARY } from '@/data/mockData';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

interface FilterPanelProps {
  className?: string;
}

export default function FilterPanel({ className }: FilterPanelProps) {
  const { filters, setFilters } = useQAStore();

  const provinces = useMemo(() => {
    const set = new Set(REGION_LIBRARY.map((r) => r.province));
    return Array.from(set);
  }, []);

  const selectedProvince = useMemo(() => {
    if (!filters.region) return undefined;
    const match = REGION_LIBRARY.find((r) => filters.region!.includes(r.province));
    return match?.province;
  }, [filters.region]);

  const counties = useMemo(() => {
    if (!selectedProvince) return [];
    const set = new Set<string>();
    REGION_LIBRARY.filter((r) => r.province === selectedProvince).forEach((r) =>
      r.counties.forEach((c) => set.add(c))
    );
    return Array.from(set);
  }, [selectedProvince]);

  const selectedCounty = useMemo(() => {
    if (!filters.region) return undefined;
    for (const r of REGION_LIBRARY) {
      for (const c of r.counties) {
        if (filters.region!.endsWith(c)) return c;
      }
    }
    return undefined;
  }, [filters.region]);

  const varieties = useMemo(() => {
    if (!filters.crop) return [];
    const crop = CROP_LIBRARY.find((c) => c.name === filters.crop);
    return crop?.varieties ?? [];
  }, [filters.crop]);

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    setFilters({ crop: value, variety: undefined });
  };

  const handleVarietyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    setFilters({ variety: value });
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    setFilters({ region: value });
  };

  const handleCountyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const county = e.target.value;
    if (!county || !selectedProvince) {
      setFilters({ region: selectedProvince });
      return;
    }
    const regionItem = REGION_LIBRARY.find(
      (r) => r.province === selectedProvince && r.counties.includes(county)
    );
    if (regionItem) {
      setFilters({ region: `${regionItem.province}${regionItem.city}${county}` });
    }
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ season: Number(e.target.value) });
  };

  const handleClear = () => {
    setFilters({
      crop: undefined,
      variety: undefined,
      region: undefined,
      season: new Date().getMonth() + 1,
    });
  };

  return (
    <div className={cn('card p-5', className)}>
      <h3 className="font-serif font-bold text-lg text-leaf-800 mb-4">筛选条件</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-leaf-600 mb-1.5">作物</label>
          <select
            className="select"
            value={filters.crop ?? ''}
            onChange={handleCropChange}
          >
            <option value="">全部作物</option>
            {CROP_LIBRARY.map((crop) => (
              <option key={crop.name} value={crop.name}>
                {crop.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-leaf-600 mb-1.5">品种</label>
          <select
            className="select"
            value={filters.variety ?? ''}
            onChange={handleVarietyChange}
            disabled={!filters.crop}
          >
            <option value="">全部品种</option>
            {varieties.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-leaf-600 mb-1.5">省份</label>
          <select
            className="select mb-2"
            value={selectedProvince ?? ''}
            onChange={handleProvinceChange}
          >
            <option value="">全部省份</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={selectedCounty ?? ''}
            onChange={handleCountyChange}
            disabled={!selectedProvince}
          >
            <option value="">全部区县</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center justify-between text-sm text-leaf-600 mb-2">
            <span>季节 / 月份</span>
            <span className="font-medium text-leaf-700">
              {MONTH_NAMES[(filters.season ?? 1) - 1]}
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={filters.season ?? new Date().getMonth() + 1}
            onChange={handleSeasonChange}
            className="w-full accent-leaf-500"
          />
          <div className="flex justify-between text-xs text-leaf-400 mt-1">
            <span>1月</span>
            <span>6月</span>
            <span>12月</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-secondary w-full text-sm mt-5"
        onClick={handleClear}
      >
        清空条件
      </button>
    </div>
  );
}
