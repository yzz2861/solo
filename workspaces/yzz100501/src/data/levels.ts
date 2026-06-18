import { Level } from '@/types';

export const defaultLevels: Level[] = [
  {
    id: 'level-acid-base',
    title: '酸碱实验安全',
    description: '学习酸碱操作的安全规范，掌握稀释、取用和洒液处理等关键技能。',
    category: 'acid-base',
    difficulty: 2,
    createdAt: Date.now(),
    steps: [
      {
        order: 1,
        scene: '你走进化学实验室，准备做酸碱中和实验。桌上摆着稀盐酸、氢氧化钠溶液和各种器材。你首先要做什么？',
        choices: [
          {
            id: 'ab1a',
            text: '直接拿试剂瓶开始实验',
            isCorrect: false,
            feedback: '没有佩戴防护装备就直接接触酸碱试剂，非常危险！',
            correctAction: '接触酸碱前必须先佩戴护目镜和手套，酸碱飞溅可能灼伤眼睛和皮肤。',
          },
          {
            id: 'ab1b',
            text: '先戴好护目镜和橡胶手套',
            isCorrect: true,
            feedback: '非常正确！做任何酸碱实验前，防护装备是第一位的。',
            correctAction: '佩戴护目镜和手套是酸碱实验的基本防护要求。',
          },
          {
            id: 'ab1c',
            text: '先闻一闻试剂的味道',
            isCorrect: false,
            feedback: '直接闻试剂非常危险！化学试剂的蒸气可能有毒或腐蚀性。',
            correctAction: '闻气味时应使用"扇闻法"——用手轻轻扇动，让少量气体飘向鼻子，绝不能直接靠近闻。',
          },
        ],
      },
      {
        order: 2,
        scene: '实验需要稀释浓硫酸。你拿起浓硫酸瓶和烧杯，准备操作。你会怎么做？',
        choices: [
          {
            id: 'ab2a',
            text: '把水倒进浓硫酸里',
            isCorrect: false,
            feedback: '这是极其危险的操作！水倒进浓酸会剧烈放热，导致酸液飞溅伤人。',
            correctAction: '正确做法是"酸入水"——将浓硫酸沿烧杯壁缓慢倒入水中，并不断搅拌散热。记住口诀：酸入水，沿壁慢倒，不断搅拌。',
          },
          {
            id: 'ab2b',
            text: '把浓硫酸沿壁缓慢倒入水中，边倒边搅拌',
            isCorrect: true,
            feedback: '完全正确！这就是"酸入水"的安全操作方法。',
            correctAction: '稀释浓酸时，始终是"酸入水"——将浓酸沿壁缓慢倒入水中，不断搅拌散热。',
          },
        ],
      },
      {
        order: 3,
        scene: '实验中你不小心把少量稀盐酸洒在了桌面上。你该怎么处理？',
        choices: [
          {
            id: 'ab3a',
            text: '用抹布直接擦掉',
            isCorrect: false,
            feedback: '用抹布直接擦酸液是错误做法，抹布会吸附酸液，可能腐蚀皮肤和桌面。',
            correctAction: '酸液洒出后应先用碳酸氢钠（小苏打）粉覆盖中和，再用湿抹布清理干净。',
          },
          {
            id: 'ab3b',
            text: '先用碳酸氢钠粉覆盖中和，再清理',
            isCorrect: true,
            feedback: '处理得当！酸液洒出必须先中和再清理，这是实验室基本安全操作。',
            correctAction: '酸液洒出应先用弱碱（碳酸氢钠）中和，确认不再反应后再清理。',
          },
          {
            id: 'ab3c',
            text: '不管它，等实验结束再说',
            isCorrect: false,
            feedback: '酸液留在桌面上会持续腐蚀桌面，还可能被其他人碰到，非常危险！',
            correctAction: '酸碱洒出必须立即处理。用碳酸氢钠中和酸液，用稀醋酸中和碱液，清理后才安全。',
          },
        ],
      },
      {
        order: 4,
        scene: '你想确认某瓶试剂的气味。正确的闻气味方式是什么？',
        choices: [
          {
            id: 'ab4a',
            text: '把鼻子凑近瓶口直接闻',
            isCorrect: false,
            feedback: '直接靠近瓶口闻气味非常危险！大量有害气体可能直接吸入体内。',
            correctAction: '必须使用"扇闻法"：用手在瓶口轻轻扇动，使少量气体飘向鼻子。保持瓶口远离面部。',
          },
          {
            id: 'ab4b',
            text: '用手扇闻，让少量气体飘向鼻子',
            isCorrect: true,
            feedback: '正确！扇闻法是化学实验室中安全闻气味的基本操作。',
            correctAction: '扇闻法——用手在瓶口轻轻扇动，使少量气体飘向鼻方，这是唯一安全的闻气味方式。',
          },
        ],
      },
    ],
  },
  {
    id: 'level-alcohol-lamp',
    title: '酒精灯使用安全',
    description: '学习酒精灯的正确点燃、使用和熄灭方法，避免火灾和烫伤事故。',
    category: 'alcohol-lamp',
    difficulty: 1,
    createdAt: Date.now(),
    steps: [
      {
        order: 1,
        scene: '你需要点燃酒精灯进行加热操作。桌上有一盏未点燃的酒精灯和一个打火机。你会怎么做？',
        choices: [
          {
            id: 'al1a',
            text: '用另一个燃着的酒精灯对接点燃',
            isCorrect: true,
            feedback: '正确！用燃着的酒精灯对接点燃是安全的方法。',
            correctAction: '点燃酒精灯应使用火柴或用另一盏燃着的酒精灯对接，严禁使用打火机直接点燃。',
          },
          {
            id: 'al1b',
            text: '用打火机直接点燃酒精灯',
            isCorrect: false,
            feedback: '打火机直接点火非常危险！酒精蒸气可能在灯口周围聚集，打火机的火焰可能引燃蒸气导致爆燃。',
            correctAction: '应使用火柴或用另一盏燃着的酒精灯对接点燃，禁止用打火机直接点燃酒精灯。',
          },
        ],
      },
      {
        order: 2,
        scene: '酒精灯已点燃，你注意到桌上的纸巾离酒精灯很近。你应该怎么做？',
        choices: [
          {
            id: 'al2a',
            text: '先把纸巾移远，清除火焰周围的可燃物',
            isCorrect: true,
            feedback: '安全意识很好！火焰周围必须保持干净整洁，远离可燃物。',
            correctAction: '酒精灯使用前和使用中，都应确保周围没有纸巾、书本等可燃物。',
          },
          {
            id: 'al2b',
            text: '纸巾离得不远，不影响实验',
            isCorrect: false,
            feedback: '纸巾是易燃物，即使看似不近，酒精灯的火焰也可能因为意外而引燃它！',
            correctAction: '酒精灯火焰周围必须清除所有可燃物（纸巾、书本、衣物等），保持至少30cm的安全距离。',
          },
        ],
      },
      {
        order: 3,
        scene: '实验结束了，你需要熄灭酒精灯。你会怎么做？',
        choices: [
          {
            id: 'al3a',
            text: '用嘴吹灭酒精灯',
            isCorrect: false,
            feedback: '用嘴吹灭酒精灯可能引起灯内酒精蒸气爆燃，造成严重事故！',
            correctAction: '必须用灯帽盖灭酒精灯。盖灭后要稍提起灯帽再盖一次，防止冷却后灯帽被吸住。',
          },
          {
            id: 'al3b',
            text: '用灯帽盖灭',
            isCorrect: true,
            feedback: '正确！用灯帽盖灭是唯一的正确熄灭方法。',
            correctAction: '用灯帽盖灭酒精灯，盖灭后稍提起再盖一次，防止冷却后灯帽吸紧。',
          },
        ],
      },
      {
        order: 4,
        scene: '你发现酒精灯里的酒精不多了，需要添加。正确的做法是什么？',
        choices: [
          {
            id: 'al4a',
            text: '直接往燃着的酒精灯里添加酒精',
            isCorrect: false,
            feedback: '往燃着的酒精灯中添加酒精极可能引燃灯外酒精，造成火灾！',
            correctAction: '必须先熄灭酒精灯，冷却后再用漏斗添加酒精，酒精量不超过灯体的2/3。',
          },
          {
            id: 'al4b',
            text: '先熄灭酒精灯，冷却后再用漏斗添加',
            isCorrect: true,
            feedback: '安全操作！添加酒精前必须先熄灭并冷却，使用漏斗防止洒出。',
            correctAction: '熄灭酒精灯→等待冷却→用漏斗添加酒精→酒精量不超过灯体2/3，不能太满也不能太少。',
          },
        ],
      },
    ],
  },
  {
    id: 'level-glassware',
    title: '玻璃仪器安全',
    description: '学习玻璃仪器的正确使用、清洗和处理破损的方法，防止割伤事故。',
    category: 'glassware',
    difficulty: 1,
    createdAt: Date.now(),
    steps: [
      {
        order: 1,
        scene: '实验前你需要检查玻璃仪器。你拿起一个烧杯，发现杯壁上有一条细小裂纹。你该怎么做？',
        choices: [
          {
            id: 'gw1a',
            text: '继续使用，裂纹很小不影响',
            isCorrect: false,
            feedback: '有裂纹的玻璃仪器在加热或受压时可能突然破裂，造成割伤或烫伤！',
            correctAction: '发现裂纹的玻璃仪器应立即停止使用，放到指定的破损仪器处，并向老师报告更换。',
          },
          {
            id: 'gw1b',
            text: '停止使用，放到破损仪器处并向老师报告',
            isCorrect: true,
            feedback: '正确！任何破损的玻璃仪器都不能继续使用，及时报告更换是安全的基本要求。',
            correctAction: '发现破损玻璃仪器立即停用，放到指定位置，向老师报告更换。',
          },
        ],
      },
      {
        order: 2,
        scene: '实验中你不小心打碎了一个试管，碎片散落在桌面上。你应该怎么做？',
        choices: [
          {
            id: 'gw2a',
            text: '用手捡起碎片扔掉',
            isCorrect: false,
            feedback: '用手直接捡碎片很容易被割伤！这是最常见的玻璃伤害原因。',
            correctAction: '碎玻璃不能用徒手捡！应使用扫帚和簸箕清扫，或用湿纸巾小心包裹拾起，放入指定的碎玻璃容器中。',
          },
          {
            id: 'gw2b',
            text: '先报告老师，用扫帚和簸箕清扫碎片',
            isCorrect: true,
            feedback: '处理得当！破碎玻璃必须用工具清理，不能徒手接触。',
            correctAction: '打碎玻璃仪器后：1.保持冷静不移动 2.报告老师 3.用扫帚/簸箕清扫 4.碎玻璃放入专用容器。',
          },
          {
            id: 'gw2c',
            text: '赶紧用手快速捡起来扔进垃圾桶',
            isCorrect: false,
            feedback: '不管多快，徒手捡碎玻璃都有极大的割伤风险！',
            correctAction: '碎玻璃必须用扫帚和簸箕清扫，或用湿纸巾包裹拾起。绝不能徒手接触碎玻璃！',
          },
        ],
      },
      {
        order: 3,
        scene: '同学在实验中不小心被碎玻璃割伤了手指，还在流血。你应该怎么做？',
        choices: [
          {
            id: 'gw3a',
            text: '继续做自己的实验，等下课再说',
            isCorrect: false,
            feedback: '同学受伤了还继续实验，既漠视他人安全，自己的操作也可能因此分心出错！',
            correctAction: '同学受伤应立即：1.停止手中实验 2.报告老师 3.协助同学到急救箱处处理伤口。安全第一，实验第二！',
          },
          {
            id: 'gw3b',
            text: '立即停止实验，报告老师并协助同学处理伤口',
            isCorrect: true,
            feedback: '非常好的安全意识！同学受伤时必须优先处理伤情，实验可以之后再做。',
            correctAction: '同学受伤时必须立即停止实验、报告老师、协助处理。安全永远比实验进度重要。',
          },
        ],
      },
    ],
  },
  {
    id: 'level-general',
    title: '综合实验安全',
    description: '综合考察实验安全意识，包括防护装备、应急处理和实验纪律等核心安全知识。',
    category: 'general',
    difficulty: 3,
    createdAt: Date.now(),
    steps: [
      {
        order: 1,
        scene: '进入化学实验室前，老师要求大家做好准备工作。以下哪个是正确的？',
        choices: [
          {
            id: 'gn1a',
            text: '把书包放在实验台上方便取用',
            isCorrect: false,
            feedback: '书包放在实验台上会占用操作空间，还可能被化学品污染或成为火险隐患！',
            correctAction: '书包等个人物品应放在实验室指定的存放区，实验台只能放实验需要的器材和试剂。',
          },
          {
            id: 'gn1b',
            text: '扎好长发，收起宽松衣袖，把书包放指定区域',
            isCorrect: true,
            feedback: '准备充分！长发、宽松衣物都可能碰到火焰或试剂，做好防护是安全实验的第一步。',
            correctAction: '进入实验室前：扎好长发、收起宽松衣袖、把个人物品放指定区域，做好防护准备。',
          },
        ],
      },
      {
        order: 2,
        scene: '实验过程中，你发现旁边的同学在偷偷用手机拍照发朋友圈。你该怎么做？',
        choices: [
          {
            id: 'gn2a',
            text: '提醒他注意安全，实验中不应分心',
            isCorrect: true,
            feedback: '好的安全伙伴！实验中分心使用手机极易导致操作失误和事故。',
            correctAction: '实验中应全神贯注，不使用手机等电子设备。分心操作是实验室事故的重要原因。',
          },
          {
            id: 'gn2b',
            text: '不管他，自己做好自己的就行',
            isCorrect: false,
            feedback: '同学的不安全行为也可能影响到你！实验室内每个人的安全都相互关联。',
            correctAction: '发现同学的不安全行为应友善提醒。实验室内一个人的失误可能危及所有人安全。',
          },
        ],
      },
      {
        order: 3,
        scene: '实验结束后，你需要清洗用过的玻璃仪器。正确的做法是什么？',
        choices: [
          {
            id: 'gn3a',
            text: '用水冲洗一下就好',
            isCorrect: false,
            feedback: '仅用水冲洗无法彻底去除化学残留，可能影响下次实验或造成危险反应！',
            correctAction: '应先用自来水刷洗，再用蒸馏水润洗2-3次。如有特殊试剂残留，需按老师指导用指定方法清洗。',
          },
          {
            id: 'gn3b',
            text: '先用自来水刷洗，再用蒸馏水润洗，按老师要求处理废液',
            isCorrect: true,
            feedback: '清洗规范！正确清洗仪器和正确处理废液都是实验安全的重要环节。',
            correctAction: '仪器清洗步骤：自来水刷洗→蒸馏水润洗→晾干备用。废液倒入指定容器，不可直接倒入水槽。',
          },
          {
            id: 'gn3c',
            text: '把剩余试剂倒回原瓶',
            isCorrect: false,
            feedback: '取出的试剂绝不能倒回原瓶！这会污染整瓶试剂，影响其他同学的实验结果。',
            correctAction: '取出的试剂不能倒回原瓶，应倒入指定废液缸。清洗仪器时自来水刷洗后用蒸馏水润洗。',
          },
        ],
      },
      {
        order: 4,
        scene: '离开实验室前，你该做哪些检查？',
        choices: [
          {
            id: 'gn4a',
            text: '确认酒精灯已熄灭、水龙头已关、桌面已清理',
            isCorrect: true,
            feedback: '离开前的检查非常重要！确保水、电、火源都已关闭是基本的安全习惯。',
            correctAction: '离开实验室前必须检查：酒精灯熄灭、水龙头关闭、桌面清理、废液妥善处理、器材归位。',
          },
          {
            id: 'gn4b',
            text: '直接离开，老师会检查的',
            isCorrect: false,
            feedback: '依赖老师检查是不负责任的做法！每个人都要对自己的实验区域安全负责。',
            correctAction: '每位同学离开前都应自行检查：火源熄灭、水源关闭、桌面清理、废液处理、器材归位。',
          },
        ],
      },
      {
        order: 5,
        scene: '实验中突然听到消防警报响了。你应该怎么做？',
        choices: [
          {
            id: 'gn5a',
            text: '先把手头实验做完再撤离',
            isCorrect: false,
            feedback: '消防警报响起必须立即停止实验！正在进行的化学反应或加热设备可能成为新的危险源。',
            correctAction: '听到消防警报：1.立即停止所有实验 2.熄灭酒精灯等火源 3.关闭水电气 4.按老师指引有序撤离。',
          },
          {
            id: 'gn5b',
            text: '立即停止实验，熄灭火源，按老师指引有序撤离',
            isCorrect: true,
            feedback: '应急反应正确！紧急情况下安全撤离永远是第一优先级。',
            correctAction: '消防警报响起时：停实验→熄灭火源→关水电气→有序撤离，切勿慌乱奔跑。',
          },
        ],
      },
    ],
  },
];
