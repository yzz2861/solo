import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, ChefHat, Save, RotateCcw, BookOpen, MessageSquarePlus } from 'lucide-react';
import { useRecipeStore } from '../store/useRecipeStore';
import { useUIStore } from '../store/useUIStore';
import IngredientInputSection from '../components/calculator/IngredientInputSection';
import ResultDisplay from '../components/calculator/ResultDisplay';
import CalculationSteps from '../components/calculator/CalculationSteps';
import KitchenInstructions from '../components/calculator/KitchenInstructions';
import SaveRecipeModal from '../components/modals/SaveRecipeModal';
import FeedbackModal from '../components/modals/FeedbackModal';

const Calculator: React.FC = () => {
  const navigate = useNavigate();
  const { mode, setMode, currentResult, currentVersion, reset } = useRecipeStore();
  const { setShowSaveModal, setShowFeedbackModal } = useUIStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.animate-fade-in-up');
      cards.forEach((card, index) => {
        card.classList.add('opacity-100');
        (card as HTMLElement).style.animationDelay = `${index * 0.1}s`;
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentResult, mode]);

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-cream-200">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-icecream-pink to-icecream-pinkDark flex items-center justify-center shadow-lg">
                <span className="text-2xl">🍦</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-chocolate-900 font-display text-shadow-soft">
                  冰淇淋凝固点试算
                </h1>
                <p className="text-sm text-chocolate-500">专业研发助手</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-cream-100 rounded-full p-1">
                <button
                  onClick={() => setMode('research')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    mode === 'research'
                      ? 'bg-white text-chocolate-900 shadow-md'
                      : 'text-chocolate-500 hover:text-chocolate-700'
                  }`}
                >
                  <FlaskConical size={18} />
                  研发版
                </button>
                <button
                  onClick={() => setMode('kitchen')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    mode === 'kitchen'
                      ? 'bg-white text-chocolate-900 shadow-md'
                      : 'text-chocolate-500 hover:text-chocolate-700'
                  }`}
                >
                  <ChefHat size={18} />
                  后厨版
                </button>
              </div>

              <button
                onClick={() => navigate('/recipes')}
                className="btn-ghost flex items-center gap-2"
              >
                <BookOpen size={18} />
                配方库
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="card animate-fade-in-up opacity-0 animate-stagger-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-chocolate-700 font-display">
                  配料输入
                </h2>
                <button
                  onClick={reset}
                  className="btn-ghost flex items-center gap-1 text-sm"
                >
                  <RotateCcw size={16} />
                  重置
                </button>
              </div>
              <IngredientInputSection />
            </div>

            {currentResult && (
              <div className="flex gap-3 animate-fade-in-up opacity-0 animate-stagger-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  保存配方
                </button>
                {currentVersion && (
                  <button
                    onClick={() => setShowFeedbackModal(true, currentVersion.id)}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <MessageSquarePlus size={18} />
                    试吃反馈
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <ResultDisplay />
            
            {mode === 'research' && currentResult && (
              <>
                <CalculationSteps />
                <KitchenInstructions />
              </>
            )}

            {mode === 'kitchen' && currentResult && (
              <>
                <KitchenInstructions />
                <CalculationSteps />
              </>
            )}
          </div>
        </div>
      </main>

      <SaveRecipeModal />
      <FeedbackModal />
    </div>
  );
};

export default Calculator;
