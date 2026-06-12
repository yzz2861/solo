import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spin } from 'antd';
import Login from './pages/Login';
import Layout from './components/Layout';
import ClaimsList from './pages/ClaimsList';
import ClaimDetail from './pages/ClaimDetail';
import UploadDocuments from './pages/UploadDocuments';
import SummaryDetail from './pages/SummaryDetail';
import RevisionList from './pages/RevisionList';
import RevisionDetail from './pages/RevisionDetail';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={
          <ProtectedRoute roles={['supervisor']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="claims" element={
          <ProtectedRoute roles={['adjuster', 'supervisor']}>
            <ClaimsList />
          </ProtectedRoute>
        } />
        <Route path="claims/:id" element={
          <ProtectedRoute roles={['adjuster', 'supervisor']}>
            <ClaimDetail />
          </ProtectedRoute>
        } />
        <Route path="claims/:id/upload" element={
          <ProtectedRoute roles={['adjuster', 'supervisor']}>
            <UploadDocuments />
          </ProtectedRoute>
        } />
        <Route path="summaries/:id" element={
          <ProtectedRoute roles={['adjuster', 'supervisor']}>
            <SummaryDetail />
          </ProtectedRoute>
        } />
        <Route path="revisions" element={
          <ProtectedRoute roles={['supervisor']}>
            <RevisionList />
          </ProtectedRoute>
        } />
        <Route path="revisions/:id" element={
          <ProtectedRoute roles={['supervisor']}>
            <RevisionDetail />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
