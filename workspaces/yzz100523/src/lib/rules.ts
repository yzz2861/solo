import type { ViolationType, Severity } from '../types'

export interface KeywordRule {
  keyword: string
  type: ViolationType
  severity: Severity
  ruleBasis: string
  suggestion: string
  negationExcludable?: boolean
}

export interface PatternRule {
  pattern: RegExp
  type: ViolationType
  severity: Severity
  ruleBasis: string
  suggestion: string
  extractMatchIndex?: number
}

export interface CombiRule {
  keywords: string[]
  minHits: number
  type: ViolationType
  severity: Severity
  ruleBasis: string
  suggestion: string
}

export const NEGATION_PREFIXES = [
  '不是', '并非', '并不', '没有', '不能说', '不敢说',
  '不算', '谈不上', '称不上', '不一定', '未必',
]

export const CONTEXT_EXEMPTION_PREFIXES = [
  { keywords: ['开玩笑', '开个玩笑', '说笑', '哈哈', '逗你们', '说着玩'], reason: 'JOKE' as const },
  { keywords: ['用户说', '买家说', '评论说', '反馈说', '有人说', '大家说', '消费者说'], reason: 'USER_REVIEW' as const },
  { keywords: ['官方说', '品牌说', '厂家说', '宣传说', '说明书说', '包装上写'], reason: 'BRAND_COPY' as const },
  { keywords: ['口误', '说错了', '纠正一下', '不对不对', '抱歉', '重新说'], reason: 'SLIP_OF_TONGUE' as const },
]

