const classifier = require('./src/classifier');
const c = new classifier();

const testCases = [
  {
    name: '线下威胁-查地址+当面谈',
    input: '我已经通过你的手机号查到你家地址了，你最好今晚在家等着，我要跟你当面谈谈。',
    expected: { riskLevel: 'offline_threat', requiresReview: false }
  },
  {
    name: '线下威胁-查到住址',
    input: '查到你家地址了，你等着，我这就过去找你',
    expected: { riskLevel: 'offline_threat', requiresReview: false }
  },
  {
    name: '线下威胁-约当面',
    input: '敢不敢约个地方当面谈谈？我知道你公司在哪',
    expected: { riskLevel: 'offline_threat', requiresReview: false }
  },
  {
    name: '反讽-物流快',
    input: '呵呵，你们家的物流可真快啊，一周了还没发货，真是太棒了！下次还来买哦~',
    expected: { riskLevel: 'review_required', requiresReview: true }
  },
  {
    name: '反讽-服务好(反话标记)',
    input: '你的服务态度很好呢！让我等了三天终于回复我了，你可真厉害！（反话）',
    expected: { riskLevel: 'review_required', requiresReview: true }
  },
  {
    name: '反讽-真厉害',
    input: '可真厉害啊，等了这么久才回复，太感谢了！！',
    expected: { riskLevel: 'review_required', requiresReview: true }
  },
  {
    name: '自伤风险',
    input: '我不想活了，活着太累了，一了百了算了',
    expected: { riskLevel: 'self_harm', requiresReview: false }
  },
  {
    name: '普通吐槽',
    input: '这款产品一般般，性价比不是很高，希望可以改进',
    expected: { riskLevel: 'review_required' }
  },
  {
    name: '人身攻击-脏话',
    input: '你这个傻逼，会不会做事？废物一个',
    expected: { riskLevel: 'personal_attack', requiresReview: false }
  },
  {
    name: '方言脏话-上海话',
    input: '这个小赤佬商家真的是刚度，脑子瓦特了',
    expected: { riskLevel: 'personal_attack', requiresReview: false }
  }
];

let passed = 0;
let failed = 0;

console.log('=== 风险分类测试验证 ===\n');

testCases.forEach((tc, i) => {
  const result = c.classify({ content: tc.input, userId: 'test', timestamp: Date.now() });
  const riskLevelOk = result.riskLevel === tc.expected.riskLevel;
  const reviewOk = tc.expected.requiresReview === undefined || result.requiresReview === tc.expected.requiresReview;
  const testPassed = riskLevelOk && reviewOk;

  if (testPassed) {
    passed++;
    console.log(`✅ 测试 ${i+1}: ${tc.name}`);
  } else {
    failed++;
    console.log(`❌ 测试 ${i+1}: ${tc.name}`);
    console.log(`   输入: ${tc.input.slice(0, 60)}...`);
    console.log(`   期望: riskLevel=${tc.expected.riskLevel}, review=${tc.expected.requiresReview}`);
    console.log(`   实际: riskLevel=${result.riskLevel}, review=${result.requiresReview}, conf=${result.confidence}`);
  }

  if (result.triggers.length > 0) {
    console.log(`   触发: ${result.triggers.map(t => `「${t.text}」`).join(' ')}`);
  }
  if (result.analysis.sarcasm.detected) {
    console.log(`   😏 反讽检测: 是`);
  }
  console.log('');
});

console.log(`\n=== 测试结果: ${passed}/${testCases.length} 通过 ===`);
if (failed > 0) {
  console.log(`❌ 有 ${failed} 个测试失败`);
  process.exit(1);
} else {
  console.log('✅ 所有测试通过！');
  process.exit(0);
}
