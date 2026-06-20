export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  const regex = /[^。！？.!?]+[。！？.!?]*/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence) {
      sentences.push({
        text: sentence,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  
  if (sentences.length === 0 && text.trim()) {
    sentences.push({
      text: text.trim(),
      start: 0,
      end: text.length,
    });
  }
  
  return sentences;
}

export function containsAny(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

export function findAllMatches(text: string, keyword: string): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  let index = 0;
  while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1) {
    matches.push({
      start: index,
      end: index + keyword.length,
    });
    index += keyword.length;
  }
  
  return matches;
}

export function getContentSummary(content: string, maxLength: number = 50): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；：""''（）【】《》\s.,!?;:'"()<>\[\]]/g, '')
    .trim();
}
