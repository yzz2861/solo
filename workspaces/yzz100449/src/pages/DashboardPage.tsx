import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import StatsCards from '../components/dashboard/StatsCards';
import ExportZone from '../components/dashboard/ExportZone';
import ShelfReviewList from '../components/dashboard/ShelfReviewList';

export default function DashboardPage() {
  const { currentUser } = useAuthStore();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'manager') return <Navigate to="/register" replace />;

  return (
    <div className="space-y-6">
      <StatsCards />
      <ExportZone />
      <ShelfReviewList />
    </div>
  );
}
