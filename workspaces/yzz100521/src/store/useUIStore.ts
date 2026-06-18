import { create } from 'zustand';

interface UIState {
  expandedSections: Record<string, boolean>;
  showSaveModal: boolean;
  showFeedbackModal: boolean;
  currentVersionForFeedback: string | null;
  toggleSection: (sectionId: string) => void;
  setShowSaveModal: (show: boolean) => void;
  setShowFeedbackModal: (show: boolean, versionId?: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  expandedSections: {
    'ingredients-milk': true,
    'ingredients-cream': true,
    'ingredients-sugar': true,
    'ingredients-fruit': true,
    'ingredients-alcohol': true,
    'ingredients-stabilizer': true,
    'calculation-steps': false,
    'kitchen-instructions': true,
  },
  showSaveModal: false,
  showFeedbackModal: false,
  currentVersionForFeedback: null,

  toggleSection: (sectionId) => {
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [sectionId]: !state.expandedSections[sectionId],
      },
    }));
  },

  setShowSaveModal: (show) => {
    set({ showSaveModal: show });
  },

  setShowFeedbackModal: (show, versionId) => {
    set({ 
      showFeedbackModal: show,
      currentVersionForFeedback: versionId || get().currentVersionForFeedback,
    });
  },
}));
