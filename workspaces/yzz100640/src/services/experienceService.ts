import type { MaterialItem } from '@/types';
import { getStorage, setStorage, generateId } from '@/utils/storage';

export const ExperienceService = {
  async list(status?: 'pending' | 'approved'): Promise<MaterialItem[]> {
    const materials = getStorage<MaterialItem[]>('experience_materials', []);
    if (status) {
      return materials.filter((m) => m.status === status);
    }
    return materials;
  },

  async create(data: Omit<MaterialItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaterialItem> {
    const now = new Date().toISOString();
    const newItem: MaterialItem = {
      ...data,
      id: generateId('EXP'),
      status: data.status || 'pending',
      createdAt: now,
      updatedAt: now,
    };
    const materials = getStorage<MaterialItem[]>('experience_materials', []);
    materials.unshift(newItem);
    setStorage('experience_materials', materials);
    return newItem;
  },

  async approve(id: string): Promise<void> {
    const materials = getStorage<MaterialItem[]>('experience_materials', []);
    const index = materials.findIndex((m) => m.id === id);
    if (index !== -1) {
      materials[index].status = 'approved';
      materials[index].updatedAt = new Date().toISOString();
      setStorage('experience_materials', materials);
    }
  },

  async update(id: string, data: Partial<MaterialItem>): Promise<void> {
    const materials = getStorage<MaterialItem[]>('experience_materials', []);
    const index = materials.findIndex((m) => m.id === id);
    if (index !== -1) {
      materials[index] = {
        ...materials[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      setStorage('experience_materials', materials);
    }
  },

  async delete(id: string): Promise<void> {
    const materials = getStorage<MaterialItem[]>('experience_materials', []);
    const filtered = materials.filter((m) => m.id !== id);
    setStorage('experience_materials', filtered);
  },
};
