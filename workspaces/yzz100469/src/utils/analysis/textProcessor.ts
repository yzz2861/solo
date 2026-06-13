export function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

export function getParagraphOffsets(content: string, paragraphs: string[]): { start: number; end: number }[] {
  const offsets: { start: number; end: number }[] = [];
  let searchFrom = 0;

  for (const para of paragraphs) {
    const start = content.indexOf(para, searchFrom);
    if (start !== -1) {
      offsets.push({ start, end: start + para.length });
      searchFrom = start + para.length;
    }
  }

  return offsets;
}

const QUOTED_TEXT_REGEX = /[""「」『』【】""].*?[""「」『』】【""]/g;
const INTERVIEWER_ALIAS_REGEX = /[\u4e00-\u9fa5A-Za-z]{1,3}(?:总|老师|哥|姐|总监|经理|主管)/g;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const JOKE_WORDS_REGEX = /(哈哈|呵呵|嘿嘿|笑|开个玩笑|玩笑|狗头|doge)/gi;

export function isProtectedContent(text: string, fullParagraph: string): boolean {
  if (EMOJI_REGEX.test(text)) return true;

  const inQuotes = QUOTED_TEXT_REGEX.test(text) && QUOTED_TEXT_REGEX.test(fullParagraph);
  if (inQuotes && text.length <= 40) return true;

  if (INTERVIEWER_ALIAS_REGEX.test(text) && text.length <= 10) return true;

  if (JOKE_WORDS_REGEX.test(text) && text.length <= 15) return true;

  if (/^[A-Z][a-zA-Z0-9]{2,}$/.test(text) && text.length <= 30) return true;

  return false;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
