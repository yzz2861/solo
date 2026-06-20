const { initDatabase, run, all, get } = require('../database');

const SAMPLE_CUSTOMERS = [
  { name: '张伟', company: '科技创新有限公司', contact: '13800138001' },
  { name: '李娜', company: '未来科技集团', contact: '13900139002' },
  { name: '王强', company: '智慧数据股份', contact: '13700137003' },
];

const SAMPLE_OPPORTUNITIES = [
  { customer_idx: 0, name: '企业SaaS系统采购项目', status: 'active', amount: 280000 },
  { customer_idx: 1, name: '智能客服系统升级', status: 'active', amount: 150000 },
  { customer_idx: 2, name: '数据分析平台建设', status: 'negotiating', amount: 420000 },
];

const SAMPLE_CHATS = [
  {
    opportunity_idx: 0,
    salesperson: '销售-小陈',
    source: '微信',
    content: `2024-01-15 09:30:00 销售-小陈：张总您好，关于咱们的SaaS系统采购项目，我这边给您整理一下之前沟通的内容哈
2024-01-15 09:31:00 客户-张伟：好的，你说
2024-01-15 09:32:00 销售-小陈：首先是价格方面，原价是32万一年，我这边申请到了88折优惠，折后是281600元
2024-01-15 09:33:00 销售-小陈：另外赠送您价值2万元的实施服务和一年的免费上门培训
2024-01-15 09:34:00 客户-张伟：88折啊，能不能再优惠点？85折可以吗？
2024-01-15 09:35:00 销售-小陈：张总，88折已经是我权限内最大的优惠了，85折可能需要向经理申请一下
2024-01-15 09:36:00 销售-小陈：不过如果您这边能在月底前签约的话，我可以再争取送您3个月的免费使用期
2024-01-15 09:37:00 客户-张伟：那交付时间呢？我们希望能尽快上线
2024-01-15 09:38:00 销售-小陈：签约后15个工作日内可以完成部署和上线
2024-01-15 09:39:00 销售-小陈：质保期是1年，期间免费维修和升级，还有7x24小时的技术支持
2024-01-15 09:40:00 销售-小陈：对了，需要确认一下你们的服务器是用我们的云服务还是自己部署？
2024-01-15 09:41:00 客户-张伟：我们自己有机房，用自己的服务器吧
2024-01-15 09:42:00 销售-小陈：好的，那我调整一下方案。还有什么其他需求吗？
2024-01-15 09:43:00 客户-张伟：你刚才说的赠送2万的实施服务，具体包含什么内容？
2024-01-15 09:44:00 销售-小陈：您是说赠送的实施服务吗？包含需求调研、系统配置、数据迁移和用户培训
2024-01-15 09:45:00 销售-小陈：对了张总，可能还需要你们提供一下具体的用户数量和权限需求
2024-01-15 09:46:00 客户-张伟：好的，我整理一下发给你。这个价格应该还可以再谈吧？😊
2024-01-15 09:47:00 销售-小陈：[语音转文字] 张总您放心，我一定给您争取最好的价格
`
  },
  {
    opportunity_idx: 1,
    salesperson: '销售-小李',
    source: '企业微信',
    content: `2024-01-16 14:00:00 销售-小李：李总，关于智能客服系统的升级方案，我再和您确认一下
2024-01-16 14:01:00 客户-李娜：好的
2024-01-16 14:02:00 销售-小李：升级费用是15万，包含新版本license、数据迁移和3个月的并行运行支持
2024-01-16 14:03:00 销售-小李：我们还赠送价值5000元的智能语音识别包
2024-01-16 14:04:00 客户-李娜：并行运行3个月不够吧，万一出问题怎么办？
2024-01-16 14:05:00 销售-小李：李总您放心，我们可以免费延长到6个月的并行运行
2024-01-16 14:06:00 销售-小李：另外质保期2年，期间免费升级和维护
2024-01-16 14:07:00 客户-李娜：交付时间呢？我们Q2要上线
2024-01-16 14:08:00 销售-小李：预计2个月内可以完成升级和切换，大概4月初可以上线
2024-01-16 14:09:00 销售-小李：不过需要确认你们现有系统的版本号和数据量
2024-01-16 14:10:00 客户-李娜：行，我让技术整理一下给你。对了，你们的实施团队是原厂的还是外包的？
2024-01-16 14:11:00 销售-小李：都是原厂的实施顾问，经验都在3年以上，您放心
2024-01-16 14:12:00 销售-小李：大概应该可以在3月底完成，4月初正式上线没问题
`
  },
  {
    opportunity_idx: 2,
    salesperson: '销售-小王',
    source: '钉钉',
    content: `2024-01-17 10:00:00 销售-小王：王总，数据分析平台的报价我整理好了
2024-01-17 10:01:00 客户-王强：发过来看看
2024-01-17 10:02:00 销售-小王：平台总价45万，我给您申请到93折，折后418500元
2024-01-17 10:03:00 销售-小王：赠送价值3万的高级分析模块和2次高管数据培训
2024-01-17 10:04:00 客户-王强：42万还是有点超预算，40万能不能做？
2024-01-17 10:05:00 销售-小王：王总，40万确实有点困难，我尽量争取看看
2024-01-17 10:06:00 销售-小王：如果价格实在有压力，我们可以先上核心模块，后续再扩展
2024-01-17 10:07:00 客户-王强：不行，我们要一次性上全。交付时间呢？
2024-01-17 10:08:00 销售-小王：签约后3个月内交付，也就是大概4月底可以上线使用
2024-01-17 10:09:00 销售-小王：售后是3年质保，首年免费上门服务，之后每年上门2次
2024-01-17 10:10:00 销售-小王：需要确认一下你们的数据源情况，是哪些系统的数据需要接入？
2024-01-17 10:11:00 客户-王强：主要是ERP、CRM和OA系统的数据
2024-01-17 10:12:00 销售-小王：好的，这些我们都有标准接口。另外数据安全方面你们有什么特殊要求吗？
2024-01-17 10:13:00 客户-王强：数据不能出我们的内网，所有分析都要在本地完成
2024-01-17 10:14:00 销售-小王：明白，我们支持本地私有化部署，数据完全不出境。这个我可以在合同里明确
2024-01-17 10:15:00 销售-小王：对了，如果你们能在春节前签约，我还可以争取多送半年的免费维护期
`
  },
];

