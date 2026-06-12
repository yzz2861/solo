import {
  Village,
  Well,
  SampleRecord,
  LabResult,
  FeedbackRecord,
  ThresholdConfig,
  AdviceTemplate,
} from '@/types/well';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  nitrateStop: 24,
  nitrateRetest: 18,
  turbidityStop: 3.6,
  turbidityRetest: 2.5,
  coliformStop: 120,
  coliformRetest: 80,
};

export const DEFAULT_ADVICE: AdviceTemplate[] = [
  {
    risk: 'STOP',
    title: '建议暂停饮用',
    suggestion:
      '该井当前水质指标偏高，建议暂停饮用，可临时使用周边安全井或集中供水。卫生院将安排技术人员现场排查原因。',
    forwardTemplate:
      '【村用水提醒】经卫生院检测，{wellName}目前建议暂停饮用，可临时改用其他水源。有疑问请联系村卫生室。请勿转发非官方信息。',
  },
  {
    risk: 'RETEST',
    title: '等候复查结果',
    suggestion:
      '该井检测结果接近限值或出现异味反馈，卫生院已安排雨后补采或二次化验。目前建议煮沸后饮用，待复检结果再做调整。',
    forwardTemplate:
      '【村用水提醒】经卫生院检测，{wellName}正在安排复查。建议当前煮沸后饮用，结果出来会第一时间通知大家。有疑问请联系村卫生室。',
  },
  {
    risk: 'OBSERVE',
    title: '可正常饮用',
    suggestion:
      '该井当前各项指标符合生活饮用水标准，雨季仍请留意井水外观和气味，有异常随时向村卫生室反馈。',
    forwardTemplate:
      '【村用水提醒】经卫生院检测，{wellName}目前可正常饮用。雨季如发现水浑或有异味，请及时告诉村卫生室。',
  },
];

export const MOCK_VILLAGES: Village[] = [
  { id: 'v1', name: '清泉村', code: 'QC01', positionX: 20, positionY: 25 },
  { id: 'v2', name: '石坳村', code: 'SA02', positionX: 55, positionY: 18 },
  { id: 'v3', name: '龙湾村', code: 'LW03', positionX: 80, positionY: 32 },
  { id: 'v4', name: '杨木村', code: 'YM04', positionX: 28, positionY: 60 },
  { id: 'v5', name: '坪溪村', code: 'PX05', positionX: 62, positionY: 70 },
];

export const MOCK_WELLS: Well[] = [
  { id: 'w1', villageId: 'v1', officialNo: 'QC-001', commonName: '老槐树井' },
  { id: 'w2', villageId: 'v1', officialNo: 'QC-002', commonName: '大队部井' },
  { id: 'w3', villageId: 'v1', officialNo: 'QC-003', commonName: '东头大井' },
  { id: 'w4', villageId: 'v2', officialNo: 'SA-001', commonName: '学校旁井' },
  { id: 'w5', villageId: 'v2', officialNo: 'SA-002', commonName: '石坳上井' },
  { id: 'w6', villageId: 'v3', officialNo: 'LW-001', commonName: '祠堂门口井' },
  { id: 'w7', villageId: 'v3', officialNo: 'LW-002', commonName: '下湾井' },
  { id: 'w8', villageId: 'v4', officialNo: 'YM-001', commonName: '杨家井' },
  { id: 'w9', villageId: 'v4', officialNo: 'YM-002', commonName: '木桥边井' },
  { id: 'w10', villageId: 'v5', officialNo: 'PX-001', commonName: '溪口井' },
  { id: 'w11', villageId: 'v5', officialNo: 'PX-002', commonName: '坪中央井' },
];

