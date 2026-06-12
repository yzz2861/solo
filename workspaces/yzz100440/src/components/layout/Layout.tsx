import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Upload, 
  LogOut, 
  Building2,
  Home
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  requiredRole?: 'nurse' | 'family';
}

export function Layout({ children, requiredRole }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { loadMockData } = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'nurse') {
      return <Navigate to="/nurse/dashboard" replace />;
    } else {
      return <Navigate to="/family/dashboard" replace />;
    }
  }

  const isNurse = user?.role === 'nurse';

  const navItems = isNurse
    ? [
        { path: '/nurse/dashboard', label: '数据概览', icon: LayoutDashboard },
        { path: '/nurse/floor', label: '楼层分析', icon: Building2 },
        { path: '/import', label: '数据导入', icon: Upload },
      ]
    : [
        { path: '/family/dashboard', label: '服药概览', icon: Home },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">药盒管理</h1>
              <p className="text-xs text-gray-500">
                {isNurse ? '护士长系统' : '家属端'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {isNurse ? '护士长' : '家属'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
