import type { LiftPlan, RiskItem } from '@/types';
import type { OperationRisk } from '@/hooks/useRiskEngine';
import { toTon } from './unitConvert';

const riskLevelLabel: Record<RiskItem['level'], string> = {
  danger: '危险',
  warning: '警告',
  info: '提示',
  notice: '说明',
};

const riskCategoryLabel: Record<RiskItem['category'], string> = {
  radius: '半径超限',
  collision: '碰撞风险',
  walkway: '通道占用',
  capacity: '载荷超限',
  special: '特殊工况',
};

export const buildBriefingHTML = (
  plan: LiftPlan,
  operationRisks: OperationRisk[]
): string => {
  const cargoTon = toTon(plan.cargo.weight, plan.cargo.weightUnit);
  const byLevel: Record<RiskItem['level'], RiskItem[]> = {
    danger: [], warning: [], info: [], notice: [],
  };
  plan.risks.forEach(r => byLevel[r.level].push(r));

  const opRows = plan.operations
    .map((op) => {
      const or = operationRisks.find(o => o.operationId === op.id);
      return `
      <tr>
        <td style="padding:6px 10px;border:1px solid #445;">${op.liftNo}</td>
        <td style="padding:6px 10px;border:1px solid #445;">${op.armLength.toFixed(1)} m</td>
        <td style="padding:6px 10px;border:1px solid #445;">${op.startAngle}° ~ ${op.endAngle}°</td>
        <td style="padding:6px 10px;border:1px solid #445;">(${op.liftPoint[0].toFixed(1)}, ${op.liftPoint[2].toFixed(1)})</td>
        <td style="padding:6px 10px;border:1px solid #445;">(${op.dropPoint[0].toFixed(1)}, ${op.dropPoint[2].toFixed(1)})</td>
        <td style="padding:6px 10px;border:1px solid #445;">${or ? or.maxSafeRadius.toFixed(1) : '-'} m</td>
        <td style="padding:6px 10px;border:1px solid #445;color:${op.reviewed ? '#2ED573' : '#FFA502'};">${op.reviewed ? '✓ 已复查' : '待复查'}</td>
      </tr>`;
    })
    .join('');

  const riskCards = (['danger', 'warning', 'info', 'notice'] as RiskItem['level'][])
    .filter(l => byLevel[l].length > 0)
    .map((lv) => `
      <div style="margin:10px 0;padding:12px 16px;border-left:4px solid ${
        lv === 'danger' ? '#FF4757' : lv === 'warning' ? '#FFA502' : lv === 'info' ? '#5352ED' : '#A0AEC0'
      };background:${
        lv === 'danger' ? 'rgba(255,71,87,.08)' : lv === 'warning' ? 'rgba(255,165,2,.08)' : lv === 'info' ? 'rgba(83,82,237,.08)' : 'rgba(160,174,192,.08)'
      };">
        <div style="font-weight:700;margin-bottom:6px;">【${riskLevelLabel[lv]}】共 ${byLevel[lv].length} 项</div>
        ${byLevel[lv].map(r => `
          <div style="margin:6px 0;padding:8px;background:rgba(255,255,255,.04);border-radius:4px;">
            <div style="font-weight:600;">● ${riskCategoryLabel[r.category]}｜${r.title}</div>
            <div style="font-size:13px;color:#B8C5D6;margin-top:4px;">${r.description}</div>
          </div>`).join('')}
      </div>`)
    .join('');

  const img = plan.screenshot
    ? `<img src="${plan.screenshot}" style="width:100%;max-width:800px;border:1px solid #334;border-radius:6px;margin:10px 0;"/>`
    : `<div style="padding:60px;text-align:center;border:1px dashed #556;color:#889;">（请在主界面点"方案截图"以添加3D视图）</div>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>吊装交底 - ${plan.planNo}</title>
<style>
  body { font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; background:#0A1628; color:#E2E8F0; padding:32px; max-width:1000px; margin:0 auto; line-height:1.6; }
  h1 { font-size:26px; margin:0 0 8px; color:#FF8A3D; }
  h2 { font-size:18px; margin:24px 0 12px; padding-bottom:6px; border-bottom:1px solid #2a3a55; color:#7EC8FF; }
  .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; font-size:13px; color:#A0B0C5; }
  .meta div { padding:6px 10px; background:#12213a; border-radius:4px; }
  .kv { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .kv div { padding:10px 14px; background:#12213a; border-radius:4px; }
  .kv b { color:#FF8A3D; display:block; font-size:12px; margin-bottom:2px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#1B2E51; padding:8px 10px; text-align:left; border:1px solid #445; color:#7EC8FF; }
  footer { margin-top:40px; padding-top:16px; border-top:1px solid #2a3a55; font-size:12px; color:#667; text-align:center; }
  @media print { body { background:#fff; color:#000; padding:16px; } h1 { color:#000; } h2 { color:#111; } .meta div,.kv div,th { background:#f5f5f5; color:#000; } }
</style>
</head>
<body>
  <div style="display:flex;align-items:end;justify-content:space-between;border-bottom:2px solid #FF8A3D;padding-bottom:12px;">
    <div>
      <h1>散货码头大件吊装安全交底</h1>
      <div style="color:#A0B0C5;">方案名称：<b style="color:#E2E8F0;">${plan.name}</b></div>
    </div>
    <div style="text-align:right; font-size:14px;">
      <div>方案编号：<b style="color:#FF8A3D;">${plan.planNo}</b></div>
      <div>版本：V${plan.version}${plan.locked ? '（已锁定）' : ''}</div>
    </div>
  </div>

  <h2>基本信息</h2>
  <div class="meta">
    <div>创建人：${plan.createUser}</div>
    <div>创建时间：${plan.createTime}</div>
    <div>现场风速：${plan.windSpeed.toFixed(1)} m/s</div>
  </div>

  <h2>吊车参数</h2>
  <div class="kv">
    <div><b>型号</b>${plan.crane.brand ?? ''} ${plan.crane.model}</div>
    <div><b>最大臂长</b>${plan.crane.maxArmLength.toFixed(1)} m</div>
    <div><b>额定起重</b>${plan.crane.ratedCapacity.toFixed(0)} t</div>
    <div><b>停靠坐标</b>X=${plan.crane.basePosition[0].toFixed(1)}, Y=${plan.crane.basePosition[2].toFixed(1)}</div>
  </div>

  <h2>货物参数</h2>
  <div class="kv">
    <div><b>名称</b>${plan.cargo.name}</div>
    <div><b>重量</b>${plan.cargo.weight} ${plan.cargo.weightUnit === 'ton' ? '吨' : '公斤'}（${cargoTon.toFixed(2)} t）</div>
    <div><b>外形尺寸</b>长 ${plan.cargo.length.toFixed(2)} × 宽 ${plan.cargo.width.toFixed(2)} × 高 ${(plan.cargo.height ?? 3).toFixed(2)} m${!plan.cargo.height ? '（估算）' : ''}</div>
    <div><b>吊点偏心</b>X=${plan.cargo.liftPointOffsetX.toFixed(2)}m, Y=${plan.cargo.liftPointOffsetY.toFixed(2)}m</div>
  </div>

  <h2>3D 场景截图</h2>
  ${img}

  <h2>各吊次参数</h2>
  <table>
    <thead><tr><th>吊次</th><th>臂长</th><th>回转角</th><th>起吊点</th><th>落吊点</th><th>安全半径</th><th>复查状态</th></tr></thead>
    <tbody>${opRows}</tbody>
  </table>

  <h2>风险与控制措施</h2>
  ${riskCards || '<div style="color:#2ED573;padding:16px;background:rgba(46,213,115,.08);border-radius:6px;">✓ 暂无待处理风险项</div>'}

  <h2>备注</h2>
  <div style="padding:14px;background:#12213a;border-radius:6px;white-space:pre-wrap;">${plan.remarks || '（无）'}</div>

  <footer>
    本方案由《码头吊车半径预演》系统生成 V1.0 ｜ 打印时间：${new Date().toLocaleString('zh-CN', { hour12: false })}
    ｜ 交接班所有作业人员已确认阅读同一版方案后方可开工
  </footer>
</body>
</html>`;
};

export const downloadBriefing = (plan: LiftPlan, operationRisks: OperationRisk[]) => {
  const html = buildBriefingHTML(plan, operationRisks);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `交底-${plan.planNo}-V${plan.version}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
