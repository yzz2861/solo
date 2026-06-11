import type { Solution } from '@/types';

export function generateServiceGuide(solution: Solution): string {
  const now = new Date(solution.updatedAt).toLocaleString('zh-CN');
  const rules = solution.rules.filter((r) => r.enabled);

  let text = `【直播间赠品规则说明 - ${solution.name}】\n`;
  text += `更新时间：${now}\n\n`;
  text += `一、赠品规则明细：\n`;

  rules.forEach((rule, idx) => {
    let condition = '';
    if (rule.type === 'threshold') {
      const amtLabel = rule.useCoupon ? '券后' : '券前';
      const bundleLabel = rule.excludeBundle ? '（套装商品不计入）' : '';
      condition = `满${amtLabel}¥${rule.thresholdAmount}${bundleLabel}赠送`;
    } else {
      condition = `前${rule.limitCount}单赠送`;
    }
    text += `${idx + 1}. 「${rule.name}」：${condition} ${rule.giftName} x${rule.giftPerOrder}\n`;
    text += `   库存：共 ${rule.giftStock} 件\n`;
    if (rule.excludeBundle) text += `   ⚠️ 注意：套装商品不参与此活动\n`;
    if (rule.type === 'limit_first') text += `   ⚠️ 注意：限前${rule.limitCount}单，先到先得\n`;
  });

  text += `\n二、订单金额说明：\n`;
  text += `• 券前金额 = 所有商品（含套装）单价 × 数量 之和\n`;
  text += `• 券后金额 = 券前金额 - 优惠券金额\n`;
  text += `• 非套装金额 = 仅非套装商品的合计（套装单独标注时使用）\n\n`;

  text += `三、常见问题：\n`;
  text += `Q: 为什么我没有收到赠品？\n`;
  text += `A: 请检查：1) 订单金额是否达标（注意部分规则看券后）；2) 是否包含套装且规则排除套装；3) 限量赠品是否已抢完。\n\n`;
  text += `Q: 退掉某个商品后赠品会收回吗？\n`;
  text += `A: 满额类赠品：若退货后订单金额不再达标，赠品将被收回；限量类赠品（前N单）：不受退货金额影响。\n\n`;
  text += `Q: 多个赠品规则可以叠加吗？\n`;
  text += `A: 不同规则赠送不同赠品可同时享受；同一赠品被多条规则命中时，会叠加数量（以库存为限）。\n`;

  return text;
}

export function generateWarehouseCSV(solution: Solution): string {
  const enabledRules = solution.rules.filter((r) => r.enabled);
  const giftMap = new Map<string, { name: string; perOrder: number; stock: number; ruleNames: string[] }>();

  enabledRules.forEach((rule) => {
    const existing = giftMap.get(rule.giftId);
    if (existing) {
      existing.perOrder += rule.giftPerOrder;
      existing.stock = Math.max(existing.stock, rule.giftStock);
      existing.ruleNames.push(rule.name);
    } else {
      giftMap.set(rule.giftId, {
        name: rule.giftName,
        perOrder: rule.giftPerOrder,
        stock: rule.giftStock,
        ruleNames: [rule.name],
      });
    }
  });

  let csv = '\uFEFF赠品名称,每单数量,总备货量,库存上限,命中规则\n';
  giftMap.forEach((g) => {
    csv += `"${g.name}",${g.perOrder},${g.stock},${g.stock},"${g.ruleNames.join('/')}"\n`;
  });

  csv += `\n方案名称,${solution.name}\n`;
  csv += `导出时间,${new Date(solution.updatedAt).toLocaleString('zh-CN')}\n`;
  return csv;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
