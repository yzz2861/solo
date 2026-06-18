import type { Order, Batch, ProductType } from '@/types';
import { PRODUCT_INFO } from '@/types';
import { formatDateDisplay, formatTime } from './dateUtils';

export const generatePickupListHTML = (orders: Order[], date: string): string => {
  const sortedOrders = [...orders].sort((a, b) => 
    a.pickupTime.localeCompare(b.pickupTime)
  );

  const itemsHtml = sortedOrders.map((order, index) => {
    const itemsList = order.items.map(item => {
      const info = PRODUCT_INFO[item.productType];
      const flavorText = item.flavor ? `（${item.flavor}）` : '';
      return `
        <div class="flex items-center gap-2 py-1 border-b border-dashed border-gray-200 last:border-0">
          <span class="text-lg">${info.emoji}</span>
          <span class="flex-1">${info.name}${flavorText}</span>
          <span class="font-bold text-lg">×${item.quantity}</span>
        </div>
      `;
    }).join('');

    const statusText = order.isPaid ? '已付款' : '未付款';
    const statusClass = order.isPaid ? 'text-green-600' : 'text-red-600';

    return `
      <div class="page-break-inside-avoid mb-8 pb-8 border-b-2 border-gray-300 last:border-0">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="text-xl font-bold mb-1">${String(index + 1).padStart(2, '0')}. ${order.customerName}</div>
            <div class="text-gray-600">📞 ${order.customerPhone}</div>
            <div class="text-gray-600">⏰ ${order.pickupTime} 取货</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold ${statusClass}">${statusText}</div>
            <div class="text-sm text-gray-500">单号: ${order.id.slice(-8)}</div>
          </div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          ${itemsList}
        </div>
        ${order.specialRequest ? `
          <div class="mt-3 p-3 bg-amber-50 rounded-lg">
            <span class="font-medium text-amber-800">备注：</span>
            <span class="text-amber-700">${order.specialRequest}</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const totalItems = sortedOrders.reduce((sum, order) => 
    sum + order.items.reduce((s, item) => s + item.quantity, 0), 0
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>取货清单 - ${formatDateDisplay(date)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; font-size: 14px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #5D4037; }
        .title { font-size: 32px; font-weight: bold; color: #5D4037; margin-bottom: 8px; }
        .subtitle { font-size: 18px; color: #666; }
        .summary { display: flex; justify-content: center; gap: 40px; margin-top: 20px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #D4A574; }
        .summary-label { font-size: 12px; color: #999; }
        .page-break-inside-avoid { page-break-inside: avoid; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">🥖 面包取货清单 🥐</div>
        <div class="subtitle">${formatDateDisplay(date)}</div>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${sortedOrders.length}</div>
            <div class="summary-label">订单数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${totalItems}</div>
            <div class="summary-label">产品总数</div>
          </div>
        </div>
      </div>
      ${itemsHtml}
    </body>
    </html>
  `;
};

export const generateBakingListHTML = (batch: Batch, orders: Order[], date: string): string => {
  const productTotals = {
    baguette: 0,
    toast: 0,
    cake: 0,
  };

  orders.forEach(order => {
    order.items.forEach(item => {
      productTotals[item.productType] += item.quantity;
    });
  });

  const totalCapacity = productTotals.baguette * 1 + productTotals.toast * 2 + productTotals.cake * 3;

  const productHtml = (Object.keys(productTotals) as ProductType[]).map(type => {
    const info = PRODUCT_INFO[type];
    const qty = productTotals[type];
    if (qty === 0) return '';
    return `
      <div class="flex items-center justify-between py-4 border-b border-dashed border-gray-200 last:border-0">
        <div class="flex items-center gap-3">
          <span class="text-4xl">${info.emoji}</span>
          <span class="text-xl font-bold">${info.name}</span>
        </div>
        <span class="text-4xl font-bold text-amber-600">${qty}</span>
      </div>
    `;
  }).filter(Boolean).join('');

  const ordersHtml = orders.map(order => {
    const itemsList = order.items.map(item => {
      const info = PRODUCT_INFO[item.productType];
      return `${info.emoji}${info.name}×${item.quantity}`;
    }).join(' ');

    return `
      <div class="flex items-start gap-4 py-2 border-b border-gray-100 last:border-0">
        <span class="text-gray-500 w-8 flex-shrink-0">${order.pickupTime}</span>
        <span class="font-medium w-20 flex-shrink-0">${order.customerName}</span>
        <span class="flex-1 text-gray-700">${itemsList}</span>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>烘焙清单 - 第${batch.batchNumber}炉</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; font-size: 14px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #FF8A65; }
        .title { font-size: 32px; font-weight: bold; color: #FF8A65; margin-bottom: 8px; }
        .subtitle { font-size: 18px; color: #666; }
        .batch-info { display: flex; justify-content: center; gap: 40px; margin-top: 20px; }
        .batch-info-item { text-align: center; }
        .batch-info-value { font-size: 20px; font-weight: bold; color: #FF8A65; }
        .batch-info-label { font-size: 12px; color: #999; }
        .section-title { font-size: 20px; font-weight: bold; color: #5D4037; margin: 30px 0 15px; padding-left: 10px; border-left: 4px solid #FF8A65; }
        .products { background: linear-gradient(135deg, #FFF8E1 0%, #FFE0B2 100%); border-radius: 16px; padding: 24px; margin-bottom: 30px; }
        .orders { background: #FAFAFA; border-radius: 12px; padding: 20px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">🔥 烘焙清单 🔥</div>
        <div class="subtitle">${formatDateDisplay(date)} · 第${batch.batchNumber}炉</div>
        <div class="batch-info">
          <div class="batch-info-item">
            <div class="batch-info-value">${batch.startTime} - ${batch.endTime}</div>
            <div class="batch-info-label">烘焙时间</div>
          </div>
          <div class="batch-info-item">
            <div class="batch-info-value">${totalCapacity} / ${batch.capacity}</div>
            <div class="batch-info-label">容量使用</div>
          </div>
          <div class="batch-info-item">
            <div class="batch-info-value">${orders.length}</div>
            <div class="batch-info-label">订单数</div>
          </div>
        </div>
      </div>

      <div class="section-title">🎯 本炉产品汇总</div>
      <div class="products">
        ${productHtml}
      </div>

      <div class="section-title">📋 订单明细</div>
      <div class="orders">
        ${ordersHtml}
      </div>
    </body>
    </html>
  `;
};

export const generatePackingListHTML = (orders: Order[], date: string): string => {
  const groupedBySlot = new Map<string, Order[]>();
  orders.forEach(order => {
    if (!groupedBySlot.has(order.timeSlot)) {
      groupedBySlot.set(order.timeSlot, []);
    }
    groupedBySlot.get(order.timeSlot)!.push(order);
  });

  const slotsHtml = Array.from(groupedBySlot.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, slotOrders]) => {
      const slotProductTotals = {
        baguette: 0,
        toast: 0,
        cake: 0,
      };
      slotOrders.forEach(order => {
        order.items.forEach(item => {
          slotProductTotals[item.productType] += item.quantity;
        });
      });

      const ordersList = slotOrders.map(order => {
        const items = order.items.map(item => {
          const info = PRODUCT_INFO[item.productType];
          return `${info.emoji}${info.name}×${item.quantity}`;
        }).join(' ');

        const paidIcon = order.isPaid ? '✅' : '⚠️';
        
        return `
          <div class="flex items-start gap-3 py-2 border-b border-dashed border-gray-200 last:border-0">
            <span class="font-medium w-20">${order.customerName}</span>
            <span class="flex-1">${items}</span>
            <span>${paidIcon}</span>
          </div>
        `;
      }).join('');

      const productSummary = (Object.keys(slotProductTotals) as ProductType[])
        .map(type => {
          const info = PRODUCT_INFO[type];
          const qty = slotProductTotals[type];
          return qty > 0 ? `${info.emoji}×${qty}` : '';
        })
        .filter(Boolean)
        .join(' ');

      return `
        <div class="page-break-inside-avoid mb-8">
          <div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl px-6 py-4 flex items-center justify-between">
            <div class="text-2xl font-bold">⏰ ${slot}</div>
            <div class="text-lg">${productSummary}</div>
          </div>
          <div class="bg-white border-2 border-t-0 border-amber-200 rounded-b-xl p-6">
            ${ordersList}
          </div>
        </div>
      `;
    }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>包装清单 - ${formatDateDisplay(date)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; font-size: 14px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #81C784; }
        .title { font-size: 32px; font-weight: bold; color: #2E7D32; margin-bottom: 8px; }
        .subtitle { font-size: 18px; color: #666; }
        .summary { display: flex; justify-content: center; gap: 40px; margin-top: 20px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #81C784; }
        .summary-label { font-size: 12px; color: #999; }
        .legend { display: flex; justify-content: center; gap: 20px; margin-top: 10px; color: #666; }
        .page-break-inside-avoid { page-break-inside: avoid; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">📦 包装清单 🎁</div>
        <div class="subtitle">${formatDateDisplay(date)}</div>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${groupedBySlot.size}</div>
            <div class="summary-label">时段数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${orders.length}</div>
            <div class="summary-label">订单数</div>
          </div>
        </div>
        <div class="legend">
          <span>✅ 已付款</span>
          <span>⚠️ 未付款</span>
        </div>
      </div>
      ${slotsHtml}
    </body>
    </html>
  `;
};

export const printHTML = (html: string): void => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('请允许弹出窗口以打印');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
