import { useState, useEffect } from 'react';
import { Printer, Download, Hash, Thermometer, Droplets, Wind, CloudRain, FlaskConical, Ban, ArrowRightLeft, Clock, Code2, FileText, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOC = [
  { id: 'risk-levels', label: '风险等级阈值', icon: Hash },
  { id: 'temp-score', label: '温度打分表', icon: Thermometer },
  { id: 'humidity-weight', label: '湿度权重', icon: Droplets },
  { id: 'wind-chill', label: '风速风寒修正', icon: Wind },
  { id: 'precipitation', label: '降水影响', icon: CloudRain },
  { id: 'salt-model', label: '撒盐抵消模型', icon: FlaskConical },
  { id: 'missing-data', label: '缺值处理', icon: Ban },
  { id: 'unit-conv', label: '单位转换', icon: ArrowRightLeft },
  { id: 'recheck-time', label: '复查时间表', icon: Clock },
  { id: 'formula', label: '完整公式', icon: Code2 },
];

const riskLevels = [
  { color: '#10B981', label: '绿', name: '安全', min: 0, max: 24, advice: '正常巡查频次，每2小时复查一次。无需特殊处置，记录现场数据。' },
  { color: '#F59E0B', label: '黄', name: '关注', min: 25, max: 49, advice: '加密巡查频次，每1小时复查一次。养护队伍进入待命状态，检查撒盐设备。' },
  { color: '#F97316', label: '橙', name: '预警', min: 50, max: 74, advice: '立即调度撒盐车辆前往目标桥梁。提前布置人员，准备开展预防性撒盐作业。' },
  { color: '#EF4444', label: '红', name: '紧急', min: 75, max: 100, advice: '立即启动紧急预案：封闭桥梁交通、实施撒盐除冰、发布预警通知，安排连续作业。' },
];

const tempTable = [
  { range: '≤ -5℃', label: '极寒', score: 30, note: '路面极易形成黑冰，即使无降水也会结霜结冰' },
  { range: '-5℃ ~ 0℃', label: '严寒', score: 25, note: '水在路面会迅速结冰，存在明显结冰风险' },
  { range: '0℃ ~ 2℃', label: '冰点临界', score: 18, note: '桥面温度略低于气温，极可能低于0℃' },
  { range: '2℃ ~ 5℃', label: '低温', score: 10, note: '桥面温度可能在0℃附近，需关注湿度与降水' },
  { range: '5℃ ~ 10℃', label: '微冷', score: 5, note: '正常情况无结冰风险，高湿度例外' },
  { range: '> 10℃', label: '常温', score: 2, note: '几乎无结冰可能' },
];

const humidityTable = [
  { range: '≥ 90%', score: 20, label: '极湿', note: '露/霜极易形成，桥面长时间处于潮湿状态' },
  { range: '80% ~ 90%', score: 15, label: '高湿', note: '桥面不易干燥，结露可能性较大' },
  { range: '70% ~ 80%', score: 10, label: '中湿', note: '桥面有一定概率保持湿润' },
  { range: '60% ~ 70%', score: 5, label: '低湿', note: '桥面较易干燥' },
  { range: '< 60%', score: 0, label: '干燥', note: '无结露风险，桥面保持干燥' },
];

const windTable = [
  { range: '≥ 10 m/s', label: '强风', score: 15, chill: '体感降低 5-8℃', note: '风寒效应显著，加速桥面热量流失' },
  { range: '6 ~ 10 m/s', label: '中等风', score: 10, chill: '体感降低 3-5℃', note: '有明显风寒效应' },
  { range: '3 ~ 6 m/s', label: '微风', score: 5, chill: '体感降低 1-3℃', note: '轻微风寒效应' },
  { range: '< 3 m/s', label: '静风', score: 0, chill: '可忽略', note: '无需修正' },
];

const precipTable = [
  { range: '> 2 mm/h', type: '强雨雪', score: 25, note: '大量液态水在冰点温度下瞬间结冰，风险极高' },
  { range: '0 ~ 2 mm/h', type: '小雨雪', score: 15, note: '桥面形成薄水膜，气温低于2℃极易结冰' },
  { range: '0（无降水）', type: '无', score: 0, note: '但仍需注意结露/结霜' },
  { range: '无数据', type: '缺值', score: 5, note: '取保守估值' },
];

const saltChartData = [
  { grams: 10, reduction: 8 },
  { grams: 20, reduction: 18 },
  { grams: 30, reduction: 28 },
  { grams: 40, reduction: 36 },
  { grams: 50, reduction: 42 },
  { grams: 60, reduction: 47 },
  { grams: 80, reduction: 52 },
  { grams: 100, reduction: 55 },
  { grams: 150, reduction: 57 },
  { grams: 200, reduction: 58 },
];

const unitConvTemp = [
  { c: -40, f: -40, desc: '极寒' },
  { c: -20, f: -4, desc: '严寒' },
  { c: 0, f: 32, desc: '冰点' },
  { c: 10, f: 50, desc: '常温起点' },
  { c: 20, f: 68, desc: '室温' },
  { c: 30, f: 86, desc: '炎热' },
];

const unitConvWind = [
  { ms: 1, kmh: 3.6, mph: 2.24, desc: '静风' },
  { ms: 3, kmh: 10.8, mph: 6.71, desc: '微风' },
  { ms: 5, kmh: 18.0, mph: 11.2, desc: '轻风' },
  { ms: 10, kmh: 36.0, mph: 22.4, desc: '强风' },
  { ms: 15, kmh: 54.0, mph: 33.6, desc: '疾风' },
  { ms: 20, kmh: 72.0, mph: 44.7, desc: '大风' },
];

const recheckTable = [
  { level: '安全', color: 'bg-ice-safe', interval: '2小时', min: 120, max: 180, scenarios: ['白天晴好', '气温>5℃', '干燥无降水'] },
  { level: '关注', color: 'bg-ice-caution', interval: '1小时', min: 45, max: 75, scenarios: ['傍晚夜间', '气温2-5℃', '湿度>80%'] },
  { level: '预警', color: 'bg-ice-warning', interval: '30分钟', min: 20, max: 40, scenarios: ['气温0-2℃', '微雨雪', '桥面潮湿'] },
  { level: '紧急', color: 'bg-ice-danger', interval: '15分钟', min: 5, max: 20, scenarios: ['气温<0℃', '强雨雪', '已出现结冰迹象'] },
];

export default function ThresholdDocs() {
  const [active, setActive] = useState('risk-levels');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    TOC.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const Section = ({ id, label, title, icon: Icon, children }: { id: string; label?: string; title: string; icon: any; children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-24 space-y-4 pb-12 border-b border-slate-200 last:border-0">
      <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-800/90">
        <div className="w-9 h-9 rounded-lg bg-ice-primary text-white flex items-center justify-center shrink-0 shadow-md">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );

  const ThTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
    <div className="rounded-xl border border-slate-300 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-bold text-slate-700 border-r border-slate-200 last:border-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6 rounded-2xl bg-white border border-slate-200 p-5 ice-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ice-primary to-ice-accent flex items-center justify-center shadow-lg shadow-sky-500/20">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">桥面结冰风险评估系统 — 阈值与算法说明</h1>
              <p className="text-sm text-slate-500 mt-1">版本 v1.0 · 留档版 · 生效日期 {new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> 打印此页
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-ice-primary to-ice-accent text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Download className="w-4 h-4" /> 下载PDF版本
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Snowflake className="w-3.5 h-3.5 text-ice-accent" /> 文档目录
              </h3>
            </div>
            <nav className="p-2">
              {TOC.map((t) => {
                const Icon = t.icon;
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => scrollTo(t.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left',
                      isActive
                        ? 'bg-gradient-to-r from-sky-50 to-white text-ice-primary font-bold border border-sky-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-ice-accent' : 'text-slate-400')} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <article className="flex-1 min-w-0 rounded-2xl bg-white border border-slate-200 p-10 shadow-sm">
          <Section id="risk-levels" title="风险等级阈值" icon={Hash}>
            <p className="text-sm text-slate-600 leading-relaxed">
              系统将综合评分结果划分为四个等级，采用交通信号灯颜色标识体系，确保现场人员能够快速识别风险级别并启动对应预案。
            </p>
            <ThTable headers={['颜色标识', '色码', '等级', '分数区间', '中文等级', '处置建议']}>
              {riskLevels.map((r) => (
                <tr key={r.label} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: r.color }} />
                      <span className="w-8 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.color}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.label}</td>
                  <td className="px-4 py-3 font-mono text-sm">{r.min} – {r.max}</td>
                  <td className="px-4 py-3"><span className="font-black" style={{ color: r.color }}>{r.name}</span></td>
                  <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">{r.advice}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="temp-score" title="温度打分表" icon={Thermometer}>
            <p className="text-sm text-slate-600 leading-relaxed">
              温度为结冰风险的核心决定因子。<strong className="text-slate-800">路表温度优先使用</strong>，缺失时采用气温估算值（详见缺值处理章节）。
            </p>
            <ThTable headers={['温度区间', '标签', '基础得分', '说明']}>
              {tempTable.map((t) => (
                <tr key={t.range} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{t.range}</td>
                  <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">{t.label}</span></td>
                  <td className="px-4 py-3"><span className="font-mono font-black text-xl text-ice-primary">{t.score}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.note}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="humidity-weight" title="湿度权重" icon={Droplets}>
            <p className="text-sm text-slate-600 leading-relaxed">
              相对湿度反映空气中水汽饱和程度。湿度越高，桥面越容易结露、结霜，即使无降水也会形成薄冰层。
            </p>
            <ThTable headers={['湿度区间', '标签', '权重得分', '说明']}>
              {humidityTable.map((h) => (
                <tr key={h.range} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{h.range}</td>
                  <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">{h.label}</span></td>
                  <td className="px-4 py-3"><span className="font-mono font-black text-xl text-ice-primary">{h.score}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{h.note}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="wind-chill" label="风速风寒修正" title="风速风寒修正" icon={Wind}>
            <p className="text-sm text-slate-600 leading-relaxed">
              风通过强制对流加速桥面热量流失，产生"风寒效应"使实际体感温度低于测量温度。风速越大，修正分值越高。
            </p>
            <ThTable headers={['风速区间（m/s）', '等级', '修正得分', '等效体感温度降幅', '说明']}>
              {windTable.map((w) => (
                <tr key={w.range} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{w.range}</td>
                  <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-xs font-semibold">{w.label}</span></td>
                  <td className="px-4 py-3"><span className="font-mono font-black text-xl text-ice-primary">{w.score}</span></td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{w.chill}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{w.note}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="precipitation" title="降水影响" icon={CloudRain}>
            <p className="text-sm text-slate-600 leading-relaxed">
              降水为结冰提供了必要的液态水来源。在冰点以下温度，即使微量降水也会在路面迅速形成冰层。
            </p>
            <ThTable headers={['降水强度（mm/h）', '类型', '得分', '说明']}>
              {precipTable.map((p) => (
                <tr key={p.range} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{p.range}</td>
                  <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">{p.type}</span></td>
                  <td className="px-4 py-3"><span className="font-mono font-black text-xl text-ice-primary">{p.score}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{p.note}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="salt-model" title="撒盐抵消模型" icon={FlaskConical}>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              撒盐（NaCl）可降低冰点，抵消一部分结冰风险。但撒盐量的收益存在边际递减效应：
              超过 100 g/㎡ 后，额外撒盐对风险评分的降低幅度明显缩小。模型以"可抵消分数"量化该效应。
            </p>
            <div className="rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-white p-6">
              <div className="flex items-end justify-between gap-3 h-64 border-b-2 border-slate-300 px-2 pb-2 mb-3">
                {saltChartData.map((d, i) => {
                  const max = 60;
                  const h = (d.reduction / max) * 100;
                  return (
                    <div key={d.grams} className="flex-1 flex flex-col items-center gap-2 justify-end h-full group">
                      <div className="text-[11px] font-black text-ice-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        -{d.reduction}
                      </div>
                      <div
                        className={cn(
                          'w-full rounded-t-md transition-all shadow-sm group-hover:brightness-110',
                          d.grams < 30 ? 'bg-gradient-to-t from-amber-500 to-amber-300' :
                          d.grams < 80 ? 'bg-gradient-to-t from-emerald-500 to-emerald-300' :
                          'bg-gradient-to-t from-ice-primary to-ice-accent'
                        )}
                        style={{ height: h + '%', minHeight: '6px' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-3 px-2">
                {saltChartData.map((d) => (
                  <div key={d.grams} className="flex-1 text-center">
                    <p className="text-[10px] font-mono font-bold text-slate-700">{d.grams}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter">g/㎡</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-dashed border-slate-300">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">图例说明：</strong>
                  <span className="inline-flex items-center gap-1.5 ml-3"><span className="w-3 h-3 rounded bg-amber-400" /> 不足（{'<'}30g/㎡）</span>
                  <span className="inline-flex items-center gap-1.5 ml-3"><span className="w-3 h-3 rounded bg-emerald-400" /> 推荐（30-80g/㎡）</span>
                  <span className="inline-flex items-center gap-1.5 ml-3"><span className="w-3 h-3 rounded bg-ice-primary" /> 足量（≥80g/㎡）</span>
                  &nbsp;· 推荐撒盐量 30-60 g/㎡，超过 150 g/㎡ 收益可忽略。
                </p>
              </div>
            </div>
          </Section>

          <Section id="missing-data" title="缺值处理" icon={Ban}>
            <p className="text-sm text-slate-600 leading-relaxed">
              当传感器数据缺失或人工录入不完整时，系统采用保守估算公式填补，避免因数据缺失导致风险低估。
            </p>
            <div className="rounded-xl border-2 border-dashed border-ice-accent/40 bg-sky-50/50 p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-ice-primary mb-2">MISSING_ROAD_TEMP — 路表温度缺失估算</h4>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-100 overflow-x-auto whitespace-pre">
<span className="text-purple-400">const</span> <span className="text-sky-300">MISSING_ROAD_TEMP</span> = <span className="text-emerald-300">(airTemp: number) {'=>'} number</span> = {'{'}
  <span className="text-slate-400">// 桥面温度通常比气温低 1℃ ~ 2℃，冬季取保守值 -1.5℃</span>
  <span className="text-purple-400">return</span> airTemp * <span className="text-amber-300">0.5</span> - <span className="text-amber-300">1.5</span>;
{'}'};
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-bold text-slate-700 mb-1">气温 2℃ 时</p>
                  <p className="font-mono text-slate-800">估算路表 = 0.5×2 - 1.5 = <strong className="text-ice-primary">-0.5℃</strong></p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-bold text-slate-700 mb-1">气温 0℃ 时</p>
                  <p className="font-mono text-slate-800">估算路表 = 0.5×0 - 1.5 = <strong className="text-ice-danger">-1.5℃</strong></p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-bold text-slate-700 mb-1">气温 -5℃ 时</p>
                  <p className="font-mono text-slate-800">估算路表 = 0.5×(-5) - 1.5 = <strong className="text-ice-danger">-4.0℃</strong></p>
                </div>
              </div>
            </div>
          </Section>

          <Section id="unit-conv" title="单位转换" icon={ArrowRightLeft}>
            <h3 className="text-base font-bold text-slate-800 pt-2">摄氏度 ⇄ 华氏度</h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-100 space-y-1 overflow-x-auto mb-4">
              <div><span className="text-slate-400">// 摄氏度 → 华氏度</span></div>
              <div>°F = °C × <span className="text-amber-300">9/5</span> + <span className="text-amber-300">32</span></div>
              <div className="pt-2"><span className="text-slate-400">// 华氏度 → 摄氏度</span></div>
              <div>°C = (°F − <span className="text-amber-300">32</span>) × <span className="text-amber-300">5/9</span></div>
            </div>
            <ThTable headers={['摄氏度 (℃)', '华氏度 (℉)', '说明']}>
              {unitConvTemp.map((r) => (
                <tr key={r.c} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{r.c}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{r.f}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{r.desc}</td>
                </tr>
              ))}
            </ThTable>

            <h3 className="text-base font-bold text-slate-800 pt-6">风速单位换算</h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-100 space-y-1 overflow-x-auto mb-4">
              <div>km/h = m/s × <span className="text-amber-300">3.6</span></div>
              <div>mph = m/s × <span className="text-amber-300">2.23694</span></div>
              <div>m/s = km/h ÷ <span className="text-amber-300">3.6</span> = mph ÷ <span className="text-amber-300">2.23694</span></div>
            </div>
            <ThTable headers={['m/s', 'km/h', 'mph', '蒲福风级描述']}>
              {unitConvWind.map((r) => (
                <tr key={r.ms} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{r.ms}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{r.kmh.toFixed(1)}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{r.mph.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{r.desc}</td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="recheck-time" title="复查时间表" icon={Clock}>
            <p className="text-sm text-slate-600 leading-relaxed">
              各风险等级建议复查时间区间。现场应根据实际天气变化灵活调整，恶劣天气下应缩短复查间隔。
            </p>
            <ThTable headers={['风险等级', '建议复查间隔', '典型复查区间（分钟）', '典型适用场景']}>
              {recheckTable.map((r) => (
                <tr key={r.level} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-4 h-4 rounded-full shadow-inner', r.color)} />
                      <span className="font-bold text-slate-800">{r.level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-black text-ice-primary font-mono">{r.interval}</span></td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-700">{r.min} – {r.max}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.scenarios.map((s) => (
                        <span key={s} className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">{s}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </ThTable>
          </Section>

          <Section id="formula" title="完整公式（伪代码）" icon={Code2}>
            <p className="text-sm text-slate-600 leading-relaxed">
              以下伪代码完整描述风险评分计算流程。所有实现在 <code className="px-1.5 py-0.5 bg-slate-100 rounded text-rose-600 font-mono text-xs">src/lib/risk.ts</code> 中均以 TypeScript 呈现。
            </p>
            <pre className="bg-slate-900 rounded-xl p-6 overflow-x-auto text-[13px] leading-relaxed shadow-inner border border-slate-800">
<code className="font-mono text-slate-100 whitespace-pre">
<span className="text-purple-400">function</span> <span className="text-sky-300">calcIceRiskScore</span>(input: <span className="text-amber-300">RiskInput</span>): <span className="text-amber-300">RiskResult</span> {'{'}
  <span className="text-slate-500">// === 1. 缺值填补 ===</span>
  <span className="text-purple-400">const</span> roadTemp = input.roadTemp
    ?? MISSING_ROAD_TEMP(input.airTemp);
  <span className="text-purple-400">const</span> precip   = input.precipitation ?? 0;

  <span className="text-slate-500">// === 2. 各项打分（见各章节阈值表） ===</span>
  <span className="text-purple-400">const</span> tempScore   = lookup(tempTable, roadTemp);
  <span className="text-purple-400">const</span> humidScore  = lookup(humidTable, input.humidity);
  <span className="text-purple-400">const</span> windScore   = lookup(windTable, input.windSpeed);
  <span className="text-purple-400">const</span> precipScore = lookup(precipTable, precip);

  <span className="text-slate-500">// === 3. 基础总分（上限 100） ===</span>
  <span className="text-purple-400">let</span> raw = clamp(tempScore + humidScore + windScore + precipScore, 0, 100);

  <span className="text-slate-500">// === 4. 撒盐抵消（若存在撒盐记录） ===</span>
  <span className="text-purple-400">if</span> (input.saltGPerSqm {'>'} 0) {'{'}
    <span className="text-purple-400">const</span> reduction = lookup(saltModel, input.saltGPerSqm);
    raw = clamp(raw - reduction, 0, 100);
  {'}'}

  <span className="text-slate-500">// === 5. 映射到等级 ===</span>
  <span className="text-purple-400">const</span> level = raw {'<='} 24 ? <span className="text-emerald-300">'SAFE'</span>
              : raw {'<='} 49 ? <span className="text-amber-300">'CAUTION'</span>
              : raw {'<='} 74 ? <span className="text-orange-300">'WARNING'</span>
              :             <span className="text-red-400">'DANGER'</span>;

  <span className="text-purple-400">return</span> {'{'} raw, level {'}'};
{'}'}
</code>
            </pre>
          </Section>

          <div className="pt-10 mt-4 border-t-2 border-double border-slate-300 text-center text-xs text-slate-400 space-y-1">
            <p>— 文档结束 —</p>
            <p>桥面结冰风险评估系统 · 算法与阈值留档文档 · 版本号 v1.0</p>
            <p>生成时间 {new Date().toLocaleString('zh-CN')}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
