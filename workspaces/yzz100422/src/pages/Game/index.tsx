import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTimer } from '../../hooks/useTimer';
import { useBlockStore } from '../../store/blockStore';
import { useStatsStore } from '../../store/statsStore';
import { generateId, calculateTimeBonus, calculateMissedPenalty, calculateFalsePositivePenalty } from '../../utils/score';
import type { Obstacle, UserAnswer, GameSession, ClickRecord } from '../../types';
import MapCanvas from '../../components/Map/MapCanvas';
import GameHeader from '../../components/Game/GameHeader';
import JudgmentPanel from '../../components/Game/JudgmentPanel';
import { Play, Pause } from 'lucide-react';

export default function GamePage() {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const { blocks, getBlock } = useBlockStore();
  const { addSession } = useStatsStore();

  const block = blockId ? getBlock(blockId) : undefined;

  const [foundObstacles, setFoundObstacles] = useState<Map<string, ClickRecord>>(new Map());
  const [falsePositiveClicks, setFalsePositiveClicks] = useState<ClickRecord[]>([]);
  const [selectedObstacle, setSelectedObstacle] = useState<Obstacle | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; score: number } | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionId] = useState(() => generateId());

  const foundRef = useRef(foundObstacles);
  const fpRef = useRef(falsePositiveClicks);
  const scoreRef = useRef(currentScore);
  const blockRef = useRef(block);
  const timeRemainingRef = useRef(0);
  const pauseRef = useRef<() => void>(() => {});

  useEffect(() => {
    foundRef.current = foundObstacles;
    fpRef.current = falsePositiveClicks;
    scoreRef.current = currentScore;
    blockRef.current = block;
  }, [foundObstacles, falsePositiveClicks, currentScore, block]);

  const realObstacleCount = block?.obstacles.filter((o) => !o.isFalsePositive).length || 0;

  const { timeRemaining, isPaused, pause, resume, reset } = useTimer({
    initialTime: block?.timeLimit || 180,
    autoStart: false,
    onComplete: () => endGame(),
  });

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
    pauseRef.current = pause;
  }, [timeRemaining, pause]);

  const endGame = useCallback(() => {
    const currentBlock = blockRef.current;
    if (!currentBlock || !gameStarted) return;

    const realCount = currentBlock.obstacles.filter((o) => !o.isFalsePositive).length;
    const foundCount = foundRef.current.size;
    const fpCount = fpRef.current.length;
    const missedCount = Math.max(0, realCount - foundCount);

    const missedPenalty = calculateMissedPenalty(missedCount);
    const fpPenalty = calculateFalsePositivePenalty(fpCount);
    const timeBonus = calculateTimeBonus(timeRemainingRef.current, currentBlock.timeLimit);
    const finalScore = Math.max(0, scoreRef.current + missedPenalty + fpPenalty + timeBonus);

    const allRecords = [...foundRef.current.values(), ...fpRef.current];

    const session: GameSession = {
      id: sessionId,
      blockId: currentBlock.id,
      startTime: Date.now() - (currentBlock.timeLimit - timeRemainingRef.current) * 1000,
      endTime: Date.now(),
      score: finalScore,
      correctCount: foundCount,
      missedCount,
      falsePositiveCount: fpCount,
      clickRecords: allRecords,
      totalObstacles: realCount,
      accuracy: realCount > 0
        ? Math.max(0, foundCount - fpCount) / realCount
        : 0,
    };

    addSession(session, realCount, realCount);

    pauseRef.current();
    navigate(`/result/${sessionId}`);
  }, [sessionId, addSession, gameStarted, navigate]);

  useEffect(() => {
    if (gameStarted) {
      const allFound = foundObstacles.size >= realObstacleCount;
      if (allFound && realObstacleCount > 0) {
        setTimeout(() => endGame(), 500);
      }
    }
  }, [foundObstacles, realObstacleCount, gameStarted, endGame]);

  const startGame = () => {
    setFoundObstacles(new Map());
    setFalsePositiveClicks([]);
    setCurrentScore(0);
    setHintsUsed(0);
    setGameStarted(true);
    reset(block?.timeLimit || 180);
    setTimeout(() => resume(), 100);
  };

  const handleObstacleClick = (obstacle: Obstacle) => {
    if (!gameStarted || isPaused) return;

    if (foundObstacles.has(obstacle.id)) {
      return;
    }

    setSelectedObstacle(obstacle);
    setShowPanel(true);
    setShowResult(false);
    setLastResult(null);
  };

  const handleMapClick = (x: number, y: number) => {
    if (!gameStarted || isPaused || !block) return;

    const clickedOnObstacle = block.obstacles.some((obs) => {
      const dist = Math.sqrt((obs.x - x) ** 2 + (obs.y - y) ** 2);
      return dist < 25;
    });

    if (!clickedOnObstacle) {
      const record: ClickRecord = {
        id: generateId(),
        sessionId,
        obstacleId: null,
        clickX: x,
        clickY: y,
        isCorrect: false,
        userAnswer: { canBypass: null, urgency: null, contactDept: null },
        timestamp: Date.now(),
        scoreChange: -15,
      };
      setFalsePositiveClicks((prev) => [...prev, record]);
      setCurrentScore((prev) => Math.max(0, prev - 15));
    }
  };

  const handleSubmitAnswer = (answer: UserAnswer) => {
    if (!selectedObstacle) return;

    const obstacle = selectedObstacle;
    const isFalsePositive = obstacle.isFalsePositive;

    let isCorrect = false;
    let scoreChange = 0;

    if (isFalsePositive) {
      isCorrect = answer.canBypass === null && answer.urgency === null && answer.contactDept === null;
      scoreChange = isCorrect ? 50 : -20;

      const record: ClickRecord = {
        id: generateId(),
        sessionId,
        obstacleId: obstacle.id,
        clickX: obstacle.x,
        clickY: obstacle.y,
        isCorrect,
        userAnswer: answer,
        correctAnswer: {
          canBypass: obstacle.canBypass,
          urgency: obstacle.urgency,
          contactDept: obstacle.contactDept,
        },
        timestamp: Date.now(),
        scoreChange,
        obstacleType: obstacle.type,
      };

      setFalsePositiveClicks((prev) => [...prev, record]);
    } else {
      const canBypassCorrect = answer.canBypass === obstacle.canBypass;
      const urgencyCorrect = answer.urgency === obstacle.urgency;
      const contactDeptCorrect = answer.contactDept === obstacle.contactDept;

      const correctFields = [canBypassCorrect, urgencyCorrect, contactDeptCorrect].filter(Boolean).length;
      isCorrect = correctFields >= 2;

      if (correctFields === 3) scoreChange = 100;
      else if (correctFields === 2) scoreChange = 60;
      else if (correctFields === 1) scoreChange = 20;
      else scoreChange = 0;

      if (obstacle.specialCase && correctFields >= 2) {
        scoreChange += 30;
      }

      const record: ClickRecord = {
        id: generateId(),
        sessionId,
        obstacleId: obstacle.id,
        clickX: obstacle.x,
        clickY: obstacle.y,
        isCorrect,
        userAnswer: answer,
        correctAnswer: {
          canBypass: obstacle.canBypass,
          urgency: obstacle.urgency,
          contactDept: obstacle.contactDept,
        },
        timestamp: Date.now(),
        scoreChange,
        obstacleType: obstacle.type,
      };

      setFoundObstacles((prev) => new Map(prev).set(obstacle.id, record));
    }

    setCurrentScore((prev) => Math.max(0, prev + scoreChange));
    setShowResult(true);
    setLastResult({ isCorrect, score: scoreChange });
  };

  const handleClosePanel = () => {
    setShowPanel(false);
    setSelectedObstacle(null);
    setShowResult(false);
    setLastResult(null);
  };

  const handleHint = () => {
    if (hintsUsed >= 3 || !block) return;

    const unfound = block.obstacles.filter(
      (o) => !o.isFalsePositive && !foundObstacles.has(o.id)
    );

    if (unfound.length > 0) {
      const randomOne = unfound[Math.floor(Math.random() * unfound.length)];
      setSelectedObstacle(randomOne);
      setShowPanel(true);
      setHintsUsed((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (gameStarted) {
      if (confirm('确定要退出吗？当前进度将不会保存。')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  if (!block) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">街区不存在</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <button
            onClick={() => navigate('/')}
            className="text-secondary-600 hover:text-secondary-800 mb-8 inline-flex items-center gap-2"
          >
            ← 返回街区列表
          </button>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-primary-400 to-primary-500 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-3xl font-bold mb-2">{block.name}</h1>
                <p className="text-primary-100">{block.description}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-primary-600 mb-1">
                    {realObstacleCount}
                  </div>
                  <div className="text-sm text-gray-500">障碍数量</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-secondary-600 mb-1">
                    {Math.floor(block.timeLimit / 60)}分
                  </div>
                  <div className="text-sm text-gray-500">时间限制</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-amber-500 mb-1">
                    {'★'.repeat(block.difficulty)}
                  </div>
                  <div className="text-sm text-gray-500">难度等级</div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold text-gray-800 mb-3">游戏规则</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li>• 在地图上找出所有盲道上的障碍点</li>
                  <li>• 点击障碍后，判断：能否绕行、紧急程度、联系哪个部门</li>
                  <li>• 注意：有些物体在盲道旁边但不影响通行，不要误报</li>
                  <li>• 临时施工有警示标志的，不需要上报</li>
                  <li>• 每正确识别一个障碍最多得 100 分</li>
                  <li>• 漏掉障碍扣 30 分，误报扣 20 分</li>
                  <li>• 剩余时间可获得额外奖励分</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full btn btn-primary py-4 text-lg"
              >
                <Play size={24} />
                开始巡查
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <GameHeader
        blockName={block.name}
        timeRemaining={timeRemaining}
        timeLimit={block.timeLimit}
        foundCount={foundObstacles.size}
        totalCount={realObstacleCount}
        falsePositiveCount={falsePositiveClicks.length}
        score={currentScore}
        isPaused={isPaused}
        onBack={handleBack}
        onPause={pause}
        onResume={resume}
        onHint={handleHint}
        hintsUsed={hintsUsed}
        maxHints={3}
      />

      <div className="flex-1 p-4 relative overflow-hidden">
        <MapCanvas
          block={block}
          onObstacleClick={handleObstacleClick}
          onMapClick={handleMapClick}
          foundObstacles={foundObstacles}
          falsePositiveClicks={falsePositiveClicks}
          showAllObstacles={false}
          selectedObstacleId={selectedObstacle?.id || null}
          interactive={!isPaused}
        />

        {isPaused && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
            <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">游戏暂停</h2>
              <p className="text-gray-500 mb-6">点击继续按钮恢复游戏</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleBack} className="btn btn-ghost">
                  退出游戏
                </button>
                <button onClick={resume} className="btn btn-primary">
                  <Play size={18} />
                  继续游戏
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPanel && selectedObstacle && (
        <JudgmentPanel
          obstacle={selectedObstacle}
          onClose={handleClosePanel}
          onSubmit={handleSubmitAnswer}
          showResult={showResult}
          isCorrect={lastResult?.isCorrect}
          correctAnswer={showResult ? {
            canBypass: selectedObstacle.canBypass,
            urgency: selectedObstacle.urgency,
            contactDept: selectedObstacle.contactDept,
          } : undefined}
          scoreChange={lastResult?.score || 0}
        />
      )}

      <div className="fixed bottom-4 left-4 z-30">
        <button
          onClick={endGame}
          className="btn btn-secondary"
        >
          结束巡查
        </button>
      </div>
    </div>
  );
}
