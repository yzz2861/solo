function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function findSimilarPlates(
  target: string,
  plates: { plateNumber: string; id?: string; name?: string }[],
  maxDistance: number = 2
): { plateNumber: string; id?: string; name?: string; similarity: number }[] {
  if (!target || target.length < 3) return [];
  const normalized = target.toUpperCase().replace(/\s/g, '');
  const results: { plateNumber: string; id?: string; name?: string; similarity: number }[] = [];

  for (const item of plates) {
    const plate = item.plateNumber.toUpperCase().replace(/\s/g, '');
    if (plate === normalized) continue;
    const distance = levenshteinDistance(normalized, plate);
    if (distance <= maxDistance) {
      const maxLen = Math.max(normalized.length, plate.length);
      const similarity = maxLen === 0 ? 0 : 1 - distance / maxLen;
      results.push({ ...item, similarity });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
