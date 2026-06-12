/**
 * ID 生成工具
 * 使用 crypto.randomUUID（若可用），回退到时间戳 + 随机串的实现。
 */

/**
 * 生成一个全局唯一的 ID
 */
export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
  }
  // 回退实现：时间戳 + 随机数
  const rand = Math.random().toString(36).slice(2, 10)
  const ts = Date.now().toString(36)
  return `${prefix}_${ts}${rand}`
}
