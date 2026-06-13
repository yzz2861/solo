import type { InterviewRecord } from '@/types';

export function generateMockRecords(): InterviewRecord[] {
  const now = Date.now();

  const content1 = `整体感觉不错，候选人技术基础挺扎实的。

问了他关于"云原生订单系统"的项目经验，他说："我当时负责重构核心下单模块，用了3个月把响应时间从800ms降到200ms，QPS翻了3倍。"这块挺有东西。

不过感觉沟通表达不太稳，有时候说不清楚。技术深度还行，但是广度一般。

王总觉得他性格太内向了，不太适合带团队。不过我个人觉得还好。

数据库优化那块有经验，之前做过分库分表，带领5个人的团队完成了迁移。

整体来说有潜力，但是需要再看看。90后嘛，稳定性还需要观察。

候选人形象不错，穿着挺得体的。就是女孩子做后端开发，不知道能不能扛住压力。

问他最失败的项目，他说之前"智能推荐引擎"项目延期了，但是没说具体原因和自己的反思。这块需要再追问。`;

  const content2 = `候选人技术能力一般，感觉不太符合我们的要求。

项目经验比较少，只有2年。之前做的都是小系统，没接触过高并发场景。

我觉得这个候选人不行，基础太差了。连HashMap和ConcurrentHashMap的区别都说不清楚。

沟通还行，挺活泼的。就是学校不是985/211，学习能力可能有问题。

他说自己擅长Java并发编程，但让他写个单例模式都写错了。

不太建议录用，我不喜欢这种只会说不会做的风格。`;

  const content3 = `挺优秀的候选人，技术能力强，项目经验丰富。

主导过"用户增长平台"从0到1的搭建，日活从0做到500万，团队规模从2人扩展到12人。

解决过线上缓存击穿的问题，当时通过多级缓存方案，把DB请求量降低了80%。

沟通表达清晰，逻辑有条理。对技术有自己的思考，会主动做技术分享。

唯一的顾虑是跳槽稍频繁，3年换了3家公司，需要了解下具体原因。

候选人说："我离职主要是因为业务方向调整，不是个人原因。上次是公司被收购，核心团队被优化了。"

可以推进下一轮，重点考察稳定性和团队协作。`;

  const paragraphs1 = content1.split('\n').filter(p => p.trim().length > 0);
  const paragraphs2 = content2.split('\n').filter(p => p.trim().length > 0);
  const paragraphs3 = content3.split('\n').filter(p => p.trim().length > 0);

  return [
    {
      id: 'rec_demo_1',
      candidateName: '张明远',
      position: '高级后端工程师',
      round: 2,
      interviewerAlias: '李工',
      interviewDate: '2026-06-10',
      content: content1,
      paragraphs: paragraphs1,
      annotations: [],
      followUpQuestions: [],
      revisions: [],
      riskScore: 42,
      status: 'draft',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000,
    },
    {
      id: 'rec_demo_2',
      candidateName: '王思琪',
      position: 'Java开发工程师',
      round: 1,
      interviewerAlias: '张总',
      interviewDate: '2026-06-11',
      content: content2,
      paragraphs: paragraphs2,
      annotations: [],
      followUpQuestions: [],
      revisions: [],
      riskScore: 78,
      status: 'draft',
      createdAt: now - 86400000,
      updatedAt: now - 3600000,
    },
    {
      id: 'rec_demo_3',
      candidateName: '陈浩然',
      position: '技术专家',
      round: 3,
      interviewerAlias: '刘总监',
      interviewDate: '2026-06-12',
      content: content3,
      paragraphs: paragraphs3,
      annotations: [],
      followUpQuestions: [],
      revisions: [],
      riskScore: 15,
      status: 'confirmed',
      createdAt: now - 3600000 * 5,
      updatedAt: now - 3600000,
    },
  ];
}

export function getSampleInterviewContent(): string {
  return `整体感觉不错，候选人技术基础挺扎实的。

问了他关于"云原生订单系统"的项目经验，他说："我当时负责重构核心下单模块，用了3个月把响应时间从800ms降到200ms，QPS翻了3倍。"这块挺有东西。

不过感觉沟通表达不太稳，有时候说不清楚。技术深度还行，但是广度一般。

王总觉得他性格太内向了，不太适合带团队。不过我个人觉得还好。

数据库优化那块有经验，之前做过分库分表，带领5个人的团队完成了迁移。

整体来说有潜力，但是需要再看看。90后嘛，稳定性还需要观察。

候选人形象不错，穿着挺得体的。就是女孩子做后端开发，不知道能不能扛住压力。

问他最失败的项目，他说之前"智能推荐引擎"项目延期了，但是没说具体原因和自己的反思。这块需要再追问。`;
}
