import { prisma } from '../prisma';
import type { SessionUser } from '../auth';
import type { Prisma } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

export async function writeAuditLog(
  action: string,
  changeId: string | null,
  operator: SessionUser,
  detailObj: Record<string, unknown>,
  tx?: PrismaTx,
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      action,
      changeId,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorRole: operator.role,
      detail: JSON.stringify(detailObj),
    },
  });
}
