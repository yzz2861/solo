function maskUserId(userId) {
  if (!userId) return '***';
  const str = String(userId);
  if (str.length <= 3) return str[0] + '**';
  if (str.length <= 6) return str.slice(0, 1) + '*'.repeat(str.length - 2) + str.slice(-1);
  return str.slice(0, 3) + '*'.repeat(str.length - 5) + str.slice(-2);
}

function maskUsername(username) {
  if (!username) return '匿名用户';
  const str = String(username);
  if (str.length === 1) return '*';
  if (str.length === 2) return str[0] + '*';
  if (str.length <= 4) return str[0] + '*'.repeat(str.length - 2) + str.slice(-1);
  return str.slice(0, 2) + '*'.repeat(str.length - 3) + str.slice(-1);
}

function maskPhone(phone) {
  if (!phone) return '';
  const str = String(phone).replace(/\D/g, '');
  if (str.length < 7) return '*'.repeat(str.length);
  return str.slice(0, 3) + '****' + str.slice(-4);
}

function maskEmail(email) {
  if (!email) return '';
  const str = String(email);
  const atIndex = str.indexOf('@');
  if (atIndex < 0) return str;
  const name = str.slice(0, atIndex);
  const domain = str.slice(atIndex);
  if (name.length <= 2) return '*'.repeat(name.length) + domain;
  return name[0] + '*'.repeat(name.length - 2) + name.slice(-1) + domain;
}

function maskAddress(address) {
  if (!address) return '';
  const str = String(address);
  if (str.length <= 6) return '*'.repeat(str.length);
  return str.slice(0, 3) + '*'.repeat(Math.min(str.length - 5, 10)) + str.slice(-3);
}

function maskUserInfo(user) {
  if (!user) return {};
  return {
    id: maskUserId(user.id),
    username: maskUsername(user.username),
    phone: user.phone ? maskPhone(user.phone) : undefined,
    email: user.email ? maskEmail(user.email) : undefined,
    address: user.address ? maskAddress(user.address) : undefined,
    avatar: user.avatar,
    level: user.level
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAllMatches(text, keyword) {
  const matches = [];
  if (!text || !keyword) return matches;
  
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let index = 0;
  
  while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1) {
    matches.push({
      start: index,
      end: index + keyword.length,
      text: text.slice(index, index + keyword.length),
      keyword: keyword
    });
    index += keyword.length;
  }
  
  return matches;
}

function mergeOverlappingRanges(ranges) {
  if (!ranges || ranges.length === 0) return [];
  
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      last.keywords = Array.from(new Set([...(last.keywords || [last.keyword]), ...(current.keywords || [current.keyword])]));
      last.text = current.text || last.text;
    } else {
      current.keywords = current.keywords || [current.keyword];
      merged.push(current);
    }
  }
  
  return merged;
}

module.exports = {
  maskUserId,
  maskUsername,
  maskPhone,
  maskEmail,
  maskAddress,
  maskUserInfo,
  escapeRegExp,
  findAllMatches,
  mergeOverlappingRanges
};
