import { ClaimRepo } from '../db/repositories/claimRepo';
import { OrderRepo } from '../db/repositories/orderRepo';
import { ReviewRepo } from '../db/repositories/reviewRepo';
import { MonthlyExportRow, ClaimStatus, OrderStatus } from '../types';

export class ExportService {
  constructor(
    private claimRepo: ClaimRepo,
    private orderRepo: OrderRepo,
    private reviewRepo: ReviewRepo,
  ) {}

  exportMonthly(year: number, month: number): MonthlyExportRow[] {
    const claims = this.claimRepo.findByMonth(year, month);

    const rows: MonthlyExportRow[] = claims
      .filter(c => c.status !== ClaimStatus.Merged)
      .map(claim => {
        const order = this.orderRepo.findById(claim.orderId);
        const latestReview = this.reviewRepo.findLatestByClaimId(claim.id);

        return {
          claimId: claim.id,
          orderId: claim.orderId,
          storeId: claim.storeId,
          customerName: order?.customerName ?? '',
          claimAmount: claim.amount,
          approvedAmount: latestReview?.approvedAmount ?? null,
          claimStatus: claim.status,
          orderStatus: order?.status ?? OrderStatus.Received,
          submittedAt: claim.createdAt,
          reviewedAt: latestReview?.createdAt ?? null,
        };
      });

    return rows;
  }

  exportMonthlyCsv(year: number, month: number): string {
    const rows = this.exportMonthly(year, month);
    const header = '赔付申请ID,订单ID,门店ID,客户姓名,申请金额,批准金额,赔付状态,订单状态,申请时间,复核时间';
    const lines = rows.map(r =>
      [
        r.claimId,
        r.orderId,
        r.storeId,
        r.customerName,
        r.claimAmount.toFixed(2),
        r.approvedAmount !== null ? r.approvedAmount.toFixed(2) : '',
        r.claimStatus,
        r.orderStatus,
        r.submittedAt,
        r.reviewedAt ?? '',
      ].join(',')
    );
    return [header, ...lines].join('\n');
  }
}
