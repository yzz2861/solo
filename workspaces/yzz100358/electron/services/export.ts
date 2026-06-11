import PdfPrinter from 'pdfmake';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { getBookingById } from './bookings';
import { getDesigns } from './designs';
import { getDeposits } from './deposits';
import type { BookingDetail } from '../../shared/types';

function findChineseFont(): { normal: string; bold: string } | null {
  const fontCandidates = [
    {
      normal: path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.ttf'),
      bold: path.join(process.cwd(), 'public/fonts/NotoSansSC-Bold.ttf'),
    },
    {
      normal: path.join(__dirname, '../../public/fonts/NotoSansSC-Regular.ttf'),
      bold: path.join(__dirname, '../../public/fonts/NotoSansSC-Bold.ttf'),
    },
    {
      normal: '/System/Library/Fonts/PingFang.ttc',
      bold: '/System/Library/Fonts/PingFang.ttc',
    },
    {
      normal: '/System/Library/Fonts/STHeiti Medium.ttc',
      bold: '/System/Library/Fonts/STHeiti Medium.ttc',
    },
    {
      normal: '/System/Library/Fonts/STSong.ttc',
      bold: '/System/Library/Fonts/STSong.ttc',
    },
  ];

  for (const fonts of fontCandidates) {
    if (fs.existsSync(fonts.normal) && fs.existsSync(fonts.bold)) {
      const stats = fs.statSync(fonts.normal);
      if (stats.size > 10000) {
        return fonts;
      }
    }
  }

  return null;
}

function getFontConfig(): { fontName: string; fonts: Record<string, { normal: string; bold: string; italics?: string; bolditalics?: string }> } {
  const chineseFont = findChineseFont();
  
  if (chineseFont) {
    return {
      fontName: 'NotoSansSC',
      fonts: {
        NotoSansSC: chineseFont,
      },
    };
  }

  return {
    fontName: 'Roboto',
    fonts: {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    },
  };
}

export async function exportConfirmation(
  bookingId: number,
  version: 'client' | 'internal',
  outputPath: string
): Promise<{ success: boolean; filePath: string }> {
  const booking = getBookingById(bookingId);
  if (!booking) {
    throw new Error('预约不存在');
  }

  const designs = getDesigns({ bookingId });
  const deposits = getDeposits(bookingId);

  const fontConfig = getFontConfig();
  const printer = new PdfPrinter(fontConfig.fonts);

  const docDefinition = generatePdfContent(booking, designs, version, deposits, fontConfig.fontName);
  const pdfDoc = printer.createPdfKitDocument(docDefinition as any);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputPath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    writeStream.on('finish', () => {
      resolve({ success: true, filePath: outputPath });
    });

    writeStream.on('error', (err) => {
      reject(err);
    });
  });
}

