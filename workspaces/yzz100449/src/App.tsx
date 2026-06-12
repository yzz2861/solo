import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import { useAuthStore } from './store/useAuthStore';

function IndexRedirect() {
  const user = useAuthStore((s) => s.currentUser);
  return <Navigate to={user ? '/register' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/:id" element={<RegisterPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<IndexRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
