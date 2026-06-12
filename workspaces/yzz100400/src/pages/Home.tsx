import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { levels } from "@/data/levels";
import { Waves, Map, Star, ChevronRight, Trophy, BookOpen } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import type { ReplaySession } from "@/types/game";

function TidalCurvePreview({ steps }: { steps: { turn: number; waterLevel: number }[] }) {
  if (steps.length < 2) return null;

  const width = 120;
  const height = 40;
  const padding = 4;
  const maxWater = Math.max(...steps.map((s) => s.waterLevel));
  const maxTurn = Math.max(...steps.map((s) => s.turn));

  const points = steps.map((s) => {
    const x = padding + (s.turn / maxTurn) * (width - padding * 2);
    const y = height - padding - (s.waterLevel / maxWater) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="tidalFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tide-teal)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ocean-deep)" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#tidalFill)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--tide-teal)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const startLevel = useGameStore((s) => s.startLevel);
  const [replays, setReplays] = useState<ReplaySession[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tidal-rescue-replays");
      if (raw) {
        setReplays(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const handleStartLevel = (levelId: string) => {
    startLevel(levelId);
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--ocean-deep)] overflow-y-auto">
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--deep-indigo)] via-[var(--ocean-mid)] to-[var(--ocean-deep)] py-16 px-4">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path
              fill="var(--tide-teal)"
              d="M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,197.3C672,192,768,160,864,160C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <Waves className="mx-auto mb-4 text-[var(--tide-teal)]" size={48} />
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider text-[var(--text-primary)] mb-3">
            海岛潮汐救援棋
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] tracking-wide">
            潮汐调度训练模拟
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-12 md:h-16">
            <path
              fill="var(--ocean-deep)"
              d="M0,40L60,35C120,30,240,20,360,25C480,30,600,50,720,50C840,50,960,30,1080,25C1200,20,1320,30,1380,35L1440,40L1440,80L0,80Z"
            />
          </svg>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Map className="text-[var(--tide-teal)]" size={24} />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">选择训练关卡</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => (
            <div
              key={level.id}
              className="glass-panel p-5 flex flex-col gap-4 hover:border-[var(--tide-teal)] transition-colors duration-300"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-[var(--surface-light)] text-[var(--tide-teal)]">
                  {level.region}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < level.difficulty
                          ? "text-[var(--warning-amber)] fill-[var(--warning-amber)]"
                          : "text-[var(--text-muted)]"
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{level.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{level.description}</p>
              </div>

              <TidalCurvePreview steps={level.tidalCurve.steps} />

              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{level.mapWidth}×{level.mapHeight}</span>
                <span>游客 {level.touristGroups.reduce((s, g) => s + g.count, 0)}人</span>
                <span>船只 {level.boats.length}艘</span>
              </div>

              <button
                onClick={() => handleStartLevel(level.id)}
                className="btn-primary flex items-center justify-center gap-2 mt-auto text-sm"
              >
                开始训练
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-[var(--warning-amber)]" size={24} />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">训练记录</h2>
        </div>

        {replays.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <BookOpen className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
            <p className="text-[var(--text-secondary)]">暂无训练记录</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {replays.map((session) => {
                const levelName = levels.find((l) => l.id === session.levelId)?.name ?? session.levelId;
                return (
                  <div key={session.id} className="glass-panel-sm p-4 flex flex-col gap-2">
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">{levelName}</h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(session.endTime).toLocaleDateString("zh-CN")}
                    </p>
                    <p className="text-sm text-[var(--tide-teal)] font-bold">
                      总分: {session.score.total}
                    </p>
                    <button
                      onClick={() => navigate(`/replay/${session.id}`)}
                      className="btn-secondary text-xs py-1.5 px-3 self-start"
                    >
                      查看复盘
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate("/report")}
              className="btn-primary text-sm"
            >
              训练报告
            </button>
          </>
        )}
      </section>
    </div>
  );
}
