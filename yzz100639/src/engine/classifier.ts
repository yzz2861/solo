import type { QuoteCategory } from './types'

const leadershipPatterns: RegExp[] = [
  /(?:董事长|CEO|总裁|总经理|副总裁|总监|主任|局长|厅长|部长|省长|市长)[^。，；！？]{0,10}(?:表示|指出|强调|认为|提到|说|称|宣布|透露)/,
  /(?:表示|指出|强调|认为|提到|说|称|宣布|透露)[^。，；！？]{0,10}(?:董事长|CEO|总裁|总经理|副总裁|总监|主任|局长|厅长|部长|省长|市长)/,
]

const customerPatterns: RegExp[] = [
  /(?:客户|用户|合作伙伴|消费者)[^。，；！？]{0,10}(?:反馈|评价|认为|表示|称|说)/,
  /(?:客户反馈|用户评价|客户证言|用户口碑|客户推荐)/,
  /"[^"]{5,}"[^。，；！？]{0,10}(?:客户|用户)/,
]

const honorPatterns: RegExp[] = [
  /(?:荣获|获得|被评为|获评|摘得|斩获|荣膺|获颁)[^。，；！？]{0,30}(?:奖|称号|认证|荣誉|殊荣|认可)/,
  /(?:奖项|荣誉|认证|殊荣|桂冠|金牌|冠军)[^。，；！？]{0,10}(?:颁发|授予|获得)/,
  /(?:入选|跻身|登榜)[^。，；！？]{0,30}(?:榜单|排行榜|名录|榜单)/,
]

export function classifyQuote(sentence: string): QuoteCategory {
  if (leadershipPatterns.some(p => p.test(sentence))) return 'leadership_quote'
  if (customerPatterns.some(p => p.test(sentence))) return 'customer_testimonial'
  if (honorPatterns.some(p => p.test(sentence))) return 'historical_honor'
  return 'general'
}
