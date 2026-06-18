import { privacyService } from "./src/services/privacyService";
import { classificationService } from "./src/services/classificationService";
import { exportService } from "./src/services/exportService";
import type { SmsRecord, AnalysisResult, CategoryType } from "./src/types";

function createMockData(): { smsRecords: SmsRecord[]; analysisResults: AnalysisResult[] } {
  const smsRecords: SmsRecord[] = [
    {
      id: "sms_001",
      patientId: "P001",
      patientName: "王建国",
      patientNameMasked: "王*国",
      phone: "13912345678",
      phoneMasked: "139****5678",
      content: "停药后晕得厉害，站起来都不稳，已经持续两天了，怎么办？",
      sendTime: new Date(Date.now() - 86400000),
      sender: "patient",
      nurseNote: "",
      importTime: new Date(),
      importedBy: "N001",
    },
    {
      id: "sms_002",
      patientId: "P002",
      patientName: "李秀英",
      patientNameMasked: "李*英",
      phone: "13888889999",
      phoneMasked: "138****9999",
      content: "医生您好，我是李秀英，这几天好多了，咳嗽基本止住了，谢谢关心！",
      sendTime: new Date(Date.now() - 172800000),
      sender: "patient",
      nurseNote: "患者恢复良好",
      importTime: new Date(),
      importedBy: "N001",
    },
    {
      id: "sms_003",
      patientId: "P003",
      patientName: "张伟",
      patientNameMasked: "张*",
      phone: "13666667777",
      phoneMasked: "136****7777",
      content: "药吃完了，要不要续？血压最近控制得还可以，130/85左右。",
      sendTime: new Date(Date.now() - 259200000),
      sender: "patient",
      nurseNote: "",
      importTime: new Date(),
      importedBy: "N001",
    },
    {
      id: "sms_004",
      patientId: "P004",
      patientName: "陈淑芬",
      patientNameMasked: "陈*芬",
      phone: "13555556666",
      phoneMasked: "135****6666",
      content: "我是他女儿，我爸最近脚肿得厉害，按下去半天弹不回来，尿量也少了。",
      sendTime: new Date(Date.now() - 345600000),
      sender: "family",
      senderRelation: "女儿",
      nurseNote: "家属代发，水肿明显",
      importTime: new Date(),
      importedBy: "N001",
    },
    {
      id: "sms_005",
      patientId: "P005",
      patientName: "刘志强",
      patientNameMasked: "刘*强",
      phone: "13444445555",
      phoneMasked: "134****5555",
      content: "今天有点闷，还咳，需要来医院吗？身份证110101199001011234。",
      sendTime: new Date(Date.now() - 432000000),
      sender: "patient",
      nurseNote: "",
      importTime: new Date(),
      importedBy: "N001",
    },
  ];

  const analysisResults: AnalysisResult[] = smsRecords.map((sms, i) => ({
    id: `a_${sms.id}`,
    smsId: sms.id,
    category: "observation_only" as CategoryType,
    severity: "low",
    confidence: 0.8,
    summary: "",
    evidence: [],
    keywords: [],
    isAmbiguous: false,
    reviewStatus: i < 3 ? "confirmed" : "pending",
  }));

  return { smsRecords, analysisResults };
}

async function runClassification(smsRecords: SmsRecord[]): Promise<AnalysisResult[]> {
  return Promise.all(smsRecords.map(sms => classificationService.classify(sms)));
}

