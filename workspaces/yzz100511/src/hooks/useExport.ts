import { useCallback, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExhibitionObject, RiskItem, MallConfig } from '../types';
import { generateLoadBasis, generatePassageBasis, generateRectificationOpinion } from '../utils/riskEngine';
import { formatWeight, formatArea } from '../utils/unitConversion';

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
      try {
        const canvas = document.querySelector('canvas');
        const title = `${brandInfo.brandName}_${brandInfo.exhibitionName}_布展方案`;
        
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('布展方案', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`品牌方: ${brandInfo.brandName}`, 20, yPosition);
        yPosition += 8;
        doc.text(`展会名称: ${brandInfo.exhibitionName}`, 20, yPosition);
        yPosition += 8;
        doc.text(`联系人: ${brandInfo.contact}`, 20, yPosition);
        yPosition += 8;
        doc.text(`联系电话: ${brandInfo.phone}`, 20, yPosition);
        yPosition += 8;
        doc.text(`布展日期: ${brandInfo.date}`, 20, yPosition);
        yPosition += 15;

        if (canvas) {
          const canvasDataUrl = canvas.toDataURL('image/png');
          const imgWidth = 170;
          const imgHeight = 120;
          doc.addImage(canvasDataUrl, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        }

        const riskStore = await import('../store/useRiskStore');
        const risks = riskStore.useRiskStore.getState().risks;
        const objectStore = await import('../store/useObjectStore');
        const objects = objectStore.useObjectStore.getState().objects;
        const mallStore = await import('../store/useMallStore');
        const mall = mallStore.useMallStore.getState().config;

        if (risks.length > 0) {
          if (yPosition + 40 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          const dangerCount = risks.filter(r => r.severity === 'danger').length;
          const warningCount = risks.filter(r => r.severity === 'warning').length;
          
          if (dangerCount > 0) {
            doc.setTextColor(220, 38, 38);
            doc.text(`⚠️ 需要调整 (${dangerCount}项严重，${warningCount}项警告)`, 20, yPosition);
          } else {
            doc.setTextColor(245, 158, 11);
            doc.text(`⚠️ 建议优化 (${warningCount}项警告)`, 20, yPosition);
          }
          doc.setTextColor(0, 0, 0);
          yPosition += 10;

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          
          risks.filter(r => r.severity === 'danger').forEach((risk, idx) => {
            if (yPosition + 20 > pageHeight) {
              doc.addPage();
              yPosition = 20;
            }
            
            const obj = objects.find(o => o.id === risk.objectId);
            doc.setFillColor(254, 202, 202);
            doc.rect(20, yPosition - 5, 170, 18, 'F');
            doc.text(`${idx + 1}. 🔴 ${risk.message}`, 25, yPosition + 1);
            yPosition += 12;
            doc.setFontSize(9);
            doc.text(`   涉及: ${obj?.name || '未知'}`, 25, yPosition + 1);
            yPosition += 7;
            doc.text(`   建议: ${risk.basis}`, 25, yPosition + 1);
            if (risk.suggestedPosition) {
              yPosition += 7;
              doc.text(`   建议位置: (${risk.suggestedPosition[0].toFixed(1)}, ${risk.suggestedPosition[2].toFixed(1)})`, 25, yPosition + 1);
            }
            yPosition += 10;
            doc.setFontSize(11);
          });

          risks.filter(r => r.severity === 'warning').forEach((risk, idx) => {
            if (yPosition + 20 > pageHeight) {
              doc.addPage();
              yPosition = 20;
            }
            
            const obj = objects.find(o => o.id === risk.objectId);
            doc.setFillColor(254, 215, 170);
            doc.rect(20, yPosition - 5, 170, 18, 'F');
            doc.text(`${idx + 1}. 🟡 ${risk.message}`, 25, yPosition + 1);
            yPosition += 12;
            doc.setFontSize(9);
            doc.text(`   涉及: ${obj?.name || '未知'}`, 25, yPosition + 1);
            yPosition += 7;
            doc.text(`   建议: ${risk.basis}`, 25, yPosition + 1);
            yPosition += 10;
            doc.setFontSize(11);
          });
          
          yPosition += 10;
        } else {
          if (yPosition + 20 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFontSize(12);
          doc.setTextColor(34, 197, 94);
          doc.text('✅ 布展方案符合所有安全规范，可予以通过', 20, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 15;
        }

        doc.addPage();
        yPosition = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('一、展具清单', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('名称', 20, yPosition);
        doc.text('类型', 60, yPosition);
        doc.text('重量', 90, yPosition);
        doc.text('面积', 130, yPosition);
        doc.text('位置', 165, yPosition);
        yPosition += 6;
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;

        objects.forEach((obj) => {
          if (yPosition + 15 > pageHeight) {
            doc.addPage();
            yPosition = 20;
            doc.setFontSize(10);
          }
          doc.text(obj.name, 20, yPosition);
          doc.text(obj.type, 60, yPosition);
          doc.text(formatWeight(obj.weight, obj.weightUnit), 90, yPosition);
          doc.text(formatArea(obj.area, obj.areaUnit), 130, yPosition);
          doc.text(`(${obj.position[0].toFixed(1)}, ${obj.position[2].toFixed(1)})`, 165, yPosition);
          yPosition += 8;
        });

        doc.addPage();
        yPosition = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('二、承重计算依据', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const loadBasisLines = generateLoadBasis(objects, mall).split('\n');
        loadBasisLines.forEach((line) => {
          if (yPosition + 8 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });

        doc.addPage();
        yPosition = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('三、通道检测依据', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const passageBasisLines = generatePassageBasis(risks, objects, mall).split('\n');
        passageBasisLines.forEach((line) => {
          if (yPosition + 8 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });

        doc.save(`${title}_${brandInfo.date}.pdf`);
      } finally {
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
      try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPosition = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('布展整改意见', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`品牌方: ${brandInfo.brandName}`, 20, yPosition);
        yPosition += 8;
        doc.text(`展会名称: ${brandInfo.exhibitionName}`, 20, yPosition);
        yPosition += 8;
        doc.text(`出具日期: ${brandInfo.date}`, 20, yPosition);
        yPosition += 15;

        const opinionLines = basis.rectification.split('\n');
        
        opinionLines.forEach((line) => {
          if (yPosition + 8 > 280) {
            doc.addPage();
            yPosition = 20;
          }
          
          if (line.startsWith('# ')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            yPosition += 5;
          } else if (line.startsWith('## ')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            yPosition += 3;
          } else if (line.startsWith('### ')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
          } else if (line.startsWith('---')) {
            doc.line(20, yPosition, 190, yPosition);
            yPosition += 5;
            return;
          } else if (line.startsWith('|')) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
          }
          
          doc.text(line.replace(/^#+\s*/, ''), 20, yPosition);
          yPosition += line.startsWith('|') ? 7 : 6;
        });

        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('承重计算依据:', 20, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        basis.loadBasis.split('\n').forEach((line) => {
          if (yPosition + 8 > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });

        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('通道检测依据:', 20, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        basis.passageBasis.split('\n').forEach((line) => {
          if (yPosition + 8 > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });

        yPosition += 20;
        doc.line(120, yPosition, 190, yPosition);
        yPosition += 8;
        doc.text('物业审批人签字: _______________', 120, yPosition);
        yPosition += 8;
        doc.text(`日期: ${brandInfo.date}`, 120, yPosition);

        doc.save(`整改意见_${brandInfo.brandName}_${brandInfo.date}.pdf`);
      } finally {
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
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`商场: ${mall.name}`, 20, yPosition);
      yPosition += 8;
      doc.text(`日期: ${new Date().toLocaleDateString('zh-CN')}`, 20, yPosition);
      yPosition += 15;

      if (canvasElement) {
        const canvasDataUrl = canvasElement.toDataURL('image/png');
        const imgWidth = 170;
        const imgHeight = 120;
        doc.addImage(canvasDataUrl, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      if (risks.length > 0) {
        if (yPosition + 40 > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const dangerCount = risks.filter(r => r.severity === 'danger').length;
        const warningCount = risks.filter(r => r.severity === 'warning').length;
        
        if (dangerCount > 0) {
          doc.setTextColor(220, 38, 38);
          doc.text(`⚠️ 需要调整 (${dangerCount}项严重，${warningCount}项警告)`, 20, yPosition);
        } else {
          doc.setTextColor(245, 158, 11);
          doc.text(`⚠️ 建议优化 (${warningCount}项警告)`, 20, yPosition);
        }
        doc.setTextColor(0, 0, 0);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        risks.filter(r => r.severity === 'danger').forEach((risk, idx) => {
          if (yPosition + 20 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          
          const obj = objects.find(o => o.id === risk.objectId);
          doc.setFillColor(254, 202, 202);
          doc.rect(20, yPosition - 5, 170, 18, 'F');
          doc.text(`${idx + 1}. 🔴 ${risk.message}`, 25, yPosition + 1);
          yPosition += 12;
          doc.setFontSize(9);
          doc.text(`   涉及: ${obj?.name || '未知'}`, 25, yPosition + 1);
          yPosition += 7;
          doc.text(`   建议: ${risk.basis}`, 25, yPosition + 1);
          yPosition += 10;
          doc.setFontSize(11);
        });

        risks.filter(r => r.severity === 'warning').forEach((risk, idx) => {
          if (yPosition + 20 > pageHeight) {
            doc.addPage();
            yPosition = 20;
          }
          
          const obj = objects.find(o => o.id === risk.objectId);
          doc.setFillColor(254, 215, 170);
          doc.rect(20, yPosition - 5, 170, 18, 'F');
          doc.text(`${idx + 1}. 🟡 ${risk.message}`, 25, yPosition + 1);
          yPosition += 12;
          doc.setFontSize(9);
          doc.text(`   涉及: ${obj?.name || '未知'}`, 25, yPosition + 1);
          yPosition += 7;
          doc.text(`   建议: ${risk.basis}`, 25, yPosition + 1);
          yPosition += 10;
          doc.setFontSize(11);
        });
        
        yPosition += 10;
      } else {
        if (yPosition + 20 > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.text('✅ 布展方案符合所有安全规范，可予以通过', 20, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 15;
      }

      doc.addPage();
      yPosition = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('一、展具清单', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('名称', 20, yPosition);
      doc.text('类型', 60, yPosition);
      doc.text('重量', 90, yPosition);
      doc.text('面积', 130, yPosition);
      doc.text('位置', 165, yPosition);
      yPosition += 6;
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      objects.forEach((obj) => {
        if (yPosition + 15 > pageHeight) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(10);
        }
        doc.text(obj.name, 20, yPosition);
        doc.text(obj.type, 60, yPosition);
        doc.text(formatWeight(obj.weight, obj.weightUnit), 90, yPosition);
        doc.text(formatArea(obj.area, obj.areaUnit), 130, yPosition);
        doc.text(`(${obj.position[0].toFixed(1)}, ${obj.position[2].toFixed(1)})`, 165, yPosition);
        yPosition += 8;
      });

      doc.addPage();
      yPosition = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('二、承重计算依据', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const loadBasisLines = generateLoadBasis(objects, mall).split('\n');
      loadBasisLines.forEach((line) => {
        if (yPosition + 8 > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 6;
      });

      doc.addPage();
      yPosition = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('三、通道检测依据', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const passageBasisLines = generatePassageBasis(risks, objects, mall).split('\n');
      passageBasisLines.forEach((line) => {
        if (yPosition + 8 > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 6;
      });

      doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
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
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('布展整改意见', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`方案名称: ${planName}`, 20, yPosition);
      yPosition += 8;
      doc.text(`品牌方: ${brandName}`, 20, yPosition);
      yPosition += 8;
      doc.text(`出具日期: ${new Date().toLocaleDateString('zh-CN')}`, 20, yPosition);
      yPosition += 15;

      const opinionLines = generateRectificationOpinion(risks, objects, mall).split('\n');
      
      opinionLines.forEach((line) => {
        if (yPosition + 8 > 280) {
          doc.addPage();
          yPosition = 20;
        }
        
        if (line.startsWith('# ')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          yPosition += 5;
        } else if (line.startsWith('## ')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          yPosition += 3;
        } else if (line.startsWith('### ')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
        } else if (line.startsWith('---')) {
          doc.line(20, yPosition, 190, yPosition);
          yPosition += 5;
          return;
        } else if (line.startsWith('|')) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
        }
        
        doc.text(line.replace(/^#+\s*/, ''), 20, yPosition);
        yPosition += line.startsWith('|') ? 7 : 6;
      });

      yPosition += 20;
      doc.line(120, yPosition, 190, yPosition);
      yPosition += 8;
      doc.text('物业审批人签字: _______________', 120, yPosition);
      yPosition += 8;
      doc.text(`日期: ${new Date().toLocaleDateString('zh-CN')}`, 120, yPosition);

      doc.save(`整改意见_${brandName}_${planName}.pdf`);
    },
    []
  );

  const exportDismantleReport = useCallback(
    async (
      checkpoints: Array<{ name: string; location: string; status: string; checkedBy?: string; checkedAt?: string }>
    ) => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('撤展电源点核对清单', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`核对日期: ${new Date().toLocaleDateString('zh-CN')}`, 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('序号', 20, yPosition);
      doc.text('电源点', 45, yPosition);
      doc.text('位置', 80, yPosition);
      doc.text('状态', 150, yPosition);
      doc.text('核对人', 180, yPosition);
      yPosition += 6;
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      checkpoints.forEach((cp, idx) => {
        if (yPosition + 15 > 280) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(10);
        }
        
        doc.text(String(idx + 1), 20, yPosition);
        doc.text(cp.name, 45, yPosition);
        doc.text(cp.location, 80, yPosition);
        
        if (cp.status === 'checked') {
          doc.setTextColor(34, 197, 94);
          doc.text('✓ 已核对', 150, yPosition);
        } else if (cp.status === 'disconnected') {
          doc.setTextColor(234, 179, 8);
          doc.text('○ 已断电', 150, yPosition);
        } else {
          doc.setTextColor(220, 38, 38);
          doc.text('○ 待核对', 150, yPosition);
        }
        doc.setTextColor(0, 0, 0);
        
        doc.text(cp.checkedBy || '____', 180, yPosition);
        yPosition += 8;
        doc.line(20, yPosition, 115, yPosition);
        yPosition += 4;
      });

      const checkedCount = checkpoints.filter(c => c.status === 'checked').length;
      const totalCount = checkpoints.length;
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`核对进度: ${checkedCount}/${totalCount} 个电源点已完成`, 20, yPosition);
      
      if (checkedCount === totalCount) {
        doc.setTextColor(34, 197, 94);
        yPosition += 8;
        doc.text('✅ 所有电源点已核对完成，撤展工作完成', 20, yPosition);
        doc.setTextColor(0, 0, 0);
      }

      yPosition += 20;
      doc.line(120, yPosition, 190, yPosition);
      yPosition += 8;
      doc.text('物业核对人签字: _______________', 120, yPosition);

      doc.save(`撤展电源核对单_${new Date().toISOString().split('T')[0]}.pdf`);
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
