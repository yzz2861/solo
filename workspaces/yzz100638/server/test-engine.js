const CompletionEngine = require('./engine/completionEngine');

const engine = new CompletionEngine();

const testCases = [
  {
    name: '基础测试：右前剐蹭，对方全责',
    description: '右前剐蹭，对方全责',
    photoNotes: ['右前保险杠刮花', '对方车辆左后刮擦'],
    context: {}
  },
  {
    name: '完整信息测试',
    description: '2024年1月15日14:30，在中关村大街与知春路交叉口，我由南向北直行，对方由东向西左转，发生碰撞，我车右前保险杠、右前大灯损坏，对方全责，已报警。',
    photoNotes: [
      '远景：两车在路口，对方车头朝南',
      '近景：我方右前与对方左后接触',
      '细节：右前大灯破碎，保险杠凹陷',
      '刹车痕：对方刹车痕3米'
    ],
    context: {}
  },
  {
    name: '模糊方位词测试',
    description: '前面的车突然刹车，我追尾了对方，旁边有车变道',
    photoNotes: ['我车前部撞到对方后部'],
    context: {}
  },
  {
    name: '多车事故测试',
    description: '三车连环追尾，我是中间车，前车急刹，后车追尾我，我又撞上前车',
    photoNotes: ['我车前部受损', '我车后部受损', '前车后部受损', '后车前部受损'],
    context: {}
  },
  {
    name: '文字照片冲突测试',
    description: '右前保险杠剐蹭',
    photoNotes: ['左前大灯破碎', '左前保险杠凹陷'],
    context: {}
  }
];

async function runTests() {
  console.log('🚗 车险查勘描述补全引擎测试\n');
  
  for (const testCase of testCases) {
    console.log(`📋 测试用例: ${testCase.name}`);
    console.log(`📝 原始描述: ${testCase.description}`);
    console.log(`🖼️  照片备注: ${testCase.photoNotes.join('; ')}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await engine.complete(
        testCase.description, 
        testCase.photoNotes, 
        testCase.context
      );
      
      console.log(`✅ 置信度评分: ${(result.confidenceScore * 100).toFixed(1)}%`);
      console.log(`📅 事故时间: ${result.accidentTime.date || '未提取'} ${result.accidentTime.time || ''}`);
      console.log(`📍 事故地点: ${result.accidentLocation.road || ''}${result.accidentLocation.intersection || ''}`);
      console.log(`↗️  行驶方向: 我方=${result.accidentDirection.ourDirection || '未明确'}, 对方=${result.accidentDirection.otherDirection || '未明确'}`);
      
      console.log(`🚙 损失部位 (${result.vehicleParts.length}处):`);
      result.vehicleParts.forEach(p => {
        const mark = p.isEstimated ? ' ⚠️(推测)' : '';
        const source = p.source !== 'description' ? ` [${p.source}]` : '';
        console.log(`   - ${p.name}${mark}${source}`);
      });
      
      console.log(`⚖️  责任判断: ${result.liabilityClue.liability}`);
      console.log(`   ${result.liabilityClue.clue}`);
      
      console.log(`📄 标准描述:`);
      console.log(`   ${result.standardDescription}`);
      
      if (result.lowConfidenceFlags.length > 0) {
        console.log(`⚠️  低置信标记 (${result.lowConfidenceFlags.length}处):`);
        result.lowConfidenceFlags.forEach(f => {
          const severityIcon = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🟢';
          console.log(`   ${severityIcon} [${f.type}] ${f.message}`);
          console.log(`      💡 ${f.suggestion}`);
        });
      }
      
      if (result.missingMaterials.length > 0) {
        console.log(`📋 缺材料提醒 (${result.missingMaterials.length}项):`);
        result.missingMaterials.forEach(m => {
          console.log(`   - ❌ ${m.name}: ${m.reason}`);
        });
      }
      
      if (result.reshootList.length > 0) {
        console.log(`📷 补拍清单 (${result.reshootList.length}项):`);
        result.reshootList.forEach(r => {
          console.log(`   - 📸 ${r.partName || r.shotName}: ${r.reason}`);
        });
      }
      
      if (result.trainingNotes.length > 0) {
        console.log(`📚 培训建议:`);
        result.trainingNotes.forEach(note => {
          console.log(`   改进点:`);
          note.improvements.forEach(imp => console.log(`     • ${imp}`));
          console.log(`   规范示例: ${note.example}`);
        });
      }
      
    } catch (err) {
      console.error(`❌ 测试失败: ${err.message}`);
    }
    
    console.log('═'.repeat(60));
    console.log('');
  }
  
  console.log('✅ 所有测试用例执行完成！');
}

runTests().catch(err => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
