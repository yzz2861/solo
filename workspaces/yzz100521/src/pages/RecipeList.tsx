import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, IceCream } from 'lucide-react';
import { useRecipeStore } from '../store/useRecipeStore';
import RecipeCard from '../components/ui/RecipeCard';

const RecipeList: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, loadRecipes, loadRecipe, deleteRecipe } = useRecipeStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (recipeId: string) => {
    loadRecipe(recipeId);
    navigate('/');
  };

  const handleDelete = (recipeId: string) => {
    if (window.confirm('确定要删除这个配方吗？所有版本和反馈数据也会被删除。')) {
      deleteRecipe(recipeId);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-cream-200">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-cream-100 transition-colors text-chocolate-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-chocolate-900 font-display">
                  配方库
                </h1>
                <p className="text-sm text-chocolate-500">共 {recipes.length} 个配方</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              新建配方
            </button>
          </div>
        </div>
      </header>

      <main className="container mt-8">
        {recipes.length > 0 && (
          <div className="mb-8 animate-fade-in-up opacity-0">
            <div className="relative max-w-md">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-chocolate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索配方..."
                className="input-field pl-12"
              />
            </div>
          </div>
        )}

        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe, index) => (
              <div key={recipe.id} className="animate-stagger-1" style={{ animationDelay: `${index * 0.1}s` }}>
                <RecipeCard
                  recipe={recipe}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-cream-100 flex items-center justify-center">
              <IceCream size={48} className="text-icecream-pink" />
            </div>
            <h3 className="text-xl font-bold text-chocolate-700 mb-2 font-display">
              {searchQuery ? '没有找到匹配的配方' : '还没有保存的配方'}
            </h3>
            <p className="text-chocolate-500 mb-6 max-w-md">
              {searchQuery
                ? '试试其他关键词，或者'
                : '开始创建你的第一个冰淇淋配方，记录研发过程和试吃反馈'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary mb-3"
              >
                清除搜索
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              开始创建
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeList;
