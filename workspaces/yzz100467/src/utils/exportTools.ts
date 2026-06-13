import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Scheme, Sign, ComplianceWarning, ConstructionStatus } from '@/types';
import { SIGN_TEMPLATES, FLOOR_LIST } from '@/types';

export interface ExportData {
  scheme: Scheme;
  warnings: ComplianceWarning[];
  screenshotDataUrls: Record<string, string>;
}

const STATUS_LABEL: Record<ConstructionStatus, string> = {
  pending: '未领料',
  picked: '已领料',
  installed: '已安装',
  verified: '已验收',
};

const CATEGORY_LABEL: Record<string, string> = {
  height: '高度违规',
  orientation: '朝向错误',
  fire_hydrant: '消防栓距离',
  occlusion: '遮挡问题',
  corner_view: '转角视距',
  accessible_path: '无障碍通道',
  distance: '距离问题',
};

const LEVEL_LABEL: Record<string, string> = {
  error: '严重',
  warning: '警告',
  info: '提示',
};

export function getSignsByFloorZone(scheme: Scheme) {
  const result: { floor: number; zone: string; signs: Sign[] }[] = [];
  FLOOR_LIST.forEach((f) => {
    const signs = scheme.signs[f] || [];
    const zoneMap = new Map<string, Sign[]>();
    signs.forEach((s) => {
      if (!zoneMap.has(s.zone)) zoneMap.set(s.zone, []);
      zoneMap.get(s.zone)!.push(s);
    });
    for (const [zone, ss] of zoneMap) {
      result.push({ floor: f, zone, signs: ss });
    }
  });
  return result;
}

export function countStats(scheme: Scheme, warnings: ComplianceWarning[]) {
  const totalSigns = FLOOR_LIST.reduce((a, f) => a + (scheme.signs[f]?.length || 0), 0);
  const signIdsWithWarning = new Set(warnings.map((w) => w.signId));
  const errorCount = warnings.filter((w) => w.level === 'error').length;
  const warningCount = warnings.filter((w) => w.level === 'warning').length;
  return { totalSigns, warnedSigns: signIdsWithWarning.size, errorCount, warningCount };
}

