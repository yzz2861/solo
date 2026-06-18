import { privacyService } from "./src/services/privacyService";

console.log("=== 详细调试 maskChineseNamesInText ===");

const text = "医生您好，我是李秀英，这几天好多了，咳嗽基本止住了，谢谢关心";

console.log("\n原文:", text);
console.log("长度:", text.length);

// 手动模拟匹配过程
const SURNAME_PATTERN = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','马','朱','胡','郭','何','林','罗','高','郑','梁','谢','宋','唐','许','韩','冯','邓','曹','彭','曾','萧','田','董','袁','潘','于','蒋','蔡','余','杜','叶','程','苏','魏','吕','丁','任','沈','姚','卢','傅','钟','姜','崔','谭','廖','范','汪','陆','金','石','戴','贾','韦','夏','邱','方','侯','邹','熊','孟','秦','白','江','阎','薛','尹','段','雷','黎','史','龙','贺','顾','毛','郝','龚','邵','万','钱','严','覃','武','戚','柳','乔','齐'].join('|');
const CHINESE_NAME_REGEX = new RegExp(
  `(?:${SURNAME_PATTERN})([\\u4e00-\\u9fa5]{1,2})`,
  'g'
);

const TITLE_CHARS = /[医护师长局长主任总经干部老大小姐弟姐妹哥嫂婶伯叔爷奶婆属院科室队组]/;
const COMMON_VERBS = /[说是在想来去看问找打给叫让把被给]/;
const NAME_PREFIXES = /[叫是找看问我你他她它]/;

console.log("\n=== 匹配过程 ===");
let match;
const regex = new RegExp(CHINESE_NAME_REGEX.source, 'g');
while ((match = regex.exec(text)) !== null) {
  const full = match[0];
  const surname = match[0].charAt(0);
  const given = match[1];
  const prevChar = match.index > 0 ? text[match.index - 1] : '';
  const prevPrevChar = match.index > 1 ? text[match.index - 2] : '';
  const nextIdx = match.index + full.length;
  const nextChar = nextIdx < text.length ? text[nextIdx] : '';

  console.log(`\n匹配: '${full}' (姓:'${surname}', 名:'${given}') at index ${match.index}`);
  console.log(`  前一字符: '${prevChar}' (${prevChar.charCodeAt(0)})`);
  console.log(`  后一字符: '${nextChar}' (${nextChar ? nextChar.charCodeAt(0) : 'NONE'})`);

  const isDoubleChar = full.length === 2 && surname === given;
  console.log(`  是叠词: ${isDoubleChar}`);

  const titleAfter = TITLE_CHARS.test(nextChar);
  console.log(`  后是职称: ${titleAfter}`);

  const prevIsChinese = /[\u4e00-\u9fa5]/.test(prevChar);
  console.log(`  前是中文: ${prevIsChinese}`);

  const isAllowedPrefix = NAME_PREFIXES.test(prevChar) ||
    (prevPrevChar + prevChar === '患者') ||
    (prevPrevChar + prevChar === '联系') ||
    (prevPrevChar + prevChar === '找') ||
    (prevPrevChar + prevChar === '叫');
  console.log(`  允许前缀: ${isAllowedPrefix} (${prevPrevChar}${prevChar})`);

  if (isDoubleChar) {
    console.log(`  -> 排除：叠词`);
    continue;
  }
  if (titleAfter) {
    console.log(`  -> 排除：后接职称`);
    continue;
  }
  if (prevIsChinese && !isAllowedPrefix) {
    console.log(`  -> 排除：前是中文且不允许`);
    continue;
  }

  console.log(`  -> 保留！`);
}

console.log("\n=== 实际结果 ===");
console.log("maskAll with knownNames:", privacyService.maskAll(text, ["李秀英"]));
console.log("maskChineseNamesInText:", privacyService.maskChineseNamesInText(text));
