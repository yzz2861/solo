import type { MaterialItem, QARecord } from '@/types';
import { INITIAL_MATERIALS } from '@/data/mockData';
import { getStorage, setStorage, generateId } from '@/utils/storage';

export const MaterialService = {
  async list(type?: MaterialItem['sourceType']): Promise<MaterialItem[]> {
    const userMaterials = getStorage<MaterialItem[]>('experience_materials', []);
    const all = [...INITIAL_MATERIALS, ...userMaterials];
    if (type) {
      return all.filter((m) => m.sourceType === type);
    }
    return all;
  },

  async search(keyword: string, filters?: Partial<QARecord['filters']>): Promise<MaterialItem[]> {
    const userMaterials = getStorage<MaterialItem[]>('experience_materials', []);
    const allMaterials = [...INITIAL_MATERIALS, ...userMaterials];
    const trimmed = keyword.trim().toLowerCase();
    let results = allMaterials.filter((m) => {
      if (!trimmed) return true;
      const searchText = [
        m.title,
        m.content,
        ...m.keywords,
        m.sourceName,
        ...m.applicableCrops,
        ...(m.applicableVarieties || []),
        ...m.applicableRegions,
        ...m.applicableSeasons,
      ].join(' ').toLowerCase();
      return searchText.includes(trimmed);
    });
    if (filters) {
      results = results.filter((m) => {
        if (filters.crop && !m.applicableCrops.some((c) => c === filters.crop || c.includes(filters.crop!) || filters.crop!.includes(c))) {
          return false;
        }
        if (filters.variety) {
          const varieties = m.applicableVarieties || [];
          if (!varieties.some((v) => v === filters.variety || v.includes(filters.variety!) || filters.variety!.includes(v))) {
            return false;
          }
        }
        if (filters.region && !m.applicableRegions.some((r) => r === filters.region || r.includes(filters.region!) || filters.region!.includes(r))) {
          return false;
        }
        if (filters.season && !m.applicableSeasons.some((s) => s === filters.season || s.includes(filters.season!) || filters.season!.includes(s))) {
          return false;
        }
        return true;
      });
    }
    return results;
  },

  async update(id: string, data: Partial<MaterialItem>): Promise<void> {
    const userMaterials = getStorage<MaterialItem[]>('experience_materials', []);
    const index = userMaterials.findIndex((m) => m.id === id);
    if (index !== -1) {
      userMaterials[index] = {
        ...userMaterials[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      setStorage('experience_materials', userMaterials);
    }
  },

  async delete(id: string): Promise<void> {
    const userMaterials = getStorage<MaterialItem[]>('experience_materials', []);
    const filtered = userMaterials.filter((m) => m.id !== id);
    setStorage('experience_materials', filtered);
  },
};
