import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExhibitionObject, RiskItem, MallConfig, PowerCheckpoint } from '../types';
import { generateLoadBasis, generatePassageBasis, generateRectificationOpinion } from '../utils/riskEngine';
import { formatWeight, formatArea } from '../utils/unitConversion';

const createPdfContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 595px;
    background: #ffffff;
    padding: 40px 30px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', sans-serif;
    color: #333333;
    line-height: 1.6;
    box-sizing: border-box;
  `;
  document.body.appendChild(container);
  return container;
};

const removeContainer = (container: HTMLElement) => {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
};

const renderToPdf = async (
  container: HTMLElement,
  filename: string,
  pageOptions: { pageSize?: 'a4'; orientation?: 'p' } = {}
) => {
  const { pageSize = 'a4', orientation = 'p' } = pageOptions;
  
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: 595,
  });
  
  const doc = new jsPDF(orientation, 'mm', pageSize);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let remainingHeight = imgHeight;
  let currentDrawY = 0;
  let pageCount = 0;
  
  while (remainingHeight > 0) {
    if (pageCount > 0) {
      doc.addPage();
    }
    
    const drawHeight = Math.min(remainingHeight, pageHeight - 20);
    
    const sliceCanvas = document.createElement('canvas');
    const srcY = (currentDrawY * canvas.width) / imgWidth;
    const srcHeight = (drawHeight * canvas.width) / imgWidth;
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.max(1, srcHeight);
    
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        canvas,
        0, Math.max(0, srcY),
        canvas.width, Math.max(1, srcHeight),
        0, 0,
        sliceCanvas.width, sliceCanvas.height
      );
      
      const sliceData = sliceCanvas.toDataURL('image/png');
      doc.addImage(sliceData, 'PNG', 10, 10, imgWidth, drawHeight);
    }
    
    remainingHeight -= drawHeight;
    currentDrawY += drawHeight;
    pageCount++;
  }
  
  doc.save(filename);
};

const getObjectTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    booth: '展台',
    car: '车辆',
    barrier: '围挡',
    power: '电源点',
    fire_exit: '消防通道',
    entrance: '客流入口',
  };
  return typeMap[type] || type;
};

const getSeverityColor = (severity: string): string => {
  return severity === 'danger' ? '#dc2626' : severity === 'warning' ? '#f59e0b' : '#22c55e';
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportScheme = useCallback(
    async (brandInfo: {
      brandName: string;
      exhibitionName: string;
      contact: string;
      phone: string;
      date: string;
    }) => {
      setIsExporting(true);
      const container = createPdfContainer();
      
      try {
        const canvas = document.querySelector('canvas');
        
        const riskStore = await import('../store/useRiskStore');
        const risks = riskStore.useRiskStore.getState().risks;
        const objectStore = await import('../store/useObjectStore');
        const objects = objectStore.useObjectStore.getState().objects;
        const mallStore = await import('../store/useMallStore');
        const mall = mallStore.useMallStore.getState().config;

        const dangerCount = risks.filter(r => r.severity === 'danger').length;
        const warningCount = risks.filter(r => r.severity === 'warning').length;

        let sceneImageHtml = '';
        if (canvas) {
          const canvasDataUrl = canvas.toDataURL('image/png');
          sceneImageHtml = `<img src="${canvasDataUrl}" style="width: 100%; max-width: 500px; margin: 15px auto; display: block; border: 1px solid #e5e7eb; border-radius: 8px;" />`;
        }

        let risksHtml = '';
        if (risks.length > 0) {
          risksHtml += `
            <div style="margin: 20px 0;">
              <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px;">风险提示</h2>
          `;
          
          if (dangerCount > 0) {
            risksHtml += `
              <p style="color: #dc2626; font-weight: bold; margin: 8px 0;">
                ⚠️ 需要调整 (${dangerCount}项严重，${warningCount}项警告)
              </p>
            `;
          } else {
            risksHtml += `
              <p style="color: #f59e0b; font-weight: bold; margin: 8px 0;">
                ⚠️ 建议优化 (${warningCount}项警告)
              </p>
            `;
          }

          risks.filter(r => r.severity === 'danger').forEach((risk, idx) => {
            const obj = objects.find(o => o.id === risk.objectId);
            risksHtml += `
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px 12px; margin: 8px 0; border-radius: 4px;">
                <p style="font-weight: bold; color: #dc2626; margin: 0 0 4px 0;">${idx + 1}. 🔴 ${escapeHtml(risk.message)}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">涉及物体: ${escapeHtml(obj?.name || '未知')}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">建议: ${escapeHtml(risk.basis)}</p>
                ${risk.suggestedPosition ? `<p style="font-size: 12px; color: #6b7280; margin: 2px 0;">建议位置: (${risk.suggestedPosition[0].toFixed(1)}, ${risk.suggestedPosition[2].toFixed(1)})</p>` : ''}
              </div>
            `;
          });

          risks.filter(r => r.severity === 'warning').forEach((risk, idx) => {
            const obj = objects.find(o => o.id === risk.objectId);
            risksHtml += `
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 12px; margin: 8px 0; border-radius: 4px;">
                <p style="font-weight: bold; color: #d97706; margin: 0 0 4px 0;">${idx + 1}. 🟡 ${escapeHtml(risk.message)}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">涉及物体: ${escapeHtml(obj?.name || '未知')}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">建议: ${escapeHtml(risk.basis)}</p>
              </div>
            `;
          });

          risksHtml += '</div>';
        } else {
          risksHtml = `
            <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
              <p style="color: #15803d; font-weight: bold; margin: 0;">✅ 布展方案符合所有安全规范，可予以通过</p>
            </div>
          `;
        }

        let objectsHtml = `
          <div style="margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px;">一、展具清单</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">名称</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">类型</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">重量</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">面积</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">位置</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        objects.forEach((obj) => {
          objectsHtml += `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(obj.name)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${getObjectTypeName(obj.type)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${formatWeight(obj.weight, obj.weightUnit)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${formatArea(obj.area, obj.areaUnit)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">(${obj.position[0].toFixed(1)}, ${obj.position[2].toFixed(1)})</td>
            </tr>
          `;
        });
        
        objectsHtml += '</tbody></table></div>';

        const loadBasisHtml = `
          <div style="margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px;">二、承重计算依据</h2>
            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
              ${escapeHtml(generateLoadBasis(objects, mall))}
            </div>
          </div>
        `;

        const passageBasisHtml = `
          <div style="margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-left: 4px solid #3b82f6; padding-left: 10px;">三、通道检测依据</h2>
            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
              ${escapeHtml(generatePassageBasis(risks, objects, mall))}
            </div>
          </div>
        `;

        const html = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">布展方案</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>品牌方:</strong> ${escapeHtml(brandInfo.brandName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>展会名称:</strong> ${escapeHtml(brandInfo.exhibitionName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>联系人:</strong> ${escapeHtml(brandInfo.contact)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>联系电话:</strong> ${escapeHtml(brandInfo.phone)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>布展日期:</strong> ${escapeHtml(brandInfo.date)}</p>
          </div>
          
          ${sceneImageHtml}
          ${risksHtml}
          ${objectsHtml}
          ${loadBasisHtml}
          ${passageBasisHtml}
          
          <div style="margin-top: 40px; text-align: right; font-size: 12px; color: #6b7280;">
            <p>物业审批人签字: _______________</p>
            <p style="margin-top: 8px;">日期: ${escapeHtml(brandInfo.date)}</p>
          </div>
        `;

        container.innerHTML = html;
        
        const title = `${brandInfo.brandName}_${brandInfo.exhibitionName}_布展方案`;
        await renderToPdf(container, `${title}_${brandInfo.date}.pdf`);
      } finally {
        removeContainer(container);
        setIsExporting(false);
      }
    },
    []
  );

  const exportRectification = useCallback(
    async (
      brandInfo: {
        brandName: string;
        exhibitionName: string;
        contact: string;
        phone: string;
        date: string;
      },
      basis: {
        rectification: string;
        loadBasis: string;
        passageBasis: string;
      }
    ) => {
      setIsExporting(true);
      const container = createPdfContainer();
      
      try {
        const renderOpinion = (text: string): string => {
          return text.split('\n').map(line => {
            if (line.startsWith('# ')) {
              return `<h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0 10px 0;">${line.replace(/^#\s+/, '')}</h2>`;
            } else if (line.startsWith('## ')) {
              return `<h3 style="font-size: 15px; font-weight: bold; color: #374151; margin: 12px 0 8px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">${line.replace(/^##\s+/, '')}</h3>`;
            } else if (line.startsWith('### ')) {
              return `<h4 style="font-size: 13px; font-weight: bold; color: #4b5563; margin: 10px 0 6px 0;">${line.replace(/^###\s+/, '')}</h4>`;
            } else if (line.startsWith('---')) {
              return '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />';
            } else if (line.startsWith('- ')) {
              return `<p style="margin: 4px 0; padding-left: 20px; text-indent: -15px; font-size: 13px; color: #4b5563;">• ${line.replace(/^-\s+/, '')}</p>`;
            } else if (line.trim() === '') {
              return '<p style="margin: 4px 0;">&nbsp;</p>';
            } else {
              return `<p style="margin: 6px 0; font-size: 13px; color: #4b5563; line-height: 1.8;">${escapeHtml(line)}</p>`;
            }
          }).join('');
        };

        const html = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">布展整改意见</h1>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>品牌方:</strong> ${escapeHtml(brandInfo.brandName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>展会名称:</strong> ${escapeHtml(brandInfo.exhibitionName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>出具日期:</strong> ${escapeHtml(brandInfo.date)}</p>
          </div>
          
          <div style="margin: 20px 0;">
            ${renderOpinion(basis.rectification)}
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin: 12px 0 8px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">承重计算依据</h3>
            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
              ${escapeHtml(basis.loadBasis)}
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin: 12px 0 8px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">通道检测依据</h3>
            <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
              ${escapeHtml(basis.passageBasis)}
            </div>
          </div>
          
          <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #6b7280;">
            <p style="margin-bottom: 8px;">物业审批人签字: _______________</p>
            <p>日期: ${escapeHtml(brandInfo.date)}</p>
          </div>
        `;

        container.innerHTML = html;
        await renderToPdf(container, `整改意见_${brandInfo.brandName}_${brandInfo.date}.pdf`);
      } finally {
        removeContainer(container);
        setIsExporting(false);
      }
    },
    []
  );

  const exportDismantleReport = useCallback(
    async (
      checkpoints: PowerCheckpoint[]
    ) => {
      setIsExporting(true);
      const container = createPdfContainer();
      
      try {
        const checkedCount = checkpoints.filter(c => c.status === 'checked').length;
        const totalCount = checkpoints.length;
        
        let tableRows = '';
        checkpoints.forEach((cp, idx) => {
          let statusText = '';
          let statusColor = '';
          if (cp.status === 'checked') {
            statusText = '✓ 已核对';
            statusColor = '#15803d';
          } else if (cp.status === 'issue') {
            statusText = '✗ 有问题';
            statusColor = '#dc2626';
          } else {
            statusText = '○ 待核对';
            statusColor = '#d97706';
          }
          
          tableRows += `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(cp.name)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(cp.location)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; color: ${statusColor}; font-weight: bold;">${statusText}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(cp.checkedBy || '____')}</td>
            </tr>
          `;
        });

        const progressColor = checkedCount === totalCount ? '#15803d' : '#d97706';

        const html = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">撤展电源点核对清单</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;">
              <strong>核对日期:</strong> ${new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 8px; width: 10%;">序号</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; width: 25%;">电源点</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; width: 30%;">位置</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; width: 20%;">状态</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; width: 15%;">核对人</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div style="margin: 20px 0; padding: 15px; background: ${checkedCount === totalCount ? '#f0fdf4' : '#fffbeb'}; border-radius: 8px;">
            <p style="font-weight: bold; color: ${progressColor}; margin: 0 0 8px 0;">
              核对进度: ${checkedCount}/${totalCount} 个电源点已完成
            </p>
            ${checkedCount === totalCount ? '<p style="color: #15803d; margin: 0;">✅ 所有电源点已核对完成，撤展工作完成</p>' : ''}
          </div>
          
          <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #6b7280;">
            <p style="margin-bottom: 8px;">物业核对人签字: _______________</p>
          </div>
        `;

        container.innerHTML = html;
        await renderToPdf(container, `撤展电源核对单_${new Date().toISOString().split('T')[0]}.pdf`);
      } finally {
        removeContainer(container);
        setIsExporting(false);
      }
    },
    []
  );

  const exportToPDF = useCallback(
    async (
      title: string,
      objects: ExhibitionObject[],
      risks: RiskItem[],
      mall: MallConfig,
      canvasElement?: HTMLCanvasElement
    ) => {
      setIsExporting(true);
      const container = createPdfContainer();
      
      try {
        let sceneImageHtml = '';
        if (canvasElement) {
          const canvasDataUrl = canvasElement.toDataURL('image/png');
          sceneImageHtml = `<img src="${canvasDataUrl}" style="width: 100%; max-width: 500px; margin: 15px auto; display: block; border: 1px solid #e5e7eb; border-radius: 8px;" />`;
        }

        const dangerCount = risks.filter(r => r.severity === 'danger').length;
        const warningCount = risks.filter(r => r.severity === 'warning').length;

        let risksHtml = '';
        if (risks.length > 0) {
          risksHtml += `<h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 20px 0 12px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">风险提示</h2>`;
          
          if (dangerCount > 0) {
            risksHtml += `<p style="color: #dc2626; font-weight: bold; margin: 8px 0;">⚠️ 需要调整 (${dangerCount}项严重，${warningCount}项警告)</p>`;
          } else {
            risksHtml += `<p style="color: #f59e0b; font-weight: bold; margin: 8px 0;">⚠️ 建议优化 (${warningCount}项警告)</p>`;
          }

          risks.filter(r => r.severity === 'danger').forEach((risk, idx) => {
            const obj = objects.find(o => o.id === risk.objectId);
            risksHtml += `
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px 12px; margin: 8px 0; border-radius: 4px;">
                <p style="font-weight: bold; color: #dc2626; margin: 0 0 4px 0;">${idx + 1}. 🔴 ${escapeHtml(risk.message)}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">涉及物体: ${escapeHtml(obj?.name || '未知')}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">建议: ${escapeHtml(risk.basis)}</p>
              </div>
            `;
          });

          risks.filter(r => r.severity === 'warning').forEach((risk, idx) => {
            const obj = objects.find(o => o.id === risk.objectId);
            risksHtml += `
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 12px; margin: 8px 0; border-radius: 4px;">
                <p style="font-weight: bold; color: #d97706; margin: 0 0 4px 0;">${idx + 1}. 🟡 ${escapeHtml(risk.message)}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">涉及物体: ${escapeHtml(obj?.name || '未知')}</p>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">建议: ${escapeHtml(risk.basis)}</p>
              </div>
            `;
          });
        } else {
          risksHtml = `
            <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
              <p style="color: #15803d; font-weight: bold; margin: 0;">✅ 布展方案符合所有安全规范，可予以通过</p>
            </div>
          `;
        }

        let objectsHtml = `
          <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 20px 0 12px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">展具清单</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">名称</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">类型</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">重量</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">面积</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">位置</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        objects.forEach((obj) => {
          objectsHtml += `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${escapeHtml(obj.name)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${getObjectTypeName(obj.type)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${formatWeight(obj.weight, obj.weightUnit)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${formatArea(obj.area, obj.areaUnit)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">(${obj.position[0].toFixed(1)}, ${obj.position[2].toFixed(1)})</td>
            </tr>
          `;
        });
        
        objectsHtml += '</tbody></table>';

        const html = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">${escapeHtml(title)}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 15px 20px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>商场:</strong> ${escapeHtml(mall.name)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #4b5563;"><strong>日期:</strong> ${new Date().toLocaleDateString('zh-CN')}</p>
          </div>
          
          ${sceneImageHtml}
          ${risksHtml}
          ${objectsHtml}
          
          <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 20px 0 12px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">承重计算依据</h2>
          <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
            ${escapeHtml(generateLoadBasis(objects, mall))}
          </div>
          
          <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 20px 0 12px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">通道检测依据</h2>
          <div style="background: #f9fafb; padding: 12px 15px; border-radius: 4px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">
            ${escapeHtml(generatePassageBasis(risks, objects, mall))}
          </div>
        `;

        container.innerHTML = html;
        await renderToPdf(container, `${title}_${new Date().toISOString().split('T')[0]}.pdf`);
      } finally {
        removeContainer(container);
        setIsExporting(false);
      }
    },
    []
  );

  const exportRectificationOpinion = useCallback(
    async (
      planName: string,
      brandName: string,
      objects: ExhibitionObject[],
      risks: RiskItem[],
      mall: MallConfig
    ) => {
      setIsExporting(true);
      const container = createPdfContainer();
      
      try {
        const opinionText = generateRectificationOpinion(risks, objects, mall);
        
        const renderOpinion = (text: string): string => {
          return text.split('\n').map(line => {
            if (line.startsWith('# ')) {
              return `<h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 15px 0 10px 0;">${line.replace(/^#\s+/, '')}</h2>`;
            } else if (line.startsWith('## ')) {
              return `<h3 style="font-size: 15px; font-weight: bold; color: #374151; margin: 12px 0 8px 0; border-left: 4px solid #3b82f6; padding-left: 10px;">${line.replace(/^##\s+/, '')}</h3>`;
            } else if (line.startsWith('### ')) {
              return `<h4 style="font-size: 13px; font-weight: bold; color: #4b5563; margin: 10px 0 6px 0;">${line.replace(/^###\s+/, '')}</h4>`;
            } else if (line.startsWith('---')) {
              return '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />';
            } else if (line.startsWith('- ')) {
              return `<p style="margin: 4px 0; padding-left: 20px; text-indent: -15px; font-size: 13px; color: #4b5563;">• ${line.replace(/^-\s+/, '')}</p>`;
            } else if (line.trim() === '') {
              return '<p style="margin: 4px 0;">&nbsp;</p>';
            } else {
              return `<p style="margin: 6px 0; font-size: 13px; color: #4b5563; line-height: 1.8;">${escapeHtml(line)}</p>`;
            }
          }).join('');
        };

        const html = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0;">布展整改意见</h1>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>方案名称:</strong> ${escapeHtml(planName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>品牌方:</strong> ${escapeHtml(brandName)}</p>
            <p style="margin: 6px 0; font-size: 13px; color: #991b1b;"><strong>出具日期:</strong> ${new Date().toLocaleDateString('zh-CN')}</p>
          </div>
          
          <div style="margin: 20px 0;">
            ${renderOpinion(opinionText)}
          </div>
          
          <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #6b7280;">
            <p style="margin-bottom: 8px;">物业审批人签字: _______________</p>
            <p>日期: ${new Date().toLocaleDateString('zh-CN')}</p>
          </div>
        `;

        container.innerHTML = html;
        await renderToPdf(container, `整改意见_${brandName}_${planName}.pdf`);
      } finally {
        removeContainer(container);
        setIsExporting(false);
      }
    },
    []
  );

  const exportAsImage = useCallback(
    async (canvasElement: HTMLCanvasElement, filename: string) => {
      const link = document.createElement('a');
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvasElement.toDataURL('image/png');
      link.click();
    },
    []
  );

  return {
    isExporting,
    exportScheme,
    exportRectification,
    exportToPDF,
    exportRectificationOpinion,
    exportDismantleReport,
    exportAsImage,
  };
};
