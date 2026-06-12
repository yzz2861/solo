import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudioPage } from '@/pages/StudioPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudioPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
