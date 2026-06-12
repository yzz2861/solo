import { AppDataSource } from '../config/database';
import { OperationLog } from '../entities/OperationLog';
import { JwtPayload } from '../utils/auth';

export async function createOperationLog(params: {
  applicationId?: string;
  operator?: JwtPayload;
  action: string;
  detail?: string;
  ip?: string;
}) {
  const repo = AppDataSource.getRepository(OperationLog);
  const log = repo.create({
    applicationId: params.applicationId,
    operatorId: params.operator?.userId,
    operatorName: params.operator?.name || params.operator?.username,
    action: params.action,
    detail: params.detail,
    ip: params.ip,
  });
  await repo.save(log);
}
