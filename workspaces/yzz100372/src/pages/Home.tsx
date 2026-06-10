import Header from '@/components/layout/Header';
import FilterBar from '@/components/filters/FilterBar';
import RecordList from '@/components/records/RecordList';
import RecordForm from '@/components/records/RecordForm';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-cream-100 bg-paper-texture">
      <Header />
      
      <main className="container py-6">
        <div className="space-y-6">
          <FilterBar />
          <RecordList />
        </div>
      </main>

      <RecordForm />

      <footer className="py-6 text-center text-xs text-coffee-400 print:hidden">
        <p>咖啡豆杯测记录系统 · 所有数据保存在本地浏览器中</p>
      </footer>
    </div>
  );
};

export default Home;