export const KEYWORD_RULES: KeywordRule[] = [
  // 医疗暗示（极高风险）
  { keyword: '根治', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', ruleBasis: '《广告法》第十六条：医疗广告不得含有"根治"等表示功效的断言', suggestion: '改为"有助于改善""长期坚持调理"，避免医疗术语' },
  { keyword: '包治百病', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', ruleBasis: '《广告法》第十六条：禁止宣称包治百病', suggestion: '删除该表述，改为针对具体症状的客观描述' },
  { keyword: '药到病除', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', ruleBasis: '医疗广告禁用绝对化疗效用语', suggestion: '改为"根据个人体质效果可能不同"' },
  { keyword: '立竿见影', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '禁止承诺即时医疗效果', suggestion: '改为"坚持使用效果更佳"' },
  { keyword: '见效', type: 'MEDICAL_IMPLICATION', severity: 'MEDIUM', negationExcludable: true, ruleBasis: '涉及医疗效果暗示', suggestion: '改为"感受到变化""有感觉"' },
  { keyword: '治疗', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', negationExcludable: true, ruleBasis: '非医疗器械/药品不得宣传治疗功能', suggestion: '改为"缓解""改善""调理"' },
  { keyword: '治愈', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', ruleBasis: '非医疗产品不得宣称治愈', suggestion: '改为"改善""帮助恢复"' },
  { keyword: '疗效', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '非医疗产品禁止使用"疗效"', suggestion: '改为"使用效果""体感"' },
  { keyword: '消炎', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '普通化妆品/食品不得宣传消炎', suggestion: '改为"舒缓""镇静"' },
  { keyword: '杀菌', type: 'MEDICAL_IMPLICATION', severity: 'MEDIUM', ruleBasis: '未做杀菌检测不得宣称', suggestion: '改为"清洁""抑菌（需有检测报告）"' },
  { keyword: '抗癌', type: 'MEDICAL_IMPLICATION', severity: 'CRITICAL', ruleBasis: '绝对禁止的医疗宣传', suggestion: '删除该表述，严禁提及抗癌' },
  { keyword: '降血压', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '普通食品不得宣传降血压', suggestion: '删除或改为"有助于维持正常血压水平"' },
  { keyword: '降血糖', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '普通食品不得宣传降血糖', suggestion: '删除或改为"有助于维持血糖稳定"' },
  { keyword: '降血脂', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '普通食品不得宣传降血脂', suggestion: '删除或改为"有助于调节"' },
  { keyword: '无副作用', type: 'MEDICAL_IMPLICATION', severity: 'HIGH', ruleBasis: '不得绝对化宣称无副作用', suggestion: '改为"目前未发现明显不良反应"' },
  { keyword: '纯天然无添加', type: 'EXAGGERATION', severity: 'MEDIUM', ruleBasis: '不得虚假宣称纯天然', suggestion: '改为具体成分说明' },

  // 禁用功效宣称
  { keyword: '美白', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', negationExcludable: true, ruleBasis: '普通化妆品需持特证方可宣称美白', suggestion: '改为"提亮肤色""改善暗沉"' },
  { keyword: '祛斑', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', ruleBasis: '需特殊化妆品证', suggestion: '改为"改善肤色不均"' },
  { keyword: '丰胸', type: 'FORBIDDEN_EFFECT', severity: 'CRITICAL', ruleBasis: '禁止宣传丰胸功效', suggestion: '删除该表述' },
  { keyword: '瘦身', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', ruleBasis: '普通食品/服装不得宣传瘦身', suggestion: '改为"修饰身形""显瘦"' },
  { keyword: '减肥', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', negationExcludable: true, ruleBasis: '非减肥保健食品禁止宣传减肥', suggestion: '改为"帮助管理体重""控制体重"' },
  { keyword: '减脂', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', ruleBasis: '需蓝帽子认证', suggestion: '改为"运动辅助""热量管理"' },
  { keyword: '增高', type: 'FORBIDDEN_EFFECT', severity: 'CRITICAL', ruleBasis: '禁止虚假增高宣传', suggestion: '删除该表述' },
  { keyword: '生发', type: 'FORBIDDEN_EFFECT', severity: 'HIGH', ruleBasis: '需特证或药品资质', suggestion: '改为"强韧发根""改善头皮环境"' },
  { keyword: '防脱', type: 'FORBIDDEN_EFFECT', severity: 'MEDIUM', ruleBasis: '建议持特证宣称', suggestion: '改为"减少断发""加固发根"' },
  { keyword: '修复', type: 'FORBIDDEN_EFFECT', severity: 'MEDIUM', ruleBasis: '部分品类需谨慎使用', suggestion: '改为"呵护""护理"' },
  { keyword: '无痕', type: 'FORBIDDEN_EFFECT', severity: 'LOW', ruleBasis: '避免绝对化功效宣称', suggestion: '改为"视觉隐形""贴合自然"' },

  // 绝对化用语
  { keyword: '第一', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', negationExcludable: true, ruleBasis: '《广告法》第九条：禁止使用"第一"等绝对化用语', suggestion: '改为"前列""领先""优选"' },
  { keyword: '唯一', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》第九条：禁止使用"唯一"', suggestion: '改为"少数""不多见的"' },
  { keyword: '最好', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》第九条', suggestion: '改为"优质""高人气"' },
  { keyword: '最佳', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》第九条', suggestion: '改为"理想""推荐"' },
  { keyword: '顶级', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》第九条', suggestion: '改为"高端""高品质"' },
  { keyword: '极品', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》第九条', suggestion: '改为"上乘""精品"' },
  { keyword: '绝对', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '《广告法》第九条', suggestion: '改为"几乎""近乎"' },
  { keyword: '完美', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '绝对化用语', suggestion: '改为"出色""表现优秀"' },
  { keyword: '100%', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', negationExcludable: true, ruleBasis: '避免100%承诺，除非有权威检测', suggestion: '改为"高纯度""几乎全部"' },
  { keyword: '百分之百', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '避免绝对化', suggestion: '改为"绝大部分"' },
  { keyword: '永久', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '禁止永久承诺', suggestion: '改为"长效""持久（注明参考时间）"' },
  { keyword: '万能', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '禁止万能宣称', suggestion: '改为"多用途""多功能"' },
  { keyword: '纯天然', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '避免绝对化天然', suggestion: '改为"天然成分""添加天然提取物"' },
  { keyword: '全网', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '避免全网范围绝对化', suggestion: '限定为"本店""我们"' },
  { keyword: '全球', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '避免全球范围绝对化', suggestion: '删除或提供权威依据' },
  { keyword: '国家级', type: 'ABSOLUTE_WORD', severity: 'HIGH', ruleBasis: '《广告法》禁止使用国家级', suggestion: '删除或改为官方认证表述' },
  { keyword: '世界级', type: 'ABSOLUTE_WORD', severity: 'MEDIUM', ruleBasis: '避免虚假级别宣称', suggestion: '删除或改为"国际品质"' },

  // 最低价/价格承诺
  { keyword: '全网最低', type: 'PRICE_PROMISE', severity: 'HIGH', ruleBasis: '《价格法》禁止虚假最低价承诺', suggestion: '改为"本店近期低价""限时特惠价"' },
  { keyword: '最低价', type: 'PRICE_PROMISE', severity: 'HIGH', negationExcludable: true, ruleBasis: '禁止宣称最低价', suggestion: '标明具体价格和促销期限' },
  { keyword: '最便宜', type: 'PRICE_PROMISE', severity: 'HIGH', ruleBasis: '禁止最便宜宣称', suggestion: '改为"高性价比"' },
  { keyword: '击穿底价', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '避免虚假底价宣称', suggestion: '改为"优惠力度大"' },
  { keyword: '史低价', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '需有历史价格数据佐证', suggestion: '改为"近期好价"' },
  { keyword: '历史最低', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '需提供历史数据', suggestion: '改为"近期低价"' },
  { keyword: '亏本', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '禁止虚假亏本宣称', suggestion: '改为"促销价""优惠价"' },
  { keyword: '赔本', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '同上', suggestion: '同上' },
  { keyword: '跳楼价', type: 'PRICE_PROMISE', severity: 'LOW', ruleBasis: '避免夸张价格宣传', suggestion: '改为具体折扣信息' },
  { keyword: '白菜价', type: 'PRICE_PROMISE', severity: 'LOW', ruleBasis: '避免不实暗示', suggestion: '改为具体价格数字' },
  { keyword: '买贵包退', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '价格承诺需可执行', suggestion: '明确退差价条件和流程' },
  { keyword: '差价双倍返还', type: 'PRICE_PROMISE', severity: 'MEDIUM', ruleBasis: '价格承诺需谨慎', suggestion: '改为标准价保条款' },

  // 夸大宣传
  { keyword: '疯抢', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '避免夸张营销', suggestion: '改为"热销""受欢迎"' },
  { keyword: '抢疯了', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '同上', suggestion: '同上' },
  { keyword: '秒没', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '避免虚假紧迫感', suggestion: '改为"库存有限"' },
  { keyword: '人手一件', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '夸大销量暗示', suggestion: '改为"销量领先""多人选择"' },
  { keyword: '闭眼入', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '避免不负责任推荐', suggestion: '改为"推荐""值得考虑"' },
  { keyword: '错过后悔', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '避免恐吓式营销', suggestion: '改为"限时活动，欢迎选购"' },
  { keyword: '不买后悔', type: 'EXAGGERATION', severity: 'LOW', ruleBasis: '同上', suggestion: '同上' },
]

export const PATTERN_RULES: PatternRule[] = [
  {
    pattern: /(?:全网|全平台|全店|全场).{0,6}(最低|最优|最便宜|最划算)/,
    type: 'PRICE_PROMISE', severity: 'HIGH',
    ruleBasis: '全网/全X+最低价组合构成违规价格承诺',
    suggestion: '改为"本店促销价"并标明期限',
  },
  {
    pattern: /(?:用了|用这个|吃了|喝了|贴了|抹了).{0,10}(?:就好|就见效|就没了|就消了|就好了|就正常了)/,
    type: 'MEDICAL_IMPLICATION', severity: 'HIGH',
    ruleBasis: '"用了/吃了+就好"模式构成医疗效果暗示',
    suggestion: '改为"坚持使用有助于改善"',
  },
  {
    pattern: /不(?:好|满意|喜欢|见效|过敏).{0,6}(?:包退|退款|退货|退钱|全额退)/,
    type: 'EXAGGERATION', severity: 'MEDIUM',
    ruleBasis: '"不好就退"需配合真实退换货政策',
    suggestion: '改为标准7天无理由退换货条款',
  },
  {
    pattern: /(?:免费送|免费抽|抽奖|送福利).{0,30}$/,
    type: 'UNCLEAR_LOTTERY', severity: 'MEDIUM',
    ruleBasis: '抽奖活动需说明：条件、名额、时间、奖品、开奖方式',
    suggestion: '立即补充说明：参与条件、开奖时间、奖品明细、中奖规则',
  },
  {
    pattern: /(?:免费|免单|0元|一块钱|1元).{0,20}(?:送|领|拿|抢|得)/,
    type: 'UNCLEAR_LOTTERY', severity: 'MEDIUM',
    ruleBasis: '免费领/送需明示活动规则，避免诱导',
    suggestion: '补充说明是否有附加条件、名额限制',
  },
  {
    pattern: /比.{0,20}(?:便宜|划算|省|低).{0,10}(?:%|元|块|钱)/,
    type: 'PRICE_PROMISE', severity: 'MEDIUM',
    ruleBasis: '对比价格需标明对比对象及时间',
    suggestion: '明确对比价来源：原售价/专柜价/吊牌价',
  },
  {
    pattern: /(?:当天|立刻|马上|立即|瞬间).{0,10}(?:见效|生效|看到效果|有效果)/,
    type: 'MEDICAL_IMPLICATION', severity: 'HIGH',
    ruleBasis: '承诺当天/立刻见效属医疗暗示',
    suggestion: '改为"周期使用，效果因人而异"',
  },
  {
    pattern: /(?:不管|不论|无论).{0,10}(?:什么|啥|哪).{0,10}(?:都能|都可以|都有效|都ok)/,
    type: 'EXAGGERATION', severity: 'MEDIUM',
    ruleBasis: '"不管什么都有效"属夸大包治式宣传',
    suggestion: '改为"适合大多数人群，敏感肌建议先测试"',
  },
]

export const COMBI_RULES: CombiRule[] = [
  {
    keywords: ['快速', '有效', '安全', '无副作用'],
    minHits: 3,
    type: 'MEDICAL_IMPLICATION',
    severity: 'HIGH',
    ruleBasis: '"快速+有效+安全+无副作用"多词组合构成医疗效果暗示',
    suggestion: '减少效果承诺，使用温和表述',
  },
  {
    keywords: ['最', '第一', '顶级', '首选', '独家'],
    minHits: 2,
    type: 'ABSOLUTE_WORD',
    severity: 'HIGH',
    ruleBasis: '多个绝对化用语同时出现',
    suggestion: '全部替换为非绝对化表述',
  },
]
