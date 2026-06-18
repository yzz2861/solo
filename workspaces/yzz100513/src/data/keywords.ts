import type { ChapterKeyword, EntityPattern, UncertaintyPattern, ChapterInfo } from '@/types'

export const chapterInfos: ChapterInfo[] = [
  {
    id: 'childhood',
    name: '童年记忆',
    icon: 'Home',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    description: '传承人成长经历、家庭背景、与非遗的初遇'
  },
  {
    id: 'techniques',
    name: '核心技艺',
    icon: 'Wrench',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: '具体的制作工艺、技术要点、操作流程'
  },
  {
    id: 'mentorship',
    name: '师徒传承',
    icon: 'Users',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: '拜师学艺经历、师徒关系、传承脉络'
  },
  {
    id: 'tools',
    name: '材料工具',
    icon: 'Hammer',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: '使用的工具、材料来源、特殊配方'
  },
  {
    id: 'difficulties',
    name: '困境与展望',
    icon: 'TrendingUp',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    description: '传承中的困难、当前状况、未来发展'
  },
  {
    id: null,
    name: '未分类',
    icon: 'Archive',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: '尚未归类的段落'
  }
]

export const chapterKeywords: Record<string, ChapterKeyword> = {
  childhood: {
    keywords: ['小时候', '童年', '记得', '那时', '以前', '家里', '父亲', '母亲', '爷爷', '奶奶',
      '外公', '外婆', '村子里', '家乡', '上学', '放学', '玩耍', '第一次', '接触',
      '印象', '回忆', '往事', '岁月', '年代', '幼时', '儿时', '少年', '青年'],
    weights: {
      '小时候': 3, '童年': 3, '记得': 2, '那时': 2, '以前': 2,
      '第一次': 3, '印象': 2, '回忆': 3, '往事': 2, '幼时': 3, '儿时': 3
    }
  },
  techniques: {
    keywords: ['工艺', '技法', '方法', '步骤', '过程', '制作', '打造', '雕刻', '编织', '绘制',
      '火候', '温度', '时间', '力度', '手法', '技巧', '要点', '关键', '秘诀',
      '工序', '流程', '操作', '细节', '讲究', '需要', '要先', '然后', '接着',
      '最后', '注意', '不能', '必须', '一定要'],
    weights: {
      '工艺': 3, '技法': 3, '秘诀': 3, '工序': 3, '流程': 2,
      '要点': 3, '关键': 3, '讲究': 2, '必须': 2, '一定要': 2
    }
  },
  mentorship: {
    keywords: ['师傅', '师父', '徒弟', '学徒', '拜师', '学艺', '传承', '教授', '教导', '指点',
      '带徒弟', '收徒', '师门', '师兄', '师弟', '师姐', '师妹', '父辈', '祖辈',
      '代代相传', '传下来', '老祖宗', '前辈', '先人', '继承', '发扬'],
    weights: {
      '师傅': 3, '师父': 3, '拜师': 3, '学艺': 3, '传承': 3,
      '收徒': 3, '师门': 3, '代代相传': 3, '传下来': 2, '继承': 2
    }
  },
  tools: {
    keywords: ['工具', '材料', '原料', '木头', '石头', '泥土', '布料', '丝线', '颜料', '纸张',
      '竹子', '金属', '铜', '铁', '刀', '凿子', '锤子', '锯子', '模具', '配方',
      '材质', '产地', '选用', '选择', '需要用', '使用', '专门', '特制'],
    weights: {
      '工具': 3, '材料': 3, '配方': 3, '材质': 2, '特制': 2,
      '原料': 3, '模具': 2, '产地': 2, '选用': 2, '专门': 2
    }
  },
  difficulties: {
    keywords: ['困难', '问题', '挑战', '担心', '忧虑', '未来', '发展', '希望', '期望', '现在',
      '如今', '目前', '市场', '年轻人', '没人学', '后继无人', '保护', '抢救',
      '政策', '支持', '帮助', '出路', '前景', '迷茫', '困惑', '坚持', '不容易'],
    weights: {
      '困难': 3, '挑战': 3, '担心': 2, '忧虑': 3, '未来': 2,
      '没人学': 3, '后继无人': 3, '保护': 2, '抢救': 3, '不容易': 2
    }
  }
}

export const entityPatterns: EntityPattern[] = [
  {
    type: 'person',
    patterns: [
      /[\u4e00-\u9fa5]{2,4}(?:先生|女士|师傅|师父|老师|大师|传承人)/g,
      /(?:父亲|母亲|爷爷|奶奶|外公|外婆|叔叔|阿姨|伯父|伯母)[\u4e00-\u9fa5]{0,2}/g,
      /[\u4e00-\u9fa5]{2,3}(?:师傅|师父)/g
    ]
  },
  {
    type: 'place',
    patterns: [
      /[\u4e00-\u9fa5]{2,10}(?:省|市|县|镇|村|乡|街|路|巷|胡同|广场|公园|寺|庙|观|院|楼|阁)/g,
      /[\u4e00-\u9fa5]{2,8}(?:山|水|河|湖|海|江|溪|泉|潭)/g,
      /(?:家里|村里|镇上|县里|市里)/g
    ]
  },
  {
    type: 'technique',
    patterns: [
      /[\u4e00-\u9fa5]{2,6}(?:法|术|技|艺|工|法)/g,
      /(?:[一二三四五六七八九十百千]+[步道工序])/g,
      /[\u4e00-\u9fa5]{2,4}(?:手法|技法|工艺)/g
    ]
  },
  {
    type: 'quote',
    patterns: [
      /"([^"]+)"/g,
      /"([^"]+)"/g,
      /(?:师傅|师父|老人|先人|老祖宗)(?:说|讲|教导|告诉)[：:]\s*[\u4e00-\u9fa5，。！？、；：""''（）]+/g
    ]
  }
]

export const uncertaintyPatterns: UncertaintyPattern[] = [
  {
    type: 'unintelligible',
    patterns: [
      /[（(]?[听不?清|含糊|不清楚|噪音|杂音][）)]?/g,
      /[\[\(][^\]\)]*[\]\)]/g,
      /[。，！？；：]{2,}/g,
      /…+/g
    ]
  },
  {
    type: 'multiple_names',
    patterns: [
      /[\u4e00-\u9fa5]{2,4}(?:又称|又名|也称|也叫|俗称|古称)[\u4e00-\u9fa5，、]{2,10}/g,
      /(?:有的地方|有些人|我们)(?:叫|称|说)[\u4e00-\u9fa5，、：:]{2,15}(?:有的|也叫|又称)/g
    ]
  },
  {
    type: 'timeline_jump',
    patterns: [
      /(?:后来|然后|接着|不久|过了|几年后|十几年后|二十多年后|转眼间|一晃|那时候|这时候)/g,
      /[\u4e00-\u9fa5]{0,4}(?:年|月|日|时代|时期|年代)[，。,\.]{0,2}/g,
      /(?:突然|忽然|就在这时|记得有一次|还有一次)/g
    ]
  }
]

export const chapterColors: Record<string, string> = {
  childhood: 'amber',
  techniques: 'blue',
  mentorship: 'green',
  tools: 'purple',
  difficulties: 'rose'
}
