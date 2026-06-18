import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfSection {
  title?: string;
  content: string;
  type?: 'text' | 'title' | 'subtitle' | 'table' | 'divider' | 'list';
  color?: string;
  bold?: boolean;
  fontSize?: number;
}

export const createPdfContentContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 210mm;
    background: white;
    padding: 20mm;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    color: #333;
    line-height: 1.6;
  `;
  document.body.appendChild(container);
  return container;
};

export const removePdfContentContainer = (container: HTMLElement) => {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
};

export const renderHtmlToCanvas = async (element: HTMLElement, scale: number = 2): Promise<string> => {
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  });
  return canvas.toDataURL('image/png');
};

export const addImagePageToPdf = (
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const img = new Image();
  img.src = imageData;
  
  const imgWidth = img.width || 500;
  const imgHeight = img.height || 700;
  
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  const drawWidth = imgWidth * ratio;
  const drawHeight = imgHeight * ratio;
  
  doc.addImage(imageData, 'PNG', x, y, drawWidth, drawHeight);
  
  return { width: drawWidth, height: drawHeight };
};

export const generateChinesePdf = async (
  title: string,
  sections: PdfSection[],
  filename: string
): Promise<void> => {
  const container = createPdfContentContainer();
  
  try {
    let html = `
      <div style="padding: 0 0 20px 0;">
        <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px 0; color: #1a1a2e;">
          ${title}
        </h1>
      </div>
    `;
    
    sections.forEach((section) => {
      if (section.type === 'divider') {
        html += '<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;" />';
        return;
      }
      
      let style = '';
      if (section.type === 'title') {
        style = 'font-size: 18px; font-weight: bold; margin: 16px 0 10px 0; color: #1a1a2e;';
      } else if (section.type === 'subtitle') {
        style = 'font-size: 14px; font-weight: bold; margin: 12px 0 8px 0; color: #333;';
      } else if (section.type === 'table') {
        style = 'font-size: 11px; margin: 8px 0; color: #444; white-space: pre-wrap;';
      } else if (section.type === 'list') {
        style = 'font-size: 12px; margin: 6px 0; color: #444; padding-left: 20px;';
      } else {
        style = 'font-size: 12px; margin: 6px 0; color: #444;';
      }
      
      if (section.color) {
        style += ` color: ${section.color};`;
      }
      
      if (section.bold) {
        style += ' font-weight: bold;';
      }
      
      if (section.fontSize) {
        style += ` font-size: ${section.fontSize}px;`;
      }
      
      const tag = section.type === 'title' ? 'h2' : section.type === 'subtitle' ? 'h3' : 'p';
      html += `<${tag} style="${style}">${section.content}</${tag}>`;
    });
    
    container.innerHTML = html;
    
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 595,
    });
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPosition = 10;
    let remainingHeight = imgHeight;
    let currentY = 0;
    
    while (remainingHeight > 0) {
      const drawHeight = Math.min(remainingHeight, pageHeight - 20);
      
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = canvas.width;
      tmpCanvas.height = (drawHeight * canvas.width) / imgWidth;
      const ctx = tmpCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, currentY * canvas.width / imgWidth,
          canvas.width, (drawHeight * canvas.width) / imgWidth,
          0, 0,
          tmpCanvas.width, tmpCanvas.height
        );
        
        const sliceData = tmpCanvas.toDataURL('image/png');
        doc.addImage(sliceData, 'PNG', 10, yPosition, imgWidth, drawHeight);
      }
      
      remainingHeight -= drawHeight;
      currentY += drawHeight;
      yPosition = 10;
      
      if (remainingHeight > 0) {
        doc.addPage();
      }
    }
    
    doc.save(filename);
  } finally {
    removePdfContentContainer(container);
  }
};

export const generatePdfFromHtml = async (
  htmlContent: string,
  filename: string,
  pageSize: 'a4' | 'a3' = 'a4'
): Promise<void> => {
  const container = createPdfContentContainer();
  container.innerHTML = htmlContent;
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 595,
    });
    
    const doc = new jsPDF('p', 'mm', pageSize);
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
      sliceCanvas.height = srcHeight;
      
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, srcY,
          canvas.width, srcHeight,
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
  } finally {
    removePdfContentContainer(container);
  }
};