export function exportExcel(data: ExportData) {
  const { scheme, warnings } = data;
  const wb = XLSX.utils.book_new();
  const rows: any[] = [];
  const warnBySign = new Map<string, ComplianceWarning[]>();
  warnings.forEach((w) => {
    if (!warnBySign.has(w.signId)) warnBySign.set(w.signId, []);
    warnBySign.get(w.signId)!.push(w);
  });
  FLOOR_LIST.forEach((f) => {
    (scheme.signs[f] || []).forEach((s, idx) => {
      const tpl = SIGN_TEMPLATES[s.type];
      const ws = warnBySign.get(s.id) || [];
      const record = scheme.constructionRecords[s.id];
      rows.push({
        楼层: `${f}F`,
        区域: s.zone,
        序号: `${f}-${String(idx + 1).padStart(3, '0')}`,
        标牌编号: s.id,
        类型: tpl.label,
        名称: s.name,
        材质: s.material === 'acrylic' ? '亚克力' : s.material === 'metal' ? '金属' : 'PVC',
        '设计位置X(m)': Number(s.position.x.toFixed(2)),
        '设计位置Y(m,高度)': Number(s.position.y.toFixed(2)),
        '设计位置Z(m)': Number(s.position.z.toFixed(2)),
        '设计朝向(度)': Number((s.rotationY * 180 / Math.PI).toFixed(0)),
        '宽度(m)': s.width,
        '高度(m)': s.height,
        风险等级: ws.length ? ws.some((w) => w.level === 'error') ? '严重' : '警告' : '无',
        风险项: ws.map((w) => `${LEVEL_LABEL[w.level]}·${CATEGORY_LABEL[w.category] || w.category}`).join('；') || '—',
        施工状态: record ? STATUS_LABEL[record.status] : '未领料',
      });
    });
  });
  const ws1 = XLSX.utils.json_to_sheet(rows);
  ws1['!cols'] = [
    { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 8 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 32 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '安装清单');

  const warnRows = warnings.map((w, i) => ({
    序号: i + 1,
    标牌编号: w.signId,
    等级: LEVEL_LABEL[w.level],
    类别: CATEGORY_LABEL[w.category] || w.category,
    问题描述: w.message,
    整改建议: w.suggestion,
    当前值: w.value?.toFixed?.(2) ?? (w.value ?? '—'),
    阈值: w.threshold ?? '—',
  }));
  const ws2 = XLSX.utils.json_to_sheet(warnRows);
  ws2['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 6 }, { wch: 14 }, { wch: 48 }, { wch: 40 }, { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '风险清单');

  const pickRows: any[] = [];
  const pickMap = new Map<string, { floor: number; zone: string; type: string; material: string; count: number }>();
  FLOOR_LIST.forEach((f) => {
    (scheme.signs[f] || []).forEach((s) => {
      const key = `${f}|${s.zone}|${s.type}|${s.material}`;
      if (!pickMap.has(key)) {
        pickMap.set(key, { floor: f, zone: s.zone, type: SIGN_TEMPLATES[s.type].label, material: s.material, count: 0 });
      }
      pickMap.get(key)!.count++;
    });
  });
  let k = 0;
  for (const it of pickMap.values()) {
    pickRows.push({
      序号: ++k,
      楼层: `${it.floor}F`,
      区域: it.zone,
      类型: it.type,
      材质: it.material === 'acrylic' ? '亚克力' : it.material === 'metal' ? '金属' : 'PVC',
      数量: it.count,
      单位: '块',
      领料确认: '',
    });
  }
  const ws3 = XLSX.utils.json_to_sheet(pickRows);
  ws3['!cols'] = [{ wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, '领料清单');

  const fname = `${scheme.name}-安装清单.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
}

export async function exportPDF(data: ExportData) {
  const { scheme, warnings, screenshotDataUrls } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('室内导视系统安装清单', pageW / 2, 22, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`方案名称: ${scheme.name}`, margin, 32);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, margin, 39);
  const stats = countStats(scheme, warnings);
  doc.text(`标牌总数: ${stats.totalSigns}   涉及风险: ${stats.warnedSigns}   严重: ${stats.errorCount}   警告: ${stats.warningCount}`, margin, 46);

  const rows: (string | number)[][] = [];
  FLOOR_LIST.forEach((f) => {
    (scheme.signs[f] || []).forEach((s, idx) => {
      const tpl = SIGN_TEMPLATES[s.type];
      const sw = warnings.filter((w) => w.signId === s.id);
      const record = scheme.constructionRecords[s.id];
      rows.push([
        `${f}-${String(idx + 1).padStart(3, '0')}`,
        `${f}F / ${s.zone}`,
        tpl.label,
        s.name,
        `${s.position.x.toFixed(2)}, ${s.position.y.toFixed(2)}, ${s.position.z.toFixed(2)}`,
        `${s.width}×${s.height}`,
        sw.length ? (sw.some((w) => w.level === 'error') ? '严重' : '警告') : '—',
        record ? STATUS_LABEL[record.status] : '未领料',
      ]);
    });
  });

  autoTable(doc, {
    startY: 54,
    head: [['编号', '位置', '类型', '名称', '设计坐标(m)', '尺寸', '风险', '状态']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      4: { cellWidth: 36 },
      6: { cellWidth: 14 },
      7: { cellWidth: 16 },
    },
  });

  const warnRows = warnings.map((w, i) => [
    String(i + 1),
    LEVEL_LABEL[w.level],
    CATEGORY_LABEL[w.category] || w.category,
    w.signId,
    w.message,
    w.suggestion,
  ]);
  if (warnRows.length) {
    if ((doc as any).lastAutoTable.finalY + 40 > pageH) doc.addPage();
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('二、风险整改清单', margin, (doc as any).lastAutoTable.finalY + 14);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['#', '等级', '类别', '标牌ID', '问题描述', '整改建议']],
      body: warnRows,
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: { fillColor: [242, 107, 58], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 12 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24 },
      },
    });
  }

  const shotEntries = Object.entries(screenshotDataUrls).slice(0, 8);
  if (shotEntries.length) {
    doc.addPage();
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('三、风险现场截图', margin, 20);
    let y = 28;
    const imgW = 84;
    const imgH = 58;
    shotEntries.forEach(([signId, url], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (imgW + 8);
      const iy = y + row * (imgH + 14);
      if (iy + imgH > pageH - 20) {
        doc.addPage();
        y = 20;
      }
      try {
        doc.addImage(url, 'PNG', x, iy + 6, imgW, imgH);
      } catch {}
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`标牌: ${signId}`, x, iy + 4);
    });
  }

  doc.addPage();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('四、保洁与安保巡检注意点', margin, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const notes = [
    '【保洁】亚克力标牌使用中性清洁剂，避免酒精腐蚀；每周至少擦拭 1 次。',
    '【保洁】高处标牌（≥2.2m）擦拭需使用人字梯并系安全绳，禁止单脚作业。',
    '【保洁】立式导视牌底座周围易积灰，每日巡检时用干布擦拭。',
    '【安保】检查消防栓前方 0.5m 范围内无标牌遮挡，确保应急取用。',
    '【安保】夜班巡查标牌夜间反光条（如有）是否完好，应急逃生方向牌状态。',
    '【安保】监控盲区标牌应纳入重点巡检清单，防止人为损坏或恶意覆盖。',
    '【无障碍】轮椅通道旁标牌底部 ≥ 0.9m，顶部 ≤ 2.5m，发现移位立即报修。',
    '施工队联系：物业工程部 · 分机 8001',
  ];
  let ty = 32;
  notes.forEach((n) => {
    doc.text(`• ${n}`, margin + 2, ty);
    ty += 7;
  });

  const fname = `${scheme.name}-安装清单.pdf`;
  doc.save(fname);
  return fname;
}

export function exportJSON(data: ExportData) {
  const blob = new Blob([JSON.stringify(data.scheme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.scheme.name}-方案数据.json`;
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}
