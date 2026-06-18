import { useStore } from "@/store";
import {
  CloudSun,
  CloudRain,
  CloudLightning,
  Sun,
  Cloud,
  Droplets,
  Clock,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";
import { todayStr } from "@/data/seed";
import type { WeatherNote, Role } from "@/types";

const conditionMap = {
  sunny: { icon: Sun, label: "晴", color: "text-amber-500", bg: "bg-amber-50" },
  cloudy: { icon: Cloud, label: "多云", color: "text-slate-500", bg: "bg-slate-50" },
  rain: { icon: CloudRain, label: "降雨", color: "text-blue-600", bg: "bg-blue-50" },
  storm: { icon: CloudLightning, label: "雷暴", color: "text-purple-600", bg: "bg-purple-50" },
} as const;

const roleMap: Record<Role, { label: string; color: string }> = {
  reception: { label: "前台", color: "bg-court-100 text-court-700" },
  manager: { label: "店长", color: "bg-amber-100 text-amber-700" },
  coach: { label: "教练", color: "bg-purple-100 text-purple-700" },
};

export default function TopBar() {
  const weather = useStore((s) => s.weatherNote);
  const currentRole = useStore((s) => s.currentRole);
  const currentUser = useStore((s) => s.currentUser);
  const setRole = useStore((s) => s.setRole);
  const updateWeather = useStore((s) => s.updateWeather);
  const resetAll = useStore((s) => s.resetAll);

  const cond = conditionMap[weather.condition];
  const CondIcon = cond.icon;

  const isRainy = weather.condition === "rain" || weather.condition === "storm";

  return (
    <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sticky">
      <div
        className={`relative overflow-hidden transition-all duration-500 ${
          isRainy
            ? "bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50"
            : "bg-gradient-to-r from-court-50 via-white to-amber-50"
        }`}
      >
        {isRainy && (
          <div className="absolute inset-0 pointer-events-none opacity-50">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute block w-[2px] h-4 bg-blue-400/60 rounded-full animate-raindrop"
                style={{
                  left: `${(i * 5.7 + 3) % 100}%`,
                  top: `${(i * 13) % 60}%`,
                  animationDelay: `${(i % 10) * 0.2}s`,
                  animationDuration: `${1.8 + (i % 5) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-court-500 to-court-700 text-white flex items-center justify-center shadow-soft">
              <span className="text-xl">🎾</span>
            </div>
            <div>
              <div className="text-base font-bold text-gray-800 leading-tight">
                球馆雨停调度中心
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {todayStr} · Tennis Court Rain Switch
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${cond.bg}`}>
              <CondIcon className={`w-4 h-4 ${cond.color}`} />
              <span className={`text-xs font-medium ${cond.color}`}>{cond.label}</span>
              <div className="h-4 w-px bg-gray-200/70 mx-1" />
              <select
                value={weather.condition}
                onChange={(e) =>
                  updateWeather({
                    condition: e.target.value as WeatherNote["condition"],
                  })
                }
                className="bg-transparent text-xs font-medium text-gray-700 outline-none cursor-pointer appearance-none pr-4"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right center",
                }}
              >
                <option value="sunny">晴</option>
                <option value="cloudy">多云</option>
                <option value="rain">降雨</option>
                <option value="storm">雷暴</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-gray-100">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">降雨起</span>
                <input
                  type="time"
                  value={weather.rainStart ?? ""}
                  onChange={(e) =>
                    updateWeather({
                      rainStart: e.target.value || null,
                    })
                  }
                  className="w-20 px-2 py-0.5 text-xs rounded-md bg-gray-50 border border-gray-100 outline-none focus:border-court-400"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="time"
                  value={weather.rainEnd ?? ""}
                  onChange={(e) =>
                    updateWeather({
                      rainEnd: e.target.value || null,
                    })
                  }
                  className="w-20 px-2 py-0.5 text-xs rounded-md bg-gray-50 border border-gray-100 outline-none focus:border-court-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 max-w-xs">
              <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
              <input
                type="text"
                value={weather.remark ?? ""}
                onChange={(e) => updateWeather({ remark: e.target.value || null })}
                placeholder="天气备注（例：下午2点开始大雨）"
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-gray-100 outline-none focus:border-court-400 focus:ring-1 focus:ring-court-200"
              />
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1 border border-gray-200">
            {(Object.keys(roleMap) as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                  currentRole === r
                    ? `${roleMap[r].color} shadow-sm scale-[1.02]`
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/70"
                }`}
              >
                {roleMap[r].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-gray-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-court-400 to-court-600 text-white text-xs font-bold flex items-center justify-center">
              {currentUser.slice(0, 1)}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-gray-700">{currentUser}</div>
              <div className="text-[10px] text-gray-400">
                {roleMap[currentRole].label}视角
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("确定要重置为初始数据吗？当前所有操作将丢失。")) {
                resetAll();
              }
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="重置为初始数据"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="刷新数据"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
