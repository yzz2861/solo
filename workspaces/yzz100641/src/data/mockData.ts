import { HelpRequest, ReferralRecord } from '../types';
import { gradeText } from '../services/grading';
import { generateId } from '../utils/text';

const mockContents = [
  {
    content: '最近压力好大，每天都失眠，躺在床上脑子停不下来，想着学业想着未来，有时候真的觉得活着没什么意思，不知道还能撑多久。',
    submitTimeOffset: -10,
  },
  {
    content: '我真的不想活了，昨天已经买好了安眠药，想结束这一切。学习压力太大了，考试考不好，父母也不理解我，我觉得自己是个失败者。',
    submitTimeOffset: -30,
  },
  {
    content: '宿舍里的矛盾越来越严重，室友每天晚上打游戏到凌晨三四点，声音很大，我根本没法休息，跟他说了好几次都不听，我实在受不了了。',
    submitTimeOffset: -60,
  },
  {
    content: '最近胸口总是闷得慌，有时候会突然心跳加速，呼吸困难，有点害怕，不知道是不是心脏有问题。',
    submitTimeOffset: -120,
  },
  {
    content: '我同学说他最近心情很不好，经常一个人发呆，也不跟别人说话，我有点担心他，但不知道该怎么帮他。',
    submitTimeOffset: -180,
  },
  {
    content: '哈哈哈哈这个信箱真的存在吗？我就是来试试能不能发成功，没有别的事情，不用回复我。',
    submitTimeOffset: -240,
  },
  {
    content: '这学期的课程太难了，特别是高数和物理，完全听不懂，期中考试考得很差，担心会挂科，压力很大。',
    submitTimeOffset: -300,
  },
  {
    content: '最近情绪一直很低落，对什么都提不起兴趣，以前喜欢的事情现在也不想做了，经常一个人偷偷哭，觉得很孤独。',
    submitTimeOffset: -360,
  },
  {
    content: '想咨询一下学校的奖学金评定标准是怎样的？需要满足什么条件才能申请？',
    submitTimeOffset: -420,
  },
  {
    content: '高一2班的李明同学最近表现怎么样？我是他的家长，想了解一下他在学校的情况。',
    submitTimeOffset: -480,
  },
  {
    content: '食堂的饭菜最近越来越难吃了，而且价格还涨了，希望学校能改善一下。',
    submitTimeOffset: -540,
  },
  {
    content: '有人在校园里欺负我，他们总是故意找我麻烦，抢我的东西，还威胁我不许告诉老师，我很害怕。',
    submitTimeOffset: -600,
  },
  {
    content: '我感觉自己好像有强迫症，总是反复检查门有没有锁好，手洗了一遍又一遍还是觉得脏，这让我很痛苦。',
    submitTimeOffset: -660,
  },
  {
    content: '和女朋友分手了，心里很难受，吃不下饭也睡不着觉，不知道该怎么走出来。',
    submitTimeOffset: -720,
  },
  {
    content: '内容太短',
    submitTimeOffset: -780,
  },
];

export function generateMockData(): { requests: HelpRequest[]; referrals: ReferralRecord[] } {
  const now = new Date();
  const requests: HelpRequest[] = [];
  
  mockContents.forEach((mock, index) => {
    const submitTime = new Date(now.getTime() + mock.submitTimeOffset * 60000).toISOString();
    const gradingResult = gradeText(mock.content);
    
    const request: HelpRequest = {
      id: generateId(),
      content: mock.content,
      submitTime,
      source: 'batch',
      status: index < 10 ? 'graded' : (index < 13 ? 'confirmed' : 'closed'),
      gradingResult,
      confirmedLevel: index >= 10 && index < 13 ? gradingResult.level : undefined,
      confirmedBy: index >= 10 && index < 13 ? '王老师' : undefined,
      confirmedAt: index >= 10 && index < 13 
        ? new Date(now.getTime() + (mock.submitTimeOffset + 5) * 60000).toISOString() 
        : undefined,
      processRemark: index >= 13 ? '已电话联系学生，情况稳定，持续关注中' : undefined,
      createdAt: submitTime,
      updatedAt: submitTime,
    };
    
    requests.push(request);
  });
  
  const referrals: ReferralRecord[] = [
    {
      id: generateId(),
      requestId: requests[1].id,
      fromRole: '王老师',
      toRole: '张老师（心理老师）',
      referralType: 'psychology',
      reason: '严重自杀倾向，需紧急介入',
      status: 'completed',
      createdAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 60000).toISOString(),
      handledBy: '张老师',
      handledAt: new Date(now.getTime() - 20 * 60000).toISOString(),
      handleRemark: '已联系学生本人及家长，正在进行心理干预',
    },
    {
      id: generateId(),
      requestId: requests[2].id,
      fromRole: '王老师',
      toRole: '刘老师（高一2班班主任）',
      referralType: 'headteacher',
      reason: '宿舍矛盾需要协调处理',
      status: 'accepted',
      createdAt: new Date(now.getTime() - 50 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
      handledBy: '刘老师',
      handledAt: new Date(now.getTime() - 45 * 60000).toISOString(),
      handleRemark: '已了解情况，本周内协调宿舍调整',
    },
    {
      id: generateId(),
      requestId: requests[11].id,
      fromRole: '王老师',
      toRole: '陈老师（高一3班班主任）',
      referralType: 'headteacher',
      reason: '校园霸凌事件，需严肃处理',
      status: 'pending',
      createdAt: new Date(now.getTime() - 580 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 580 * 60000).toISOString(),
    },
  ];
  
  return { requests, referrals };
}

export function initializeMockData(): void {
  const existingData = localStorage.getItem('campus_help_requests');
  if (!existingData || JSON.parse(existingData).length === 0) {
    const { requests, referrals } = generateMockData();
    localStorage.setItem('campus_help_requests', JSON.stringify(requests));
    localStorage.setItem('campus_help_referrals', JSON.stringify(referrals));
    localStorage.setItem('campus_help_current_user', '王老师');
  }
}
