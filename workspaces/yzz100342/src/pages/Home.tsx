import { useEffect } from 'react';
import Header from '@/components/Header';
import RuleEditor from '@/components/RuleEditor';
import CartSimulator from '@/components/CartSimulator';
import TrialResult from '@/components/TrialResult';
import { initializeStore } from '@/store/useSolutionStore';

export default function Home() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 h-[calc(100vh-140px)] min-h-[600px]">
          <div className="xl:col-span-1">
            <RuleEditor />
          </div>
          <div className="xl:col-span-1">
            <CartSimulator />
          </div>
          <div className="xl:col-span-1">
            <TrialResult />
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-gray-400">
        数据仅保存在本地浏览器 · 开播前记得导出清单给客服和仓库
      </footer>
    </div>
  );
}
