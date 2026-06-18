import { useState, useEffect } from 'react';
import type { Level, StudentProgress, PackingChoice, PackingResult } from './types';
import { HomePage } from './components/HomePage';
import { LevelSelect } from './components/LevelSelect';
import { PackingPractice } from './components/PackingPractice';
import { MistakeReview } from './components/MistakeReview';
import { TeacherPanel } from './components/TeacherPanel';
import { ModePlay } from './components/ModePlay';
import { loadProgress, saveProgress, recordAttempt } from './utils/progressStorage';
import { loadLevels, saveLevels } from './utils/levelStorage';

type Page = 'home' | 'practice' | 'practice-level' | 'review' | 'confirm' | 'exam' | 'teacher';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  useEffect(() => {
    setLevels(loadLevels());
    setProgress(loadProgress());
  }, []);

  const handleSaveLevels = (newLevels: Level[]) => {
    setLevels(newLevels);
    saveLevels(newLevels);
  };

  const handleLevelComplete = (level: Level, result: PackingResult, choice: PackingChoice) => {
    if (!progress) return;
    const newProgress = recordAttempt(progress, level, result, choice);
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const handleStartPractice = () => {
    setCurrentPage('practice');
  };

  const handleSelectLevel = (level: Level) => {
    setSelectedLevel(level);
    setCurrentPage('practice-level');
  };

  const handleBackToPractice = () => {
    setSelectedLevel(null);
    setCurrentPage('practice');
  };

  if (!progress) {
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-text-muted">加载中...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            progress={progress}
            totalLevels={levels.length}
            onStartPractice={handleStartPractice}
            onReviewMistakes={() => setCurrentPage('review')}
            onConfirmMode={() => setCurrentPage('confirm')}
            onExamMode={() => setCurrentPage('exam')}
            onTeacherMode={() => setCurrentPage('teacher')}
          />
        );

      case 'practice':
        return (
          <LevelSelect
            levels={levels}
            progress={progress.levelProgress}
            onSelectLevel={handleSelectLevel}
            onBack={() => setCurrentPage('home')}
            title="常规练习"
          />
        );

      case 'practice-level':
        if (!selectedLevel) return null;
        return (
          <PackingPractice
            level={selectedLevel}
            onBack={handleBackToPractice}
            onComplete={(result, choice) => handleLevelComplete(selectedLevel, result, choice)}
            mode="practice"
          />
        );

      case 'review':
        return (
          <MistakeReview
            progress={progress}
            levels={levels}
            onBack={() => setCurrentPage('home')}
            onPracticeLevel={(level) => {
              setSelectedLevel(level);
              setCurrentPage('practice-level');
            }}
          />
        );

      case 'teacher':
        return (
          <TeacherPanel
            levels={levels}
            onSaveLevels={handleSaveLevels}
            onBack={() => setCurrentPage('home')}
          />
        );

      case 'confirm':
      case 'exam':
        return (
          <ModePlay
            levels={levels}
            mode={currentPage}
            onBack={() => setCurrentPage('home')}
            onComplete={handleLevelComplete}
          />
        );

      default:
        return null;
    }
  };

  return <div className="min-h-screen">{renderPage()}</div>;
}

export default App;
