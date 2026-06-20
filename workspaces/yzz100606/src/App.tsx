import { useState, useEffect } from 'react';
import { Leaf, RefreshCw, Info, Menu, X, Package } from 'lucide-react';
import { IngredientCard } from './components/IngredientCard';
import { FormulaPanel } from './components/FormulaPanel';
import { NutritionGauge } from './components/NutritionGauge';
import { PlanComparison } from './components/PlanComparison';
import { ReportPanel } from './components/ReportPanel';
import { ReplaceImpactModal } from './components/ReplaceImpactModal';
import { useCalculatorStore } from './store/useCalculatorStore';

type TabType = 'ingredients' | 'formula' | 'result' | 'comparison' | 'report';

function App() {
  const {
    ingredients,
    currentResult,
    showReplaceImpact,
    replacementImpact,
    setShowReplaceImpact,
    setReplacementImpact,
    resetToDefaults,
  } = useCalculatorStore();

  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (currentResult && activeTab === 'formula') {
      setActiveTab('result');
    }
  }, [currentResult]);

  const tabs = [
    { id: 'ingredients' as TabType, label: '原料管理', icon: '📦' },
    { id: 'formula' as TabType, label: '配方设置', icon: '⚙️' },
    { id: 'result' as TabType, label: '营养分析', icon: '📊', disabled: !currentResult },
    { id: 'comparison' as TabType, label: '方案对比', icon: '⚖️' },
    { id: 'report' as TabType, label: '报告输出', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-field via-cream to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-soil-brown/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-wheat-green to-green-600 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">饲料营养折算器</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  智能配料 · 消耗库存 · 营养达标
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-wheat-green text-white shadow-md'
                      : tab.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-wheat-green/10'
                  }`}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowInfo(!showInfo)}
                title="使用说明"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                className="btn btn-ghost btn-sm hidden sm:flex"
                onClick={resetToDefaults}
                title="重置数据"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重置</span>
              </button>
              <button
                className="md:hidden btn btn-ghost p-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-wheat-green text-white'
                      : tab.disabled
                      ? 'text-gray-400'
                      : 'text-gray-600 hover:bg-wheat-green/10'
                  }`}
                  onClick={() => {
                    if (!tab.disabled) {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }
                  }}
                  disabled={tab.disabled}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {showInfo && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-sm text-blue-800">
              <strong>💡 使用说明：</strong>
              1. 在「原料管理」中设置各原料的营养成分和库存数量；
              2. 在「配方设置」中调整各原料配比，设置出料量和日耗量，点击「开始计算」；
              3. 在「营养分析」中查看营养指标达标情况；
              4. 在「方案对比」中添加2-3套替代方案进行对比；
              5. 在「报告输出」中选择养殖户版或技术员版查看详细报告。
              数据会自动保存在本地浏览器中。
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {activeTab === 'ingredients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">原料管理</h2>
                  <p className="text-gray-500 mt-1">
                    设置各原料的营养成分、库存数量和价格
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  共 {ingredients.length} 种原料
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ingredients.map((ingredient) => (
                  <IngredientCard
                    key={ingredient.id}
                    ingredient={ingredient}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'formula' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">配方设置</h2>
                <p className="text-gray-500 mt-1">
                  调整原料配比，设置目标出料量，计算营养指标
                </p>
              </div>
              <FormulaPanel />
            </div>
          )}

          {activeTab === 'result' && currentResult && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">营养指标分析</h2>
                <p className="text-gray-500 mt-1">
                  查看配方的营养达标情况和缺口分析
                </p>
              </div>
              <NutritionGauge result={currentResult.nutrition} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Package className="w-5 h-5 text-soil-brown" />
                      库存检查
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {Object.entries(currentResult.inventory).map(
                        ([ingredientId, inv]) => {
                          const ingredient = ingredients.find(
                            (i) => i.id === ingredientId
                          );
                          if (!ingredient) return null;
                          return (
                            <div
                              key={ingredientId}
                              className={`p-3 rounded-lg border ${
                                inv.sufficient
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-red-200 bg-red-50 animate-pulse-soft'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{ingredient.emoji}</span>
                                  <span className="font-medium">{ingredient.name}</span>
                                </div>
                                <span
                                  className={`status-badge ${
                                    inv.sufficient ? 'pass' : 'fail'
                                  }`}
                                >
                                  {inv.sufficient ? '✓ 充足' : '❌ 不足'}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                需要 <span className="font-mono font-bold">{inv.required}</span> kg / 
                                库存 <span className="font-mono font-bold">{inv.available}</span> kg
                                {!inv.sufficient && (
                                  <span className="text-warning-red ml-2">
                                    缺 {inv.shortage} kg
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 progress-bar">
                                <div
                                  className={`progress-fill ${
                                    inv.sufficient ? 'pass' : 'fail'
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (inv.available / inv.required) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      💰 成本与可用性
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-center">
                        <div className="text-sm text-gray-600 mb-1">本次配料成本</div>
                        <div className="text-3xl font-bold text-amber-600 font-mono">
                          ¥{currentResult.totalCost}
                        </div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
                        <div className="text-sm text-gray-600 mb-1">每公斤成本</div>
                        <div className="text-3xl font-bold text-purple-600 font-mono">
                          ¥{currentResult.costPerKg}
                        </div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
                        <div className="text-sm text-gray-600 mb-1">库存可用天数</div>
                        <div className="text-3xl font-bold text-wheat-green font-mono">
                          {currentResult.availableDays}
                        </div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
                        <div className="text-sm text-gray-600 mb-1">综合评分</div>
                        <div className="text-3xl font-bold text-blue-600 font-mono">
                          {currentResult.score}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-field rounded-lg">
                      <div className="text-sm text-gray-600">
                        <strong>📊 评分说明：</strong>
                        综合评分 = 营养达标度(40%) + 库存消耗率(30%) + 成本优势(30%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">方案对比分析</h2>
                <p className="text-gray-500 mt-1">
                  添加2-3套替代方案，对比营养、库存和成本
                </p>
              </div>
              <PlanComparison />
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">评估报告</h2>
                <p className="text-gray-500 mt-1">
                  查看养殖户版或技术员版详细报告
                </p>
              </div>
              <ReportPanel />
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-soil-brown/10 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              🌾 饲料营养折算器 · 帮助养殖场科学配料 · 数据自动保存到本地
            </div>
            <div className="text-sm text-gray-400">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </footer>

      {showReplaceImpact && replacementImpact && (
        <ReplaceImpactModal
          impact={replacementImpact}
          onClose={() => {
            setShowReplaceImpact(false);
            setReplacementImpact(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
