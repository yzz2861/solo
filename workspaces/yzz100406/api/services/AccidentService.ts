import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../data-source.js';
import { Accident } from '../entities/Accident.js';
import { 
  AccidentStatus, 
  User, 
  CreateAccidentRequest, 
  UpdateAccidentRequest,
  UserRole
} from '../../shared/types.js';
import { AuditService } from './AuditService.js';

const FIELD_LABELS: Record<string, string> = {
  liability: '责任判定',
  insuranceEstimate: '保险估价',
  assessmentAmount: '定损金额',
  deductionAmount: '扣款金额',
  replacementCar: '代步车需求',
  replacementCarInfo: '代步车信息',
  status: '状态',
  description: '事故描述',
  location: '事故地点',
  returnTime: '还车时间'
};

export class AccidentService {
  private accidentRepository: Repository<Accident>;
  private auditService: AuditService;

  constructor() {
    this.accidentRepository = getDataSource().getRepository(Accident);
    this.auditService = new AuditService();
  }

  private calculateOverdue(accident: Accident): { isOverdue: boolean; overdueDays: number } {
    if (!accident.assessDeadline || accident.status >= AccidentStatus.ASSESSED) {
      return { isOverdue: false, overdueDays: 0 };
    }
    const now = new Date();
    const deadline = new Date(accident.assessDeadline);
    if (now > deadline) {
      const diffMs = now.getTime() - deadline.getTime();
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { isOverdue: true, overdueDays };
    }
    return { isOverdue: false, overdueDays: 0 };
  }

  private addOverdueInfo(accident: Accident): Accident {
    const { isOverdue, overdueDays } = this.calculateOverdue(accident);
    return { ...accident, isOverdue, overdueDays };
  }

  async createAccident(request: CreateAccidentRequest, user: User): Promise<Accident> {
    const accidentTime = new Date(request.accidentTime);
    const assessDeadline = new Date(accidentTime);
    assessDeadline.setDate(assessDeadline.getDate() + 3);

    const accident = this.accidentRepository.create({
      id: uuidv4(),
      plateNumber: request.plateNumber,
      vehicleModel: request.vehicleModel,
      customerId: uuidv4(),
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerIdCard: request.customerIdCard || null,
      accidentTime,
      returnTime: request.returnTime ? new Date(request.returnTime) : null,
      location: request.location || null,
      description: request.description || null,
      depositAmount: request.depositAmount || null,
      customerConfirmed: false,
      replacementCar: false,
      status: AccidentStatus.REGISTERED,
      assessDeadline,
      storeId: user.storeId,
      createdBy: user.id,
    });

    const saved = await this.accidentRepository.save(accident);

    await this.auditService.logChange(
      saved.id, user, 'create', undefined, undefined, '创建事故记录'
    );

    return this.addOverdueInfo(saved);
  }

  async getAccidentList(filters: {
    status?: AccidentStatus;
    startDate?: Date;
    endDate?: Date;
    storeId?: string;
    plateNumber?: string;
  }): Promise<Accident[]> {
    const query = this.accidentRepository.createQueryBuilder('accident')
      .orderBy('accident.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('accident.status = :status', { status: filters.status });
    }
    if (filters.startDate) {
      query.andWhere('accident.accidentTime >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('accident.accidentTime <= :endDate', { endDate: filters.endDate });
    }
    if (filters.storeId) {
      query.andWhere('accident.storeId = :storeId', { storeId: filters.storeId });
    }
    if (filters.plateNumber) {
      query.andWhere('accident.plateNumber LIKE :plateNumber', { plateNumber: `%${filters.plateNumber}%` });
    }

    const accidents = await query.getMany();
    return accidents.map(a => this.addOverdueInfo(a));
  }

  async getAccidentById(id: string): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;
    return this.addOverdueInfo(accident);
  }

  async updateAccident(id: string, update: UpdateAccidentRequest, user: User): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;

    if (accident.customerConfirmed && user.role === UserRole.STAFF) {
      if (update.assessmentAmount !== undefined || update.deductionAmount !== undefined) {
        throw new Error('客户已确认费用，普通店员无法修改定损金额和扣款金额');
      }
    }

    const oldAccident = { ...accident };