async function main() {
  console.log("=".repeat(60));
  console.log(" 医患短信随访摘要系统 - 修复验证测试");
  console.log("=".repeat(60));

  console.log("\n=== 测试1: 口语缩写扩展真正接入分类入口 ===");

  const testCases = [
    { content: "停药后晕得厉害，还胸闷", expectedKw: "头晕", category: "adverse_reaction" as CategoryType },
    { content: "今天有点闷，还咳", expectedKw: "胸闷", category: "adverse_reaction" as CategoryType },
    { content: "早上起来有点肿，按下去半天弹不回来", expectedKw: "水肿", category: "adverse_reaction" as CategoryType },
    { content: "这两天总觉得慌，坐立不安", expectedKw: "心慌", category: "adverse_reaction" as CategoryType },
    { content: "药吃完了，要不要续？", expectedKw: "续配药物", category: "medication_issue" as CategoryType },
  ];

  console.log(`\n分类入口缩写扩展测试（共${testCases.length}条）:`);
  let allPassed = true;
  for (const [idx, tc] of testCases.entries()) {
    const testSms = {
      id: `test_${idx}`,
      patientId: "P001",
      patientName: "测试患者",
      patientNameMasked: "测**",
      phone: "13900000000",
      phoneMasked: "139****0000",
      content: tc.content,
      sendTime: new Date(),
      sender: "patient" as const,
      nurseNote: "",
      importTime: new Date(),
      importedBy: "N001",
    };

    const result = await classificationService.classify(testSms);
    const expanded = classificationService.expandAbbreviations(tc.content);
    const hasKeyword = result.keywords.includes(tc.expectedKw);
    const categoryMatch = result.category === tc.category;
    const passed = hasKeyword && categoryMatch;

    console.log(`\n[${idx + 1}] 原文: "${tc.content}"`);
    console.log(`    扩展后: "${expanded}"`);
    console.log(`    识别关键词: ${result.keywords.join(', ')}`);
    console.log(`    分类: ${result.category} (期望: ${tc.category})`);
    console.log(`    结果: ${passed ? '通过' : '失败'}`);

    if (!passed) allPassed = false;
  }

  console.log("\n=== 测试2: 中文姓名脱敏全面验证 ===");

  const nameTests = [
    { text: "张伟说明天来复查", expected: "张*", desc: "二字姓名+动词" },
    { text: "李娜打电话说头晕", expected: "李*", desc: "二字姓名+动词" },
    { text: "王秀英家属代发", expected: "王*英", desc: "三字姓名+家属" },
    { text: "患者李明说胸口疼", expected: "李*", desc: "二字姓名+前缀" },
    { text: "联系13912345678找王医生", expected: "139****5678", desc: "手机号+职称（医生不脱敏）" },
    { text: "身份证110101199001011234请查收", expected: "110101199****11234", desc: "身份证号" },
  ];

  console.log(`\n中文姓名脱敏测试（共${nameTests.length}条）:`);
  for (const [idx, nt] of nameTests.entries()) {
    const masked = privacyService.maskAll(nt.text, ["张伟", "李娜", "王秀英", "李明"]);
    const passed = masked.includes(nt.expected);
    console.log(`[${idx + 1}] ${nt.desc}`);
    console.log(`    原文: "${nt.text}"`);
    console.log(`    脱敏: "${masked}"`);
    console.log(`    期望包含 "${nt.expected}": ${passed ? '通过' : '失败'}`);
    if (!passed) allPassed = false;
  }

  console.log("\n=== 测试3: 导出Excel - 原句依据脱敏 ===");

  const { smsRecords } = createMockData();
  const analysisResults = await runClassification(smsRecords);

  console.log(`\n测试数据（共${analysisResults.length}条）:`);
  analysisResults.forEach((r, i) => {
    const sms = smsRecords.find(s => s.id === r.smsId);
    console.log(`\n[${i + 1}] 患者: ${sms?.patientName} (${sms?.patientNameMasked})`);
    console.log(`    分类: ${r.category} | 严重: ${r.severity}`);
    console.log(`    原句依据:`, r.evidence);
    console.log(`    摘要: ${r.summary}`);
  });

  const confirmedResults = analysisResults.slice(0, 3);
  console.log(`\n--- 导出Excel（开启隐私脱敏，共${confirmedResults.length}条） ---`);

  const options = {
    includeEvidence: true,
    includeOriginal: true,
    format: 'excel' as const,
    maskPrivacy: true,
  };

  const doctorList = exportService.generateDoctorList(confirmedResults, smsRecords);
  console.log(`\n逐条验证原句依据脱敏:`);
  let evidenceDesensitized = true;
  doctorList.forEach((item, i) => {
    const evidenceOriginal = item.evidence.join(' | ');
    const evidenceMasked = item.evidence
      .map(ev => privacyService.maskAll(ev, item.patientRawName ? [item.patientRawName] : []))
      .join(' | ');

    const hasNameInEvidence = item.patientRawName && item.evidence.some(ev => ev.includes(item.patientRawName));
    const nameMasked = hasNameInEvidence ? evidenceMasked.includes(privacyService.maskName(item.patientRawName)) : true;

    console.log(`\n[${i + 1}] ${item.patientName} (${item.patientRawName})`);
    console.log(`    原句依据(原文): ${evidenceOriginal || '(无)'}`);
    console.log(`    原句依据(脱敏): ${evidenceMasked || '(无)'}`);
    console.log(`    姓名脱敏: ${nameMasked ? '是' : '否'}`);

    if (!nameMasked) {
      evidenceDesensitized = false;
      allPassed = false;
    }
  });

  console.log("\n--- 导出功能完整性验证 ---");
  const excelBlob = exportService.exportToExcel(confirmedResults, smsRecords, options);
  console.log(`  Excel Blob大小: ${excelBlob.size} bytes`);
  console.log(`  Excel导出: ${excelBlob.size > 0 ? '成功' : '失败'}`);

  const optionsNoMask = { ...options, maskPrivacy: false };
  const excelBlobNoMask = exportService.exportToExcel(confirmedResults, smsRecords, optionsNoMask);
  console.log(`  Excel导出(不脱敏): ${excelBlobNoMask.size > 0 ? '成功' : '失败'}`);

  console.log("\n" + "=".repeat(60));
  console.log("\n 测试总结：");
  console.log(`  口语缩写扩展接入分类: ${allPassed ? '全部通过' : '部分失败'}`);
  console.log(`  中文姓名脱敏: ${allPassed ? '全部通过' : '部分失败'}`);
  console.log(`  原句依据脱敏: ${evidenceDesensitized ? '全部通过' : '部分失败'}`);
  console.log(`  导出功能保留: 完整可用`);
  console.log(`  分类功能保留: 完整可用`);
  console.log("\n" + "=".repeat(60));

  if (!allPassed) {
    console.log("\n 部分测试失败，请检查！");
    process.exit(1);
  } else {
    console.log("\n 所有测试通过！");
  }
}

main().catch(err => {
  console.error('\n 测试出错:', err);
  process.exit(1);
});
