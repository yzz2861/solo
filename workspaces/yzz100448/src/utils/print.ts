import type { Visitor } from '../types';
import { formatDateTime, getTimeSlotLabel } from './dateUtils';

export function printGatePass(visitor: Visitor): void {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('请允许弹出窗口以打印放行单');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>园区访客车位放行单</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: "Microsoft YaHei", "SimHei", sans-serif;
          padding: 30px;
          background: #fff;
        }
        .gate-pass {
          max-width: 700px;
          margin: 0 auto;
          border: 2px solid #1e3a5f;
          border-radius: 8px;
          padding: 30px;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #1e3a5f;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .header h1 {
          font-size: 28px;
          color: #1e3a5f;
          margin-bottom: 8px;
        }
        .header .subtitle {
          font-size: 14px;
          color: #666;
        }
        .pass-id {
          text-align: right;
          font-size: 12px;
          color: #999;
          margin-bottom: 15px;
        }
        .info-section {
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
          border-bottom: 1px dashed #ddd;
          padding-bottom: 8px;
        }
        .info-label {
          width: 100px;
          font-weight: bold;
          color: #333;
          font-size: 15px;
        }
        .info-value {
          flex: 1;
          font-size: 15px;
          color: #1e3a5f;
          font-weight: 500;
        }
        .plate-number {
          font-size: 32px;
          font-weight: bold;
          color: #f59e0b;
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-radius: 8px;
          margin: 20px 0;
          letter-spacing: 8px;
          border: 2px solid #f59e0b;
        }
        .parking-spot {
          font-size: 28px;
          font-weight: bold;
          color: #10b981;
          text-align: center;
          padding: 15px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 8px;
          margin: 15px 0;
          border: 2px solid #10b981;
        }
        .time-info {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .time-block {
          text-align: center;
        }
        .time-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        .time-value {
          font-size: 18px;
          font-weight: bold;
          color: #1e3a5f;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .footer-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
          color: #666;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
          height: 40px;
        }
        .signature-label {
          font-size: 13px;
          color: #666;
        }
        .valid-hint {
          text-align: center;
          font-size: 12px;
          color: #ef4444;
          margin-top: 15px;
          font-weight: bold;
        }
        @media print {
          body {
            padding: 0;
          }
          .gate-pass {
            border: none;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="gate-pass">
        <div class="pass-id">编号：${visitor.id.toUpperCase()}</div>
        <div class="header">
          <h1>园区访客车位放行单</h1>
          <div class="subtitle">PARKING PERMIT FOR VISITORS</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">来访单位：</span>
            <span class="info-value">${visitor.company}</span>
          </div>
          <div class="info-row">
            <span class="info-label">被访人：</span>
            <span class="info-value">${visitor.contactPerson}</span>
          </div>
          <div class="info-row">
            <span class="info-label">访问日期：</span>
            <span class="info-value">${visitor.visitDate} (${getTimeSlotLabel(visitor.timeSlot)})</span>
          </div>
        </div>

        <div class="plate-number">
          ${visitor.plateNumber}
        </div>

        <div class="parking-spot">
          车位：${visitor.parkingSpot}
        </div>

        <div class="time-info">
          <div class="time-block">
            <div class="time-label">入场时间</div>
            <div class="time-value">${visitor.startTime}</div>
          </div>
          <div class="time-block">
            <div class="time-label">离场时间</div>
            <div class="time-value">${visitor.endTime}</div>
          </div>
        </div>

        ${visitor.remarks ? `
        <div class="info-row">
          <span class="info-label">备注：</span>
          <span class="info-value">${visitor.remarks}</span>
        </div>
        ` : ''}

        ${visitor.isPlateChanged ? `
        <div class="info-row" style="color: #f59e0b;">
          <span class="info-label">车牌变更：</span>
          <span class="info-value">原车牌 ${visitor.originalPlateNumber} → 新车牌 ${visitor.plateNumber}<br/>批准人：${visitor.plateChangeApprover}</span>
        </div>
        ` : ''}

        <div class="footer">
          <div class="footer-row">
            <span>登记人：${visitor.createdBy}</span>
            <span>打印时间：${formatDateTime(new Date())}</span>
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">门岗签字</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">访客签字</div>
          </div>
        </div>

        <div class="valid-hint">
          ※ 本放行单仅限当日当次有效，过期作废
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
