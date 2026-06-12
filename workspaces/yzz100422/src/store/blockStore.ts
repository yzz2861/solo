import { create } from 'zustand';
import type { Block, Obstacle, ObstacleType, UrgencyLevel, ContactDepartment } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { getInitialBlocks } from '../data/mockBlocks';
import { generateId } from '../utils/score';

interface BlockState {
  blocks: Block[];
  currentBlock: Block | null;
  loading: boolean;

  loadBlocks: () => void;
  saveBlocks: () => void;
  getBlock: (id: string) => Block | undefined;
  setCurrentBlock: (id: string | null) => void;
  addBlock: (block: Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'obstacles'>) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  addObstacle: (blockId: string, obstacle: Omit<Obstacle, 'id' | 'blockId'>) => string;
  updateObstacle: (blockId: string, obstacleId: string, updates: Partial<Obstacle>) => void;
  deleteObstacle: (blockId: string, obstacleId: string) => void;
  resetToDefault: () => void;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  currentBlock: null,
  loading: true,

  loadBlocks: () => {
    const stored = storage.get<Block[]>(STORAGE_KEYS.BLOCKS, []);
    if (stored.length > 0) {
      set({ blocks: stored, loading: false });
    } else {
      const initial = getInitialBlocks();
      set({ blocks: initial, loading: false });
      storage.set(STORAGE_KEYS.BLOCKS, initial);
    }
  },

  saveBlocks: () => {
    const { blocks } = get();
    storage.set(STORAGE_KEYS.BLOCKS, blocks);
  },

  getBlock: (id: string) => {
    return get().blocks.find((b) => b.id === id);
  },

  setCurrentBlock: (id: string | null) => {
    if (id === null) {
      set({ currentBlock: null });
      return;
    }
    const block = get().blocks.find((b) => b.id === id);
    set({ currentBlock: block || null });
  },

  addBlock: (blockData) => {
    const newBlock: Block = {
      ...blockData,
      id: generateId(),
      obstacles: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({ blocks: [...state.blocks, newBlock] }));
    get().saveBlocks();
    return newBlock.id;
  },

  updateBlock: (id, updates) => {
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
      ),
    }));
    get().saveBlocks();
  },

  deleteBlock: (id) => {
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
      currentBlock: state.currentBlock?.id === id ? null : state.currentBlock,
    }));
    get().saveBlocks();
  },

  addObstacle: (blockId, obstacleData) => {
    const newObstacle: Obstacle = {
      ...obstacleData,
      id: generateId(),
      blockId,
    };
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === blockId
          ? { ...b, obstacles: [...b.obstacles, newObstacle], updatedAt: Date.now() }
          : b
      ),
    }));
    get().saveBlocks();
    return newObstacle.id;
  },

  updateObstacle: (blockId, obstacleId, updates) => {
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              obstacles: b.obstacles.map((o) =>
                o.id === obstacleId ? { ...o, ...updates } : o
              ),
              updatedAt: Date.now(),
            }
          : b
      ),
    }));
    get().saveBlocks();
  },

  deleteObstacle: (blockId, obstacleId) => {
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              obstacles: b.obstacles.filter((o) => o.id !== obstacleId),
              updatedAt: Date.now(),
            }
          : b
      ),
    }));
    get().saveBlocks();
  },

  resetToDefault: () => {
    const initial = getInitialBlocks();
    set({ blocks: initial });
    storage.set(STORAGE_KEYS.BLOCKS, initial);
  },
}));
