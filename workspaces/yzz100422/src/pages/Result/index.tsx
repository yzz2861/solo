import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, XCircle, Clock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Info, MapPin } from 'lucide-react';
import { useStatsStore } from '../../store/statsStore';
import { useBlockStore } from '../../store/blockStore';
import { calculateGrade, formatTime } from '../../utils/score';
import { OBSTACLE_TYPE_LABELS, URGENCY_LABELS, DEPARTMENT_LABELS, SPECIAL_CASE_LABELS } from '../../types';
import type { Obstacle } from '../../types';
import MapCanvas from '../../components/Map/MapCanvas';

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions } = useStatsStore();
  const { getBlock } = useBlockStore();

  const [activeTab, setActiveTab] = useState<'missed' | 'falsePositive' | 'weakTypes'>('missed');
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const session = useMemo(() => {
    return sessions.find((s) => s.id === sessionId);
  }, [sessions, sessionId]);

  const block = useMemo(() => {
    if (!session) return undefined;
    return getBlock(session.blockId);
  }, [session, getBlock]);

  const grade = useMemo(() => {
    if (!session) return 'D';
    return calculateGrade(session.accuracy);
  }, [session]);

  const gradeColors: Record<string, string> = {
    S: 'text-yellow-500',
    A: 'text-green-500',
    B: 'text-blue-500',
    C: 'text-orange-500',
    D: 'text-red-500',
  };

  const missedObstacles = useMemo(() => {
    if (!session || !block) return [];
    return block.obstacles.filter(
      (o) => !o.isFalsePositive && !session.clickRecords.some((r) => r.obstacleId === o.id && r.isCorrect)
    );
  }, [session, block]);

  const falsePositiveRecords = useMemo(() => {
    if (!session) return [];
    return session.clickRecords.filter((r) => r.obstacleId === null || !r.isCorrect);
  }, [session]);

  const weakTypesData = useMemo(() => {
    if (!session || !block) return [];

    const typeStats: Record<string, { correct: number; total: number; obstacles: Obstacle[] }> = {};

    block.obstacles.forEach((obs) => {
      if (obs.isFalsePositive) return;
      if (!typeStats[obs.type]) {
        typeStats[obs.type] = { correct: 0, total: 0, obstacles: [] };
      }
      typeStats[obs.type].total += 1;
      typeStats[obs.type].obstacles.push(obs);
    });

    session.clickRecords.forEach((record) => {
      if (record.obstacleType && record.isCorrect && typeStats[record.obstacleType]) {
        typeStats[record.obstacleType].correct += 1;
      }
    });

    return Object.entries(typeStats)
      .filter(([, data]) => data.total > 0)
      .map(([type, data]) => ({
        type,
        correct: data.correct,
        total: data.total,
        errorRate: 1 - data.correct / data.total,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
  }, [session, block]);

  const duration = session ? Math.floor((session.endTime - session.startTime) / 1000) : 0;

  if (!session || !block) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到训练记录</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const selectedObstacle = block.obstacles.find((o) => o.id === selectedObstacleId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/50 to-white pb-12">
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft size={20} />
            返回首页
          </button>
          <h1 className="font-semibold text-gray-800">训练结果</h1>
          <button
            onClick={() => navigate(`/game/${block.id}`)}
            className="btn btn-primary text-sm py-1.5"
          >
            再来一次
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-primary-400 via-primary-500 to-secondary-500 p-8 text-white text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <Trophy size={28} />
              <span className="text-lg font-medium">训练完成</span>
            </div>
            <div className="text-6xl font-bold mb-2 score-pop count-up">
              {session.score}
            </div>
            <div className="text-primary-100">总得分</div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="text-primary-100">评级：</span>
              <span className={`text-4xl font-black ${gradeColors[grade]}`}>
                {grade}
              </span>
              <span className="text-primary-100">级</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">正确识别</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{session.correctCount}</div>
              <div className="text-xs text-green-500 mt-1">
                / {session.totalObstacles} 个障碍
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-red-500 mb-2">
                <XCircle size={20} />
                <span className="text-sm font-medium">漏掉障碍</span>
              </div>
              <div className="text-3xl font-bold text-red-500">{session.missedCount}</div>
              <div className="text-xs text-red-400 mt-1">扣 {session.missedCount * 30} 分</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-orange-500 mb-2">
                <AlertTriangle size={20} />
                <span className="text-sm font-medium">误报次数</span>
              </div>
              <div className="text-3xl font-bold text-orange-500">
                {session.falsePositiveCount}
              </div>
              <div className="text-xs text-orange-400 mt-1">
                扣 {session.falsePositiveCount * 20} 分
              </div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-blue-500 mb-2">
                <Clock size={20} />
                <span className="text-sm font-medium">用时</span>
              </div>
              <div className="text-3xl font-bold text-blue-500">{formatTime(duration)}</div>
              <div className="text-xs text-blue-400 mt-1">
                正确率 {Math.round(session.accuracy * 100)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => setActiveTab('missed')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'missed'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                漏掉的障碍 ({missedObstacles.length})
              </button>
              <button
                onClick={() => setActiveTab('falsePositive')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'falsePositive'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                误报点 ({falsePositiveRecords.length})
              </button>
              <button
                onClick={() => setActiveTab('weakTypes')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'weakTypes'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                薄弱类型
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'missed' && (
              <div>
                {missedObstacles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
                    <p>太棒了！你找到了所有障碍</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missedObstacles.map((obs) => (
                      <div
                        key={obs.id}
                        className="flex items-start gap-4 p-4 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100/80 transition-colors"
                        onClick={() => {
                          setSelectedObstacleId(obs.id);
                          setShowMap(true);
                        }}
                      >
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="text-red-500" size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 mb-1">
                            {OBSTACLE_TYPE_LABELS[obs.type as keyof typeof OBSTACLE_TYPE_LABELS] || obs.type}
                          </h4>
                          <p className="text-sm text-gray-600">{obs.explanation}</p>
                          {obs.specialCase && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Info size={12} />
                              {SPECIAL_CASE_LABELS[obs.specialCase]}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'falsePositive' && (
              <div>
                {falsePositiveRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
                    <p>非常棒！没有误报</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {falsePositiveRecords.map((record) => {
                      const obstacle = block.obstacles.find((o) => o.id === record.obstacleId);
                      return (
                        <div
                          key={record.id}
                          className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl"
                        >
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Target className="text-orange-500" size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 mb-1">
                              {obstacle
                                ? `${OBSTACLE_TYPE_LABELS[obstacle.type as keyof typeof OBSTACLE_TYPE_LABELS] || obstacle.type}（判定错误）`
                                : '空白区域误报'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {obstacle?.explanation || '此处没有障碍，不需要上报'}
                            </p>
                            {obstacle?.specialCase && (
                              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-700 font-medium">
                                  {SPECIAL_CASE_LABELS[obstacle.specialCase]}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  {obstacle.specialExplanation}
                                </p>
                              </div>
                            )}
                            {record.correctAnswer && (
                              <div className="mt-2 text-xs text-gray-500">
                                <span>正确答案：</span>
                                <span className="text-green-600">
                                  {record.correctAnswer.canBypass ? '可绕行' : '不可绕行'} ·{' '}
                                  {URGENCY_LABELS[record.correctAnswer.urgency]}紧急 ·{' '}
                                  {DEPARTMENT_LABELS[record.correctAnswer.contactDept]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-orange-500 font-semibold text-sm flex-shrink-0">
                            {record.scoreChange} 分
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'weakTypes' && (
              <div>
                {weakTypesData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>暂无数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {weakTypesData.map((item, index) => (
                      <div key={item.type} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                index === 0
                                  ? 'bg-red-500'
                                  : index === 1
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-800">
                              {OBSTACLE_TYPE_LABELS[item.type as keyof typeof OBSTACLE_TYPE_LABELS] || item.type}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-orange-600">
                            错误率 {Math.round(item.errorRate * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.errorRate > 0.6
                                ? 'bg-red-500'
                                : item.errorRate > 0.3
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${item.errorRate * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          正确 {item.correct} / 总共 {item.total}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="btn btn-outline min-w-[140px]"
          >
            返回首页
          </button>
          <button
            onClick={() => navigate(`/game/${block.id}`)}
            className="btn btn-primary min-w-[140px]"
          >
            再来一次
          </button>
        </div>
      </main>

      {showMap && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <MapPin size={18} className="text-primary-500" />
                地图查看
              </h3>
              <button
                onClick={() => setShowMap(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="h-[500px] p-4">
              <MapCanvas
                block={block}
                showAllObstacles={true}
                selectedObstacleId={selectedObstacleId}
                interactive={false}
                highlightMissed={true}
                foundObstacles={new Map(session.clickRecords.filter(r => r.isCorrect && r.obstacleId).map(r => [r.obstacleId!, r]))}
                falsePositiveClicks={session.clickRecords.filter(r => !r.obstacleId)}
              />
            </div>
            {selectedObstacle && (
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <h4 className="font-medium text-gray-800 mb-1">
                  {OBSTACLE_TYPE_LABELS[selectedObstacle.type as keyof typeof OBSTACLE_TYPE_LABELS]}
                </h4>
                <p className="text-sm text-gray-600">{selectedObstacle.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
