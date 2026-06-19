import * as cron from 'node-cron';
import { WifiApplicationService } from '../services/WifiApplicationService';

export function setupScheduler(): void {
  const cronExpression = process.env.CRON_EXPIRE_CHECK || '*/5 * * * *';
  const appService = new WifiApplicationService();

  cron.schedule(cronExpression, async () => {
    try {
      const count = await appService.autoRevokeExpired();
      if (count > 0) {
        console.log(`[Scheduler] Auto-revoked ${count} expired WiFi permissions at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.error('[Scheduler] Auto-revoke task failed:', err);
    }
  });

  console.log(`[Scheduler] Expire-check cron scheduled with pattern: ${cronExpression}`);
}
