import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Home, User, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export default function Header({ title, showBack = true }: HeaderProps) {
  const navigate = useNavigate();
  const { staffId } = useParams();
  const location = useLocation();
  const { currentStaff, isManagerMode, exitManagerMode } = useAppStore();

  const handleBack = () => {
    if (isManagerMode) {
      if (location.pathname === '/manager/dashboard') {
        navigate('/');
      } else {
        navigate('/manager/dashboard');
      }
    } else if (staffId) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    exitManagerMode();
    navigate('/');
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-primary-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-primary-50 rounded-full transition-colors"
            >
              <Home className="w-5 h-5 text-primary-500" />
            </button>
          )}
          <h1 className="text-xl font-bold text-caramel-700">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {currentStaff && !isManagerMode && (
            <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full">
              <span className="text-xl">{currentStaff.avatar}</span>
              <span className="text-sm font-medium text-primary-700">
                {currentStaff.name}
              </span>
            </div>
          )}
          {isManagerMode && (
            <>
              <button
                onClick={() => navigate('/manager/dashboard')}
                className="p-2 hover:bg-caramel-50 rounded-full transition-colors"
              >
                <BarChart3 className="w-5 h-5 text-caramel-500" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-full transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-500" />
              </button>
            </>
          )}
          {staffId && !isManagerMode && (
            <button
              onClick={() => navigate(`/records/${staffId}`)}
              className="p-2 hover:bg-matcha-50 rounded-full transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-matcha-500" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
