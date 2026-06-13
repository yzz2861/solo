import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Camera,
  MessageSquareWarning,
  Play,
  CheckCircle2,
  Circle,
  MapPin,
  TrendingDown,
  CloudRain,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useWellStore } from '@/store/useWellStore';
import {
  LabImportRow,
  SampleImportRow,
  FeedbackImportRow,
  LabResult,
  SampleRecord,
  FeedbackRecord,
  Village,
  Well,
  NitrateUnit,
} from '@/types/well';
import { clsx } from 'clsx';

const uid = () => Math.random().toString(36).slice(2, 10);

const parseBool = (v: any) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return ['是', 'true', '1', 'yes', 'y', '有'].includes(s);
  }
  return false;
};

function pickField(obj: any, keys: string[]): any {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    importLabResults,
    importSamples,
    importFeedbacks,
    runMerge,
    mergeStats,
    labResults,
    samples,
    feedbacks,
    villages,
    wells,
  } = useWellStore();

  const [step, setStep] = useState(1);

  const handleLabImport = (rows: LabImportRow[]) => {
    const transformed: LabResult[] = [];
    const villageMap = new Map<string, { code: string; name: string }>();
    const wellSet = new Map<string, Well>();

    rows.forEach((r) => {
      const villageCode = String(
        pickField(r, ['villageCode', '村编码', '村代码', 'village_code']),
      );
      const villageName = String(
        pickField(r, ['village', '村名', '村庄', 'villageName']),
      );
      const wellNo = String(
        pickField(r, ['wellNo', '井号', 'well_no', 'officialNo']),
      );
      const labDate = String(
        pickField(r, ['labDate', '化验日期', '检测日期', 'lab_date']),
      );
      const nitrateRaw = pickField(r, [
        'nitrate',
        '硝酸盐',
        'nitrateN',
        'nitrate_n',
      ]);
      const nitrateUnit = String(
        pickField(r, ['nitrateUnit', '硝酸盐单位', 'nitrate_unit']),
      ) as NitrateUnit;
      const turbidityRaw = pickField(r, [
        'turbidity',
        '浊度',
        'turbidityNTU',
        'turbidity_ntu',
      ]);
      const coliformRaw = pickField(r, [
        'coliform',
        '菌落总数',
        '菌落',
        '细菌总数',
      ]);

      if (!villageCode && !villageName) return;
      if (villageCode || villageName) {
        villageSet.add({
          code: villageCode || villageName,
          name: villageName || villageCode,
        });
      }
      if (wellNo) {
        const vCode = villageCode || villageName;
        const wid = `w-${vCode}-${wellNo}`;
        if (!wellSet.has(wid)) {
          wellSet.set(wid, {
            id: wid,
            villageId: `v-${vCode}`,
            officialNo: wellNo,
            commonName: wellNo,
          });
        }
      }

      transformed.push({
        id: 'l-' + uid(),
        villageCode: villageCode || villageName,
        wellNo,
        labDate: labDate || new Date().toISOString().slice(0, 10),
        nitrate: nitrateRaw != null ? Number(nitrateRaw) : NaN,
        nitrateUnit: nitrateUnit || 'mg/L',
        turbidity: turbidityRaw != null ? Number(turbidityRaw) : NaN,
        coliform: coliformRaw != null ? Number(coliformRaw) : NaN,
      });
    });

    if (villages.length === 0) {
      const vs: Village[] = Array.from(villageSet).map((v) => ({
        id: `v-${v.code}`,
        name: v.name,
        code: v.code,
        positionX: 20 + Math.random() * 60,
        positionY: 15 + Math.random() * 60,
      }));
      useWellStore.getState().setVillages(vs);
      useWellStore.getState().setWells(Array.from(wellSet.values()));
    }

    importLabResults(transformed);
    if (rows.length > 0) setStep(Math.max(step, 2));
  };

  const handleSampleImport = (rows: SampleImportRow[]) => {
    const transformed: SampleRecord[] = [];
    const villageById = new Map(
      useWellStore.getState().villages.map((v) => [v.code, v]),
    );
    const wellByOfficial = new Map(
      useWellStore.getState().wells.map((w) => [w.officialNo, w]),
    );

    rows.forEach((r) => {
      const villageKey =
        String(pickField(r, ['villageCode', 'village', '村编码', '村名'])) ||
        '';
      const wellNo = String(
        pickField(r, ['wellNo', '井号', 'well_no', 'officialNo']),
      );
      const sampleDate = String(
        pickField(r, ['sampleDate', '采样日期', '采样时间']),
      );
      const photoNo = String(
        pickField(r, ['photoNo', '照片编号', '井口照片', 'photo_no']),
      );
      const postRain = parseBool(
        pickField(r, ['postRain', '雨后', '雨后补采', 'post_rain']),
      );
      const missing = parseBool(
        pickField(r, ['missing', '缺样', '未采样', '缺采样']),
      );
      const note = String(pickField(r, ['note', '备注', '说明']) || '');

      let wellId = '';
      const w = wellByOfficial.get(wellNo);
      if (w) {
        wellId = w.id;
      } else {
        const v = villageById.get(villageKey);
        if (v) {
          const wid = `w-${v.code}-${wellNo}`;
          wellId = wid;
          const wellsNow = useWellStore.getState().wells;
          if (!wellsNow.find((ww) => ww.id === wid)) {
            useWellStore.getState().setWells([
              ...wellsNow,
              {
                id: wid,
                villageId: v.id,
                officialNo: wellNo,
                commonName: wellNo,
              },
            ]);
          }
        }
      }
      if (!wellId) return;

      transformed.push({
        id: 's-' + uid(),
        wellId,
        sampleDate: sampleDate || new Date().toISOString().slice(0, 10),
        photoNo: photoNo || '未记录',
        postRain,
        missing,
        note: note || undefined,
      });
    });

    importSamples(transformed);
    if (rows.length > 0) setStep(Math.max(step, 3));
  };

  const handleFeedbackImport = (rows: FeedbackImportRow[]) => {
    const transformed: FeedbackRecord[] = rows.map((r) => ({
      id: 'f-' + uid(),
      villageName: String(
        pickField(r, ['villageName', 'village', '村名', '村庄']),
      ),
      wellNoOrName: String(
        pickField(r, [
          'wellNo',
          'wellName',
          '井号',
          '井名',
          'well_no',
          'well_name',
        ]),
      ),
      reportDate: String(
        pickField(r, ['reportDate', '反馈日期', '报告日期', '反馈时间']),
      ),
      reporter: String(pickField(r, ['reporter', '报告人', '村干部']) || '未署名'),
      odorDesc: String(
        pickField(r, ['odorDesc', '异味描述', 'feedback', '反馈内容', '描述']) ||
          '',
      ),
    }));
    importFeedbacks(transformed);
    if (rows.length > 0) setStep(Math.max(step, 4));
  };

  const steps = [
    { n: 1, label: '上传化验表', done: labResults.length > 0, count: labResults.length },
    { n: 2, label: '上传采样记录', done: samples.length > 0, count: samples.length },
    { n: 3, label: '上传村民反馈', done: feedbacks.length > 0, count: feedbacks.length },
    { n: 4, label: '合并并分析', done: !!mergeStats, count: mergeStats?.totalRecords || 0 },
  ];

  const canRun = labResults.length > 0 || samples.length > 0 || feedbacks.length > 0;

  const overviewStats = useMemo(() => {
    if (!mergeStats) return null;
    return [
      {
        label: '合并记录数',
        value: mergeStats.totalRecords,
        sub: `覆盖 ${mergeStats.totalWells} 口井`,
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'safe',
      },
      {
        label: '缺样/缺化验',
        value: mergeStats.missingSample + mergeStats.missingLab,
        sub: '进入复检队列',
        icon: <TrendingDown className="w-4 h-4" />,
        color: 'warn',
      },
      {
        label: '雨后补采',
        value: mergeStats.postRainCount,
        sub: '雨季专项采样',
        icon: <CloudRain className="w-4 h-4" />,
        color: 'primary',
      },
      {
        label: '异味反馈',
        value: mergeStats.odorFeedbackCount,
        sub: '关联到相关井',
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'danger',
      },
    ];
  }, [mergeStats]);

  const colorMap: Record<string, string> = {
    safe: 'from-safe-400/20 to-safe-500/5 text-safe-600',
    warn: 'from-warn-400/20 to-warn-500/5 text-warn-600',
    danger: 'from-danger-400/20 to-danger-500/5 text-danger-600',
    primary: 'from-primary-300/30 to-primary-500/5 text-primary-600',
  };

  return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-black text-primary-800 tracking-tight">
            数据导入与合并
          </h1>
          <p className="text-primary-600 mt-1.5 text-sm">
            依次导入化验指标、采样记录和村民反馈，系统按村/井号/时间自动匹配合并
          </p>
        </div>
        {wells.length > 0 && (
          <button
            onClick={() => navigate('/mapping')}
            className="btn-secondary text-sm"
          >
            <MapPin className="w-4 h-4" />
            配置井名俗称 ({wells.length})
          </button>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif font-bold text-primary-800 text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary-500" />
            四步完成合并分析
          </h2>
          <div className="text-xs text-primary-500">
            完成后可前往卫生院总览或村级报告查看
          </div>
        </div>
        <div className="flex items-start gap-2 md:gap-4">
          {steps.map((s, idx) => (
            <div key={s.n} className="flex items-start flex-1">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    s.done
                      ? 'bg-safe-500 text-white shadow-md shadow-safe-500/30'
                      : step >= s.n
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-primary-100 text-primary-500',
                  )}
                >
                  {s.done ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    s.n
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={clsx(
                      'text-sm font-medium',
                      s.done ? 'text-safe-600' : 'text-primary-700',
                    )}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-primary-400 mt-0.5">
                    {s.count > 0 ? `${s.count} 条` : '待上传'}
                  </div>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 mt-5 mx-1 md:mx-2 h-0.5 rounded bg-primary-100 overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded transition-all',
                      steps[idx + 1].done || step >= steps[idx + 1].n
                        ? 'bg-safe-500'
                        : 'bg-primary-300',
                    )}
                    style={{
                      width:
                        s.done && (steps[idx + 1].done || step >= steps[idx + 1].n)
                          ? '100%'
                          : s.done
                          ? '60%'
                          : '0%',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        <FileUpload<LabImportRow>
          label="化验指标"
          description="实验室出具的检测结果表（硝酸盐/浊度/菌落）"
          expectedColumns={['村编码', '井号', '化验日期', '硝酸盐', '硝酸盐单位', '浊度', '菌落总数']}
          icon={<FlaskConical className="w-5 h-5 text-primary-500" />}
          colorAccent="primary"
          onParsed={handleLabImport}
        />
        <FileUpload<SampleImportRow>
          label="采样记录"
          description="采样员登记的井口照片编号和采样信息"
          expectedColumns={['村编码', '井号', '采样日期', '照片编号', '雨后补采', '缺样']}
          icon={<Camera className="w-5 h-5 text-warn-500" />}
          colorAccent="warn"
          onParsed={handleSampleImport}
        />
        <FileUpload<FeedbackImportRow>
          label="村民反馈"
          description="村干部在微信群上报的异味等反馈记录"
          expectedColumns={['村名', '井号/井名', '反馈日期', '报告人', '异味描述']}
          icon={<MessageSquareWarning className="w-5 h-5 text-danger-500" />}
          colorAccent="safe"
          onParsed={handleFeedbackImport}
        />
      </div>

      <div className="card flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary-50 to-safe-400/10 border-primary-100">
        <div>
          <div className="font-serif font-bold text-primary-800 text-lg mb-1">
            一键执行合并分析
          </div>
          <div className="text-sm text-primary-600">
            按村+井号+时间窗自动匹配，统一单位（mg/L），判定超标并生成三态分类
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              runMerge();
              setStep(4);
            }}
            disabled={!canRun}
            className="btn-primary text-base px-6 py-3 shadow-lg shadow-primary-500/25"
          >
            <Play className="w-5 h-5" />
            执行合并分析
          </button>
          {mergeStats && (
            <button
              onClick={() => navigate('/overview')}
              className="btn-secondary text-base px-5 py-3"
            >
              前往总览
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {overviewStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {overviewStats.map((s) => (
            <div
              key={s.label}
              className={clsx(
                'card-sm relative overflow-hidden bg-gradient-to-br',
                colorMap[s.color],
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium opacity-80">
                  {s.label}
                </span>
                {s.icon}
              </div>
              <div className="text-3xl font-black font-serif">{s.value}</div>
              <div className="text-xs opacity-70 mt-1">{s.sub}</div>
              <Circle
                className="absolute -right-6 -top-6 w-24 h-24 opacity-10"
                strokeWidth={1.5}
              />
            </div>
          ))}
        </div>
      )}

      {mergeStats && (
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() => navigate('/overview')}
            className="btn-primary shadow-lg shadow-primary-500/25"
          >
            🗺️ 卫生院总览地图与趋势
          </button>
          <button
            onClick={() => navigate('/village/all')}
            className="btn-warn shadow-lg shadow-warn-500/25"
          >
            📋 村级三态报告（村干部视图）
          </button>
        </div>
      )}
    </div>
  );
}
            onClick={() => navigate('/overview')}
            className="btn-primary shadow-lg shadow-primary-500/25"
          >
            🗺️ 卫生院总览地图与趋势
          </button>
          <button
            onClick={() => navigate('/village/all')}
            className="btn-warn shadow-lg shadow-warn-500/25"
          >
            📋 村级三态报告（村干部视图）
          </button>
        </div>
      )}
    </div>
  );
}
