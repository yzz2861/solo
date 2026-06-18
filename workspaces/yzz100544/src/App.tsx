import { Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import DataManager from '@/pages/DataManager';
import Clustering from '@/pages/Clustering';
import Checklist from '@/pages/Checklist';
import CourseTracker from '@/pages/CourseTracker';
import Settings from '@/pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/data" element={<DataManager />} />
      <Route path="/clustering" element={<Clustering />} />
      <Route path="/checklist" element={<Checklist />} />
      <Route path="/courses" element={<CourseTracker />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
