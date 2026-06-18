import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserInfo, Level, Choice, Answer, Step } from '@/types';

interface GameState {
  user: UserInfo | null;
  currentLevel: Level | null;
  currentStepIndex: number;
  answers: Answer[];
  isShowingFeedback: boolean;
  lastChoice: Choice | null;
  gameCompleted: boolean;
  setUser: (user: UserInfo) => void;
  clearUser: () => void;
  startLevel: (level: Level) => void;
  makeChoice: (choice: Choice, stepOrder: number) => void;
  nextStep: () => void;
  resetGame: () => void;
  getCurrentStep: () => Step | null;
}

const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      user: null,
      currentLevel: null,
      currentStepIndex: 0,
      answers: [],
      isShowingFeedback: false,
      lastChoice: null,
      gameCompleted: false,

      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),

      startLevel: (level) =>
        set({
          currentLevel: level,
          currentStepIndex: 0,
          answers: [],
          isShowingFeedback: false,
          lastChoice: null,
          gameCompleted: false,
        }),

      makeChoice: (choice, stepOrder) =>
        set((state) => {
          const { currentLevel, currentStepIndex } = state;
          const currentStep = currentLevel?.steps[currentStepIndex];
          return {
            isShowingFeedback: true,
            lastChoice: choice,
            answers: [
              ...state.answers,
              {
                stepOrder,
                choiceId: choice.id,
                choiceText: choice.text,
                isCorrect: choice.isCorrect,
                feedback: choice.feedback,
                correctAction: choice.correctAction,
                levelId: currentLevel?.id,
                levelTitle: currentLevel?.title,
                scene: currentStep?.scene,
                safetyCategory: currentStep?.safetyCategory,
              },
            ],
          };
        }),

      nextStep: () =>
        set((state) => {
          if (!state.currentLevel) return {};
          const nextIndex = state.currentStepIndex + 1;
          const isCompleted = nextIndex >= state.currentLevel.steps.length;
          return {
            currentStepIndex: nextIndex,
            isShowingFeedback: false,
            lastChoice: null,
            gameCompleted: isCompleted,
          };
        }),

      resetGame: () =>
        set({
          currentLevel: null,
          currentStepIndex: 0,
          answers: [],
          isShowingFeedback: false,
          lastChoice: null,
          gameCompleted: false,
        }),

      getCurrentStep: () => {
        const { currentLevel, currentStepIndex } = get();
        if (!currentLevel) return null;
        return currentLevel.steps[currentStepIndex] ?? null;
      },
    }),
    {
      name: 'lab-safety-game-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        currentLevel: state.currentLevel,
        currentStepIndex: state.currentStepIndex,
        answers: state.answers,
        gameCompleted: state.gameCompleted,
      }),
    },
  ),
);

export default useGameStore;