function generatePdfContent(
  booking: BookingDetail,
  designs: ReturnType<typeof getDesigns>,
  version: 'client' | 'internal',
  deposits: ReturnType<typeof getDeposits>,
  fontName: string = 'NotoSansSC'
) {
  const isInternal = version === 'internal';
  const date = dayjs(booking.start_time).format('YYYY年MM月DD日');
  const time = dayjs(booking.start_time).format('HH:mm');
  const endTime = dayjs(booking.end_time).format('HH:mm');

  const content: Array<Record<string, unknown>> = [];

  content.push({
    text: '纹身预约确认单',
    style: 'header',
    alignment: 'center',
    margin: [0, 0, 0, 20],
  });

  content.push({
    text: `版本：${isInternal ? '内部版' : '客户版'}`,
    style: 'subheader',
    alignment: 'right',
    margin: [0, 0, 0, 10],
  });

  content.push({
    table: {
      widths: ['30%', '70%'],
      body: [
        [{ text: '预约编号', style: 'label' }, { text: `#${booking.id}`, style: 'value' }],
        [{ text: '客户姓名', style: 'label' }, { text: booking.client_name, style: 'value' }],
        [{ text: '联系电话', style: 'label' }, { text: booking.client_phone || '-', style: 'value' }],
        [{ text: '预约日期', style: 'label' }, { text: date, style: 'value' }],
        [{ text: '预约时间', style: 'label' }, { text: `${time} - ${endTime}`, style: 'value' }],
        [{ text: '纹身师傅', style: 'label' }, { text: booking.artist_name, style: 'value' }],
        [{ text: '身体部位', style: 'label' }, { 
          text: isInternal || !booking.is_sensitive_area ? (booking.body_part_name || '-') : '***', 
          style: 'value' 
        }],
        [{ text: '预计时长', style: 'label' }, { text: booking.estimated_duration ? `${booking.estimated_duration}分钟` : '-', style: 'value' }],
        [{ text: '改稿次数', style: 'label' }, { text: `${booking.revision_count}次`, style: 'value' }],
        [{ text: '预约状态', style: 'label' }, { 
          text: getStatusText(booking.status), 
          style: booking.status === 'confirmed' ? 'valueConfirmed' : 'value' 
        }],
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 20],
  });

  if (designs.length > 0) {
    content.push({ text: '图案信息', style: 'sectionHeader', margin: [0, 10, 0, 10] });
    
    for (const design of designs) {
      content.push({
        text: `图案名称：${design.name}`,
        style: 'value',
        margin: [0, 5, 0, 5],
      });
      if (design.description) {
        content.push({
          text: `描述：${design.description}`,
          style: 'value',
          margin: [0, 0, 0, 5],
        });
      }
      content.push({
        text: `当前版本：v${design.current_version}`,
        style: 'value',
        margin: [0, 0, 0, 10],
      });
    }
  }

  if (deposits.length > 0) {
    content.push({ text: '定金信息', style: 'sectionHeader', margin: [0, 10, 0, 10] });
    
    for (const deposit of deposits) {
      content.push({
        table: {
          widths: ['30%', '70%'],
          body: [
            [{ text: '定金金额', style: 'label' }, { text: `¥${deposit.amount.toFixed(2)}`, style: 'value' }],
            [{ text: '支付状态', style: 'label' }, { 
              text: deposit.paid_at ? `已支付 (${dayjs(deposit.paid_at).format('YYYY-MM-DD')})` : '未支付', 
              style: deposit.paid_at ? 'valueConfirmed' : 'value' 
            }],
            [{ text: '支付方式', style: 'label' }, { text: deposit.payment_method || '-', style: 'value' }],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      });
    }
  }

  if (booking.client_notes) {
    content.push({ text: '客户备注', style: 'sectionHeader', margin: [0, 10, 0, 5] });
    content.push({
      text: booking.client_notes,
      style: 'value',
      margin: [0, 0, 0, 10],
    });
  }

  if (isInternal) {
    if (booking.internal_notes) {
      content.push({ text: '内部备注（仅内部可见）', style: 'sectionHeaderInternal', margin: [0, 10, 0, 5] });
      content.push({
        text: booking.internal_notes,
        style: 'value',
        margin: [0, 0, 0, 10],
      });
    }

    if (booking.client_allergies || booking.client_contraindications || booking.client_is_sensitive_skin) {
      content.push({ text: '禁忌与注意事项（仅内部可见）', style: 'sectionHeaderInternal', margin: [0, 10, 0, 5] });
      if (booking.client_allergies) {
        content.push({ text: `过敏史：${booking.client_allergies}`, style: 'warningText', margin: [0, 0, 0, 5] });
      }
      if (booking.client_contraindications) {
        content.push({ text: `禁忌症：${booking.client_contraindications}`, style: 'warningText', margin: [0, 0, 0, 5] });
      }
      if (booking.client_is_sensitive_skin) {
        content.push({ text: '敏感肌肤：是', style: 'warningText', margin: [0, 0, 0, 5] });
      }
      if (booking.is_sensitive_area || booking.body_part_is_sensitive) {
        content.push({ text: '敏感部位：需准备遮挡措施', style: 'warningText', margin: [0, 0, 0, 5] });
      }
    }
  }

  content.push({
    text: '客户确认签字：__________________',
    style: 'value',
    margin: [0, 30, 0, 10],
  });

  content.push({
    text: `生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
    style: 'footer',
    alignment: 'right',
    margin: [0, 20, 0, 0],
  });

  return {
    content,
    defaultStyle: {
      font: fontName,
      fontSize: 10,
    },
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        color: '#121212',
      },
      subheader: {
        fontSize: 10,
        color: '#666',
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#121212',
      },
      sectionHeaderInternal: {
        fontSize: 14,
        bold: true,
        color: '#C53030',
      },
      label: {
        fontSize: 10,
        color: '#666',
        fillColor: '#f5f5f5',
        margin: [5, 5, 0, 5],
      },
      value: {
        fontSize: 10,
        margin: [5, 5, 0, 5],
      },
      valueConfirmed: {
        fontSize: 10,
        color: '#2D4A3E',
        margin: [5, 5, 0, 5],
      },
      warningText: {
        fontSize: 10,
        color: '#C53030',
      },
      footer: {
        fontSize: 9,
        color: '#999',
      },
    },
  };
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    confirmed: '已确认',
    pending_deposit: '待付定金',
    cancelled: '已取消',
    completed: '已完成',
  };
  return statusMap[status] || status;
}

export default { exportConfirmation };
