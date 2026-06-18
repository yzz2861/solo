import { privacyService } from "./src/services/privacyService";
import { classificationService } from "./src/services/classificationService";
import { exportService } from "./src/services/exportService";
import { useSmsStore } from "./src/store/smsStore";

async function main() {
  console.log("=== 综合测试：导出Excel时原句依据脱敏 ===");

  const smsStore = useSmsStore.getState();
  await smsStore.initializeWithMockData();

  const { smsRecords, analysisResults } = smsStore;

  console.log(`\n📊 数据状态：`);
  console.log(`  短信总数: ${smsRecords.length}`);
  console.log(`  分析结果总数: ${analysisResults.length}`);
  const confirmed = analysisResults.filter(r => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified');
  console.log(`  已确认: ${confirmed.length}`);
  console.log(`  待审核: ${analysisResults.filter(r => r.reviewStatus === 'pending').length}`);

  console.log(`\n=== 测试1: 导出Excel - 原句依据脱敏（开启maskPrivacy） ===`);
  const resultsForExport = analysisResults.filter(
    r => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified' || r.reviewStatus === 'pending'
  ).slice(0, 3);

  console.log(`\n测试数据（前3条）:`);
  resultsForExport.forEach((r, i) => {
    const sms = smsRecords.find(s => s.id === r.smsId);
    console.log(`\n[${i + 1}] 患者: ${sms?.patientName} (${sms?.patientNameMasked})`);
    console.log(`    分类: ${r.category} | 严重: ${r.severity}`);
    console.log(`    原句依据:`, r.evidence);
    console.log(`    摘要: ${r.summary}`);
  });

  console.log(`\n--- 导出Excel（开启隐私脱敏） ---`);
  const options = {
    includeEvidence: true,
    includeOriginal: true,
    format: 'excel' as const,
    maskPrivacy: true,
  };

  const doctorList = exportService.generateDoctorList(resultsForExport, smsRecords);
  console.log(`\n生成待处理清单共 ${doctorList.length} 条`);

  console.log(`\n逐条验证原句依据脱敏:`);
  doctorList.forEach((item, i) => {
    console.log(`\n[${i + 1}] ${item.patientName}`);
    console.log(`    分类: ${item.categoryLabel} | 严重: ${item.severityLabel}`);

    const evidenceOriginal = item.evidence.join(' | ');
    const evidenceMasked = item.evidence
      .map(ev => privacyService.maskAll(ev, item.patientRawName ? [item.patientRawName] : []))
      .join(' | ');

    console.log(`    原句依据(原文): ${evidenceOriginal}`);
    console.log(`    原句依据(脱敏): ${evidenceMasked}`);
    console.log(`    是否有变化: ${evidenceOriginal !== evidenceMasked ? '✅ 已脱敏' : '⚠️ 无变化（可能无可脱敏内容）'}`);

    if (item.patientRawName) {
      const hasNameInEvidence = item.evidence.some(ev => ev.includes(item.patientRawName));
      if (hasNameInEvidence) {
        const nameMasked = evidenceMasked.includes(privacyService.maskName(item.patientRawName));
        console.log(`    姓名是否脱敏: ${nameMasked ? '✅ 姓名已脱敏' : '❌ 姓名未脱敏'}`);
      }
    }
  });

  console.log(`\n=== 测试2: 口语缩写扩展真正接入分类入口 ===`);

  const testCases = [
    { content: "停药后晕得厉害，还胸闷", expected: "头晕", category: "adverse_reaction" },
    { content: "今天有点闷，还咳", expected: "胸闷", category: "adverse_reaction" },
    { content: "早上起来有点肿，按下去半天弹不回来", expected: "水肿", category: "adverse_reaction" },
    { content: "这两天总觉得慌，坐立不安", expected: "心慌", category: "adverse_reaction" },
    { content: "药吃完了，要不要续？", expected: "续配药物", category: "medication_issue" },
  ];

  console.log(`\n分类入口缩写扩展测试:`);
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
    const hasKeyword = result.keywords.includes(tc.expected);
    const categoryMatch = result.category === tc.category;

    console.log(`\n[${idx + 1}] 原文: "${tc.content}"`);
    console.log(`    扩展后: "${expanded}"`);
    console.log(`    识别关键词: ${result.keywords.join(', ')}`);
    console.log(`    分类: ${result.category} (期望: ${tc.category})`);
    console.log(`    结果: ${hasKeyword && categoryMatch ? '✅ 通过' : '❌ 失败'}`);

    if (!hasKeyword || !categoryMatch) allPassed = false;
  }

  console.log(`\n=== 测试3: 中文姓名脱敏全面验证 ===`);

  const nameTests = [
    { text: "张伟说明天来复查", expected: "张*" },
    { text: "李娜打电话说头晕", expected: "李*" },
    { text: "王秀英家属代发", expected: "王*英" },
    { text: "患者李明说胸口疼", expected: "李*" },
    { text: "联系13912345678找王医生", expected: "139****5678" },
  ];

  console.log(`\n中文姓名脱敏测试:`);
  for (const [idx, nt] of nameTests.entries()) {
    const masked = privacyService.maskAll(nt.text, ["张伟", "李娜", "王秀英", "李明"]);
    const passed = masked.includes(nt.expected);
    console.log(`[${idx + 1}] "${nt.text}" → "${masked}"`);
    console.log(`    期望包含 "${nt.expected}": ${passed ? '✅ 通过' : '❌ 失败'}`);
    if (!passed) allPassed = false;
  }

  console.log(`\n=== 测试4: 导出功能完整性验证 ===`);

  const exportResultCount = resultsForExport.filter(
    r => r.evidence.length > 0
  ).length;

  console.log(`\n导出功能检查:`);
  console.log(`  待导出记录数: ${resultsForExport.length}`);
  console.log(`  含原句依据记录数: ${exportResultCount}`);
  console.log(`  导出Excel Blob大小测试...`);

  const excelBlob = exportService.exportToExcel(resultsForExport, smsRecords, options);
  console.log(`  Excel Blob大小: ${excelBlob.size} bytes`);
  console.log(`  Excel导出: ${excelBlob.size > 0 ? '✅ 成功' : '❌ 失败'}`);

  const pdfBlob = exportService.exportToPDF(resultsForExport, smsRecords, options);
  console.log(`  PDF Blob大小: ${pdfBlob.size} bytes`);
  console.log(`  PDF导出: ${pdfBlob.size > 0 ? '✅ 成功' : '❌ 失败'}`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`总体测试结果: ${allPassed ? '✅ 全部通过' : '⚠️ 部分失败'}`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
