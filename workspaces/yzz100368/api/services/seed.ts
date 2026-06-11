import { nanoid } from 'nanoid';
import { getDb, run, query } from '../db.js';
import { extractFromText } from './extraction.js';

const SAMPLE_PATIENTS = [
  {
    name: '张秀兰',
    idCard: '110101195203154521',
    phone: '13801234567',
    gender: '女' as const,
    age: 72,
  },
  {
    name: '李建国',
    idCard: '310104196508123218',
    phone: '13912345678',
    gender: '男' as const,
    age: 59,
  },
  {
    name: '王美华',
    idCard: '440101197811256789',
    phone: '13611112222',
    gender: '女' as const,
    age: 46,
  },
  {
    name: '赵德财',
    idCard: '330102194805099876',
    phone: '13788889999',
    gender: '男' as const,
    age: 76,
  },
  {
    name: '陈雅琴',
    idCard: '510104198507223456',
    phone: '13566667777',
    gender: '女' as const,
    age: 39,
  },
];

const SAMPLE_RECORDS = [
  {
    patientIdx: 0,
    visitDate: '2026-06-08',
    sourceType: 'text' as const,
    text: `患者张秀兰，女，72岁。
主诉：反复咳嗽咳痰5天，伴胸闷气促2天。
现病史：5天前受凉后出现咳嗽，咳黄白痰，伴低热，自服感冒药无效。2天前出现活动后胸闷。
既往史：高血压病史10年，规律服药。
过敏史：青霉素过敏。
查体：T 37.8℃，双肺呼吸音粗，可闻及散在湿啰音。
诊断：急性支气管炎，高血压2级。
用药：
1. 头孢克肟 0.1g 口服 每日2次 共7天
2. 氨溴索 30mg 口服 每日3次
3. 硝苯地平缓释片 20mg 口服 每日2次
复诊：一周后复诊，查血常规、胸片。
手机号：13801234567
身份证：110101195203154521`,
  },
  {
    patientIdx: 1,
    visitDate: '2026-06-09',
    sourceType: 'text' as const,
    text: `李建国 男 59岁
主诉：头晕头痛3天，伴恶心。
现病史：3天前无明显诱因出现头晕，以体位变化时明显，测血压165/98mmHg。
既往史：糖尿病5年。
过敏史：无药物过敏史。
查体：BP 160/95mmHg，心率82次/分，律齐。
诊断：高血压病（2级 很高危），2型糖尿病。
用药：
1. 缬沙坦 80mg qd
2. 二甲双胍 0.5 口服 每日三次
3. 阿托伐他汀 20mg qn
复诊：半月后监测血压血糖，复查肝肾功能。
电话13912345678`,
  },
  {
    patientIdx: 2,
    visitDate: '2026-06-09',
    sourceType: 'text' as const,
    text: `王美华 女 46岁
主诉：上腹部隐痛1周，伴反酸嗳气。
现病史：1周来空腹及夜间上腹痛明显，进食后稍缓解，无呕血黑便。
既往史：无特殊。
过敏史：？
查体：腹平软，上腹部轻压痛，无反跳痛。
诊断：慢性胃炎，十二指肠球炎？
用药：
1. 奥美拉唑 20mg 口服 每日晨起
2. 铝碳酸镁 1g 口服 每日三次（饭后）
复诊：两周后复诊，必要时胃镜检查。`,
  },
  {
    patientIdx: 3,
    visitDate: '2026-06-10',
    sourceType: 'text' as const,
    text: `赵德财 男 76岁
主诉：腰痛伴左下肢放射痛1周。
现病史：1周前弯腰拾物后突发腰痛，向左下肢放射，行走困难。
既往史：腰椎间盘突出病史多年。
过敏史：磺胺过敏，海鲜过敏。
查体：腰椎L4-5棘突旁压痛(+)，左直腿抬高试验30°(+)。
诊断：腰椎间盘突出症急性发作。
用药：
1. 布洛芬 0.2g 口服 每日三次 饭后
2. 甲钴胺 0.5mg 口服 每日三次
3. 云南白药膏 外用 每日一贴
复诊：3天后复诊评估，必要时MRI检查。
联系电话 13788889999`,
  },
  {
    patientIdx: 4,
    visitDate: '2026-06-10',
    sourceType: 'text' as const,
    text: `陈雅琴 女 39岁
主诉：咽痛2天，伴发热1天。
现病史：2天前劳累后出现咽痛，吞咽时加重，今日发热T 38.5℃。
既往史：无。
过敏史：无。
查体：咽部充血，双侧扁桃体Ⅱ°肿大，未见脓点。
诊断：急性咽炎。
用药：
1. 阿莫西林
2. 板蓝根冲剂 1袋 口服 每日三次
3. 维C银翘片 2片 口服 每日三次
复诊：3天后复诊，如高热不退随诊。
身份证510104198507223456`,
  },
  {
    patientIdx: 0,
    visitDate: '2026-05-20',
    sourceType: 'text' as const,
    text: `张秀兰 女 72岁
主诉：头晕1天。
现病史：今日晨起头晕，自测血压145/90mmHg。
既往史：高血压。
过敏史：青霉素过敏。
诊断：高血压复诊。
用药：硝苯地平缓释片 20mg bid。
复诊：一月后复诊。`,
  },
];

