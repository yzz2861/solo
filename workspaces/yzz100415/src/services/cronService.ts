import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import {
  SealApplication,
  ApplicationStatus,
} from '../entities/SealApplication';
import { OperationLog } from '../entities/OperationLog';

export function startOverdueTrackingCron() {
  console.log('[Cron] 超期追踪定时任务已启动（每小时执行）');

  cron.schedule('0 * * * *', async () => {
    try {
      console.log(
        `[Cron] ${new Date().toLocaleString('zh-CN')} 开始执行超期检查...`
      );

      const appRepo = AppDataSource.getRepository(SealApplication);
      const logRepo = AppDataSource.getRepository(OperationLog);

      const now = new Date();

      const overdueApps = await appRepo
        .createQueryBuilder('app')
        .where(
          `app.expectedReturnDate < :now 
           AND app.status IN (:...statuses) 
           AND app.isOverdue = 0`,
          {
            now,
            statuses: [
              ApplicationStatus.PICKED_UP,
              ApplicationStatus.TRACKING,
            ],
          }
        )
        .getMany();

      console.log(`[Cron] 发现 ${overdueApps.length} 个超期申请`);

      for (const app of overdueApps) {
        app.isOverdue = true;
        if (app.status === ApplicationStatus.PICKED_UP) {
          app.status = ApplicationStatus.OVERDUE;
        }
        await appRepo.save(app);

        const expected = new Date(app.expectedReturnDate!);
        const days = Math.ceil(
          (now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
        );

        await logRepo.save({
          applicationId: app.id,
          operatorName: '系统',
          action: 'SYSTEM_OVERDUE_DETECT',
          detail: `系统检测到超期，已超期 ${days} 天，材料: ${app.materialName}`,
        });
      }

      console.log('[Cron] 超期检查完成');
    } catch (error) {
      console.error('[Cron] 超期检查执行失败:', error);
    }
  });

  cron.schedule('0 9 * * 1-5', async () => {
    try {
      console.log('[Cron] 工作日9点发送超期提醒汇总');
      const appRepo = AppDataSource.getRepository(SealApplication);
      const now = new Date();

      const overdueCount = await appRepo.count({
        where: [
          { isOverdue: true },
          { status: ApplicationStatus.OVERDUE },
          { status: ApplicationStatus.TRACKING },
        ],
      });

      if (overdueCount > 0) {
        console.log(
          `[Cron] 当前有 ${overdueCount} 个超期/追踪中的申请，请行政人员及时处理`
        );
      }
    } catch (error) {
      console.error('[Cron] 超期提醒执行失败:', error);
    }
  });
}