const d = (offset: number) => {
  const date = new Date(2026, 5, 1);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const MOCK_SAMPLES: SampleRecord[] = [
  { id: 's1', wellId: 'w1', sampleDate: d(1), photoNo: 'IMG_0021', postRain: false, missing: false },
  { id: 's2', wellId: 'w2', sampleDate: d(1), photoNo: 'IMG_0022', postRain: false, missing: false },
  { id: 's3', wellId: 'w3', sampleDate: d(1), photoNo: 'IMG_0023', postRain: false, missing: false },
  { id: 's4', wellId: 'w4', sampleDate: d(2), photoNo: 'IMG_0031', postRain: false, missing: false },
  { id: 's5', wellId: 'w5', sampleDate: d(2), photoNo: 'IMG_0032', postRain: false, missing: false },
  { id: 's6', wellId: 'w6', sampleDate: d(2), photoNo: 'IMG_0041', postRain: false, missing: false },
  { id: 's7', wellId: 'w7', sampleDate: d(2), photoNo: 'IMG_0042', postRain: false, missing: false },
  { id: 's8', wellId: 'w8', sampleDate: d(3), photoNo: 'IMG_0051', postRain: false, missing: false },
  { id: 's9', wellId: 'w9', sampleDate: d(3), photoNo: 'IMG_0052', postRain: false, missing: false },
  { id: 's10', wellId: 'w10', sampleDate: d(3), photoNo: 'IMG_0061', postRain: false, missing: false },
  { id: 's11', wellId: 'w11', sampleDate: d(3), photoNo: 'IMG_0062', postRain: false, missing: false },
  { id: 's12', wellId: 'w1', sampleDate: d(5), photoNo: 'IMG_0101', postRain: true, missing: false, note: '6月5日暴雨后补采' },
  { id: 's13', wellId: 'w3', sampleDate: d(5), photoNo: 'IMG_0103', postRain: true, missing: false, note: '雨后补采' },
  { id: 's14', wellId: 'w4', sampleDate: d(5), photoNo: 'IMG_0104', postRain: true, missing: false, note: '雨后补采' },
  { id: 's15', wellId: 'w8', sampleDate: d(5), photoNo: 'IMG_0108', postRain: true, missing: false, note: '雨后补采' },
  { id: 's16', wellId: 'w10', sampleDate: d(5), photoNo: '缺失', postRain: true, missing: true, note: '采样员未到，缺样' },
  { id: 's17', wellId: 'w2', sampleDate: d(8), photoNo: 'IMG_0201', postRain: false, missing: false },
  { id: 's18', wellId: 'w5', sampleDate: d(8), photoNo: 'IMG_0202', postRain: false, missing: false },
  { id: 's19', wellId: 'w7', sampleDate: d(8), photoNo: 'IMG_0203', postRain: false, missing: false },
];

export const MOCK_LAB_RESULTS: LabResult[] = [
  { id: 'l1', sampleId: 's1', villageCode: 'QC01', wellNo: 'QC-001', labDate: d(2), nitrate: 4.2, nitrateUnit: 'mg/L', turbidity: 1.1, coliform: 12 },
  { id: 'l2', sampleId: 's2', villageCode: 'QC01', wellNo: 'QC-002', labDate: d(2), nitrate: 25.5, nitrateUnit: 'mg/L', turbidity: 1.8, coliform: 45 },
  { id: 'l3', sampleId: 's3', villageCode: 'QC01', wellNo: 'QC-003', labDate: d(2), nitrate: 18500, nitrateUnit: 'μg/L', turbidity: 2.6, coliform: 60 },
  { id: 'l4', sampleId: 's4', villageCode: 'SA02', wellNo: 'SA-001', labDate: d(3), nitrate: 8.1, nitrateUnit: 'mg/L', turbidity: 3.9, coliform: 90 },
  { id: 'l5', sampleId: 's5', villageCode: 'SA02', wellNo: 'SA-002', labDate: d(3), nitrate: 3.5, nitrateUnit: 'mg/L', turbidity: 0.9, coliform: 8 },
  { id: 'l6', sampleId: 's6', villageCode: 'LW03', wellNo: 'LW-001', labDate: d(3), nitrate: 12.8, nitrateUnit: 'mg/L', turbidity: 2.2, coliform: 28 },
  { id: 'l7', sampleId: 's7', villageCode: 'LW03', wellNo: 'LW-002', labDate: d(3), nitrate: 19.2, nitrateUnit: 'mg/L', turbidity: 3.2, coliform: 135 },
  { id: 'l8', sampleId: 's8', villageCode: 'YM04', wellNo: 'YM-001', labDate: d(4), nitrate: 2.1, nitrateUnit: 'mg/L', turbidity: 0.7, coliform: 5 },
  { id: 'l9', sampleId: 's9', villageCode: 'YM04', wellNo: 'YM-002', labDate: d(4), nitrate: 5.9, nitrateUnit: 'mg/L', turbidity: 1.5, coliform: 18 },
  { id: 'l10', sampleId: 's10', villageCode: 'PX05', wellNo: 'PX-001', labDate: d(4), nitrate: 16.3, nitrateUnit: 'mg/L', turbidity: 2.8, coliform: 75 },
  { id: 'l11', sampleId: 's11', villageCode: 'PX05', wellNo: 'PX-002', labDate: d(4), nitrate: 1.8, nitrateUnit: 'mg/L', turbidity: 0.5, coliform: 3 },
  { id: 'l12', sampleId: 's12', villageCode: 'QC01', wellNo: 'QC-001', labDate: d(6), nitrate: 4.8, nitrateUnit: 'mg/L', turbidity: 2.4, coliform: 22 },
  { id: 'l13', sampleId: 's13', villageCode: 'QC01', wellNo: 'QC-003', labDate: d(6), nitrate: 19.8, nitrateUnit: 'mg/L', turbidity: 4.1, coliform: 88 },
  { id: 'l14', sampleId: 's14', villageCode: 'SA02', wellNo: 'SA-001', labDate: d(6), nitrate: 9.5, nitrateUnit: 'mg/L', turbidity: 3.2, coliform: 105 },
  { id: 'l15', sampleId: 's15', villageCode: 'YM04', wellNo: 'YM-001', labDate: d(6), nitrate: 2.6, nitrateUnit: 'mg/L', turbidity: 2.1, coliform: 19 },
  { id: 'l17', sampleId: 's17', villageCode: 'QC01', wellNo: 'QC-002', labDate: d(9), nitrate: 23.1, nitrateUnit: 'mg/L', turbidity: 1.6, coliform: 52 },
  { id: 'l18', sampleId: 's18', villageCode: 'SA02', wellNo: 'SA-002', labDate: d(9), nitrate: 3.8, nitrateUnit: 'mg/L', turbidity: 0.8, coliform: 10 },
  { id: 'l19', sampleId: 's19', villageCode: 'LW03', wellNo: 'LW-002', labDate: d(9), nitrate: 17.5, nitrateUnit: 'mg/L', turbidity: 2.8, coliform: 110 },
];

export const MOCK_FEEDBACKS: FeedbackRecord[] = [
  {
    id: 'f1',
    villageName: '清泉村',
    wellNoOrName: 'QC-002',
    reportDate: d(4),
    reporter: '李主任',
    odorDesc: '村民反映雨后井水有泥腥味，颜色略黄',
  },
  {
    id: 'f2',
    villageName: '石坳村',
    wellNoOrName: '学校旁井',
    reportDate: d(5),
    reporter: '王支书',
    odorDesc: '学校老师说水有股铁锈味',
  },
  {
    id: 'f3',
    villageName: '龙湾村',
    wellNoOrName: 'LW-002',
    reportDate: d(6),
    reporter: '张会计',
    odorDesc: '有村民说水烧开后有白色沉淀',
  },
  {
    id: 'f4',
    villageName: '坪溪村',
    wellNoOrName: 'PX-001',
    reportDate: d(7),
    reporter: '刘村长',
    odorDesc: '溪口井水浑，担心被溪水倒灌',
  },
];