export async function seedIfEmpty(): Promise<void> {
  await getDb();
  const patientCount = query<{ count: number }>('SELECT COUNT(*) as count FROM patients')[0].count;
  if (patientCount > 0) return;

  const patientIds: string[] = [];
  for (const p of SAMPLE_PATIENTS) {
    const id = nanoid();
    patientIds.push(id);
    run(
      'INSERT INTO patients (id, name, id_card_raw, phone_raw, gender, age) VALUES (?, ?, ?, ?, ?, ?)',
      [id, p.name, p.idCard, p.phone, p.gender, p.age],
    );
  }

  for (const r of SAMPLE_RECORDS) {
    const recordId = nanoid();
    const patientId = patientIds[r.patientIdx];
    run(
      'INSERT INTO medical_records (id, patient_id, visit_date, source_type, source_content, status) VALUES (?, ?, ?, ?, ?, ?)',
      [recordId, patientId, r.visitDate, r.sourceType, r.text, 'confirmed'],
    );

    const fields = extractFromText(r.text, recordId);
    for (const f of fields) {
      run(
        'INSERT INTO extraction_fields (id, record_id, field_type, value, confidence, evidence_json, warnings_json, original_raw) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          f.id,
          recordId,
          f.fieldType,
          f.value,
          f.confidence,
          JSON.stringify(f.evidence),
          JSON.stringify(f.warnings),
          f.originalRaw || null,
        ],
      );
    }

    if (r.patientIdx === 2) {
      run(
        'INSERT INTO revision_history (id, record_id, field_type, old_value, new_value, operator, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          nanoid(),
          recordId,
          'allergy',
          '？',
          '无药物过敏史',
          '录入护士-王琳',
          '原字迹不清，电话确认患者无过敏史',
        ],
      );
    }
    if (r.patientIdx === 4) {
      run(
        'INSERT INTO revision_history (id, record_id, field_type, old_value, new_value, operator, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          nanoid(),
          recordId,
          'medication',
          '阿莫西林',
          '阿莫西林 0.5g 口服 每日三次 共5天',
          '录入护士-李娜',
          '原OCR漏识别剂量与用法',
        ],
      );
      run(
        'INSERT INTO qa_reviews (id, revision_id, reviewer, result, comment) VALUES (?, ?, ?, ?, ?)',
        [nanoid(), 'temp', '质控护士-赵敏', 'pass', '修正合理，符合病历原意'],
      );
    }
  }
}
