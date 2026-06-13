import * as XLSX from 'xlsx';
import { AccidentStatus, StatusLabels } from '../../shared/types.js';
import { Accident } from '../entities/Accident.js';
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

    const data = accidents.map(a => ({
      '事故编号': a.id.substring(0, 8),
      '车牌号': a.plateNumber,
      '车型': a.vehicleModel,
      '客户姓名': a.customerName,
      '客户电话': a.customerPhone,
      '事故时间': this.formatDate(a.accidentTime),
      '还车时间': a.returnTime ? this.formatDate(a.returnTime) : '',
      '状态': StatusLabels[a.status],
      '定损金额': a.assessmentAmount ?? '',
      '扣款金额': a.deductionAmount ?? '',
      '押金金额': a.depositAmount ?? '',
      '客户确认': a.customerConfirmed ? '是' : '否',
      '代步车': a.replacementCar ? '是' : '否',
      '超期天数': a.overdueDays || 0,
      '创建时间': this.formatDate(a.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    worksheet['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
      { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 8 }, { wch: 10 }, { wch: 20 }
    ];

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