    if (update.liability !== undefined) accident.liability = update.liability;
    if (update.insuranceEstimate !== undefined) accident.insuranceEstimate = update.insuranceEstimate;
    if (update.assessmentAmount !== undefined) {
      accident.assessmentAmount = update.assessmentAmount;
      if (update.assessmentAmount && accident.status < AccidentStatus.ASSESSED) {
        accident.status = AccidentStatus.ASSESSED;
      }
    }
    if (update.deductionAmount !== undefined) accident.deductionAmount = update.deductionAmount;
    if (update.replacementCar !== undefined) accident.replacementCar = update.replacementCar;
    if (update.replacementCarInfo !== undefined) accident.replacementCarInfo = update.replacementCarInfo;
    if (update.description !== undefined) accident.description = update.description;
    if (update.location !== undefined) accident.location = update.location;
    if (update.returnTime !== undefined) accident.returnTime = new Date(update.returnTime);

    if (update.status !== undefined && update.status !== accident.status) {
      if (update.status === AccidentStatus.CLOSED && accident.status < AccidentStatus.CONFIRMED) {
        throw new Error('定损未完成或客户未确认，无法结案');
      }
      if (update.status === AccidentStatus.CLOSED && !accident.assessmentAmount) {
        throw new Error('定损金额为空，无法结案');
      }
      accident.status = update.status;
    }

    if (accident.insuranceEstimate && !accident.assessmentAmount && accident.status === AccidentStatus.REGISTERED) {
      accident.status = AccidentStatus.ASSESSING;
    }

    accident.updatedAt = new Date();

    await this.auditService.logUpdate(id, user, oldAccident, update, FIELD_LABELS);

    const saved = await this.accidentRepository.save(accident);
    return this.addOverdueInfo(saved);
  }

  async confirmFee(id: string, user: User): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;

    if (accident.customerConfirmed) throw new Error('费用已确认，不可重复确认');
    if (!accident.assessmentAmount) throw new Error('定损金额未填写，无法确认');

    accident.customerConfirmed = true;
    accident.customerConfirmTime = new Date();
    accident.status = AccidentStatus.CONFIRMED;
    accident.updatedAt = new Date();

    await this.auditService.logChange(id, user, 'confirm', '客户确认', '未确认', '已确认');

    const saved = await this.accidentRepository.save(accident);
    return this.addOverdueInfo(saved);
  }

  async requestClose(id: string, user: User): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;

    if (!accident.assessmentAmount) throw new Error('定损未完成，无法申请结案');
    if (!accident.customerConfirmed) throw new Error('客户未确认费用，无法申请结案');

    accident.status = AccidentStatus.PENDING_CLOSE;
    accident.updatedAt = new Date();

    await this.auditService.logChange(id, user, 'update', '状态', String(accident.status), AccidentStatus.PENDING_CLOSE);

    const saved = await this.accidentRepository.save(accident);
    return this.addOverdueInfo(saved);
  }

  async closeAccident(id: string, user: User): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;

    if (!accident.assessmentAmount) throw new Error('定损未完成，无法结案');

    accident.status = AccidentStatus.CLOSED;
    accident.updatedAt = new Date();

    await this.auditService.logChange(id, user, 'close', '状态', String(accident.status), AccidentStatus.CLOSED);

    const saved = await this.accidentRepository.save(accident);
    return this.addOverdueInfo(saved);
  }

  async markDisputed(id: string, user: User): Promise<Accident | null> {
    const accident = await this.accidentRepository.findOne({ where: { id } });
    if (!accident) return null;

    accident.status = AccidentStatus.DISPUTED;
    accident.updatedAt = new Date();

    await this.auditService.logChange(id, user, 'dispute', '状态', String(accident.status), AccidentStatus.DISPUTED);

    const saved = await this.accidentRepository.save(accident);
    return this.addOverdueInfo(saved);
  }

  async getUnclosedList(): Promise<Accident[]> {
    const accidents = await this.accidentRepository.createQueryBuilder('accident')
      .where('accident.status != :status', { status: AccidentStatus.CLOSED })
      .orderBy('accident.createdAt', 'DESC')
      .getMany();
    return accidents.map(a => this.addOverdueInfo(a));
  }

  async getOverdueList(): Promise<Accident[]> {
    const now = new Date();
    const accidents = await this.accidentRepository.createQueryBuilder('accident')
      .where('accident.assessDeadline < :now', { now })
      .orderBy('accident.assessDeadline', 'ASC')
      .getMany();
    return accidents.filter(a => a.status < AccidentStatus.ASSESSED).map(a => this.addOverdueInfo(a));
  }

  async getDisputedList(): Promise<Accident[]> {
    const accidents = await this.accidentRepository.createQueryBuilder('accident')
      .where('accident.status = :status', { status: AccidentStatus.DISPUTED })
      .orderBy('accident.updatedAt', 'DESC')
      .getMany();
    return accidents.map(a => this.addOverdueInfo(a));
  }
}
