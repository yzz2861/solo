import * as XLSX from 'xlsx';
import { Accident, StatusLabels } from '../../shared/types.js';
import { AccidentService } from './AccidentService.js';

type ExportType = 'unclosed' | 'overdue' | 'disputed';

export class ExportService {
  private accidentService: AccidentService;

  constructor() {
    this.accidentService = new AccidentService();
  }

  async exportToExcel(type: ExportType): Promise<Buffer> {
    let accidents: Accident[];
    let sheetName: string;

    switch (type) {
      case 'unclosed':
        accidents = await this.accidentService.getUnclosedList();
        sheetName = '未结案清单';
        break;
      case 'overdue':
        accidents = await this.accidentService.getOverdueList();
        sheetName = '超期定损清单';
        break;
      case 'disputed':
        accidents = await this.accidentService.getDisputedList();
        sheetName = '扣款争议清单';
        break;
      default:
        throw new Error('无效的导出类型');
    }

    const data = accidents.map(accident => ({
      '事故编号': accident.id.substring(0, 8),
      '车牌号': accident.plateNumber,
      '车型': accident.vehicleModel,
      '客户姓名': accident.customerName,
      '客户电话': accident.customerPhone,
      '事故时间': this.formatDate(accident.accidentTime),
      '还车时间': accident.returnTime ? this.formatDate(accident.returnTime) : '',
      '状态': StatusLabels[accident.status],
      '定损金额': accident.assessmentAmount || '',
      '扣款金额': accident.deductionAmount || '',
      '押金金额': accident.depositAmount || '',
      '客户确认': accident.customerConfirmed ? '是' : '否',
      '代步车': accident.replacementCar ? '是' : '否',
      '超期天数': accident.overdueDays || 0,
      '创建时间': this.formatDate(accident.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const colWidths = [
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
      { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 8 }, { wch: 10 }, { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