async function initSampleData() {
  await initDatabase();

  const customerIds = [];
  for (const c of SAMPLE_CUSTOMERS) {
    const res = await run(
      'INSERT INTO customers (name, company, contact) VALUES (?, ?, ?)',
      [c.name, c.company, c.contact]
    );
    customerIds.push(res.lastID);
  }

  const opportunityIds = [];
  for (const o of SAMPLE_OPPORTUNITIES) {
    const res = await run(
      'INSERT INTO opportunities (customer_id, name, status, amount) VALUES (?, ?, ?, ?)',
      [customerIds[o.customer_idx], o.name, o.status, o.amount]
    );
    opportunityIds.push(res.lastID);
  }

  for (const chat of SAMPLE_CHATS) {
    const opportunityId = opportunityIds[chat.opportunity_idx];
    const chatRes = await run(
      'INSERT INTO chats (opportunity_id, salesperson, source, raw_content) VALUES (?, ?, ?, ?)',
      [opportunityId, chat.salesperson, chat.source, chat.content]
    );
    const chatId = chatRes.lastID;

    const lines = chat.content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2})\s+([^：:]+?)[：:]\s*(.+)$/);
      if (match) {
        const [, timestamp, sender, content] = match;
        const msgType = /\[语音\]|\[语音转文字\]/.test(content) ? 'voice' : 'text';
        await run(
          'INSERT INTO chat_messages (chat_id, sender, content, timestamp, message_type) VALUES (?, ?, ?, ?, ?)',
          [chatId, sender.trim(), content.trim(), timestamp, msgType]
        );
      }
    }
  }

  console.log('Sample data initialized successfully!');
  console.log(`Created ${SAMPLE_CUSTOMERS.length} customers, ${SAMPLE_OPPORTUNITIES.length} opportunities, ${SAMPLE_CHATS.length} chats`);
}

if (require.main === module) {
  initSampleData().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { initSampleData };
