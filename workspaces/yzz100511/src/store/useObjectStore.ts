import { create } from 'zustand';
import type { ExhibitionObject, ObjectType, DragState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { defaultObjects, objectDefaults, getObjectName } from '../utils/mockData';
import { snapToGrid, clampToBounds } from '../utils/geometry';

interface ObjectState {
  objects: ExhibitionObject[];
  selectedId: string | null;
  dragState: DragState;
  addObject: (type: ObjectType, position: [number, number, number]) => void;
  updateObject: (id: string, updates: Partial<ExhibitionObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  clearAll: () => void;
  startDrag: (id: string, startPosition: [number, number, number]) => void;
  updateDragPosition: (id: string, newPosition: [number, number, number]) => void;
  endDrag: () => void;
}

const STORAGE_KEY = 'mall_atrium_objects';

const loadFromStorage = (): ExhibitionObject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load objects from storage:', e);
  }
  return defaultObjects;
};

const saveToStorage = (objects: ExhibitionObject[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
  } catch (e) {
    console.error('Failed to save objects to storage:', e);
  }
};

export const useObjectStore = create<ObjectState>((set, get) => {
  const initialObjects = loadFromStorage();
  
  return {
    objects: initialObjects,
    selectedId: null,
    dragState: {
      isDragging: false,
      objectId: null,
      startPosition: null,
    },
    addObject: (type, position) => {
      const defaults = objectDefaults[type] || {};
      const count = get().objects.filter((o) => o.type === type).length + 1;
      const newObject: ExhibitionObject = {
        id: uuidv4(),
        type,
        name: `${getObjectName(type)}${count}`,
        position: [
          snapToGrid(position[0]),
          position[1],
          snapToGrid(position[2]),
        ],
        dimensions: { width: 4, depth: 3, height: 1.2, ...defaults.dimensions },
        weight: defaults.weight || 0,
        weightUnit: (defaults.weightUnit as 'kg' | 'ton') || 'kg',
        area: defaults.area || 0,
        areaUnit: (defaults.areaUnit as 'm2' | 'ft2') || 'm2',
        hasPower: defaults.hasPower || false,
        notes: '',
      };
      set((state) => {
        const newObjects = [...state.objects, newObject];
        saveToStorage(newObjects);
        return { objects: newObjects, selectedId: newObject.id };
      });
    },
    updateObject: (id, updates) =>
      set((state) => {
        const newObjects = state.objects.map((obj) =>
          obj.id === id ? { ...obj, ...updates } : obj
        );
        saveToStorage(newObjects);
        return { objects: newObjects };
      }),
    removeObject: (id) =>
      set((state) => {
        const newObjects = state.objects.filter((obj) => obj.id !== id);
        saveToStorage(newObjects);
        return {
          objects: newObjects,
          selectedId: state.selectedId === id ? null : state.selectedId,
        };
      }),
    selectObject: (id) => set({ selectedId: id }),
    clearAll: () => {
      saveToStorage([]);
      set({ objects: [], selectedId: null });
    },
    startDrag: (id, startPosition) =>
      set({
        dragState: {
          isDragging: true,
          objectId: id,
          startPosition,
        },
      }),
    updateDragPosition: (id, newPosition) => {
      const state = get();
      const obj = state.objects.find((o) => o.id === id);
      if (!obj) return;
      
      const config = JSON.parse(localStorage.getItem('mall_atrium_mall_config') || '{}');
      const bounds = config.atriumDimensions || { width: 30, depth: 30, height: 15 };
      
      const clamped = clampToBounds(
        [
          snapToGrid(newPosition[0]),
          newPosition[1],
          snapToGrid(newPosition[2]),
        ],
        obj.dimensions,
        bounds
      );
      
      set((state) => ({
        objects: state.objects.map((o) =>
          o.id === id ? { ...o, position: clamped } : o
        ),
      }));
    },
    endDrag: () => {
      const state = get();
      saveToStorage(state.objects);
      set({
        dragState: {
          isDragging: false,
          objectId: null,
          startPosition: null,
        },
      });
    },
  };
});
