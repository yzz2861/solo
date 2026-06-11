import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { HazardRegister } from '@/pages/HazardRegister';
import { HazardList } from '@/pages/HazardList';
import { HazardDetail } from '@/pages/HazardDetail';
import { Statistics } from '@/pages/Statistics';
import { SafetyMeeting } from '@/pages/SafetyMeeting';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<HazardRegister />} />
          <Route path="/hazards" element={<HazardList />} />
          <Route path="/hazards/:id" element={<HazardDetail />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/meeting" element={<SafetyMeeting />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
