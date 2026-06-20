import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import CreateCase from '@/pages/CreateCase';
import CaseList from '@/pages/CaseList';
import CaseDetail from '@/pages/CaseDetail';
import ReshootList from '@/pages/ReshootList';
import ReshootDetail from '@/pages/ReshootDetail';
import LeaderHome from '@/pages/LeaderHome';
import LowConfidenceCases from '@/pages/LowConfidenceCases';
import TrainingCenter from '@/pages/TrainingCenter';
import TrainingDetail from '@/pages/TrainingDetail';
import TrainingLibrary from '@/pages/TrainingLibrary';
import { useMemo } from 'react';

function RequireAuth({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'leader' ? '/leader' : '/'} replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Surveyor Routes */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <Home />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/create"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <CreateCase />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/cases"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <CaseList />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <CaseDetail />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/reshoot"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <ReshootList />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/reshoot/:id"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <ReshootDetail />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/training"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <TrainingCenter />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/training/:id"
          element={
            <RequireAuth>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <TrainingDetail />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />

        {/* Leader Routes */}
        <Route
          path="/leader"
          element={
            <RequireAuth allowedRoles={['leader']}>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <LeaderHome />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/leader/low-confidence"
          element={
            <RequireAuth allowedRoles={['leader']}>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <LowConfidenceCases />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/training/library"
          element={
            <RequireAuth allowedRoles={['leader']}>
              <Layout>
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <TrainingLibrary />
                </motion.div>
              </Layout>
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
