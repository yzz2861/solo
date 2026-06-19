const cron = require('node-cron');
const config = require('../config');
const reservationService = require('../services/reservationService');
const db = require('../config/database');

const startScheduledTasks = () => {
  console.log('定时任务已启动');

  cron.schedule(config.cron.checkExpiredReservations, async () => {
    try {
      const count = await reservationService.checkAndReleaseExpired();
      if (count > 0) {
        console.log(`[定时任务] 自动释放 ${count} 个未签到预约`);
      }
    } catch (err) {
      console.error('[定时任务] 检查过期预约失败:', err);
    }
  });

  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await db.run(`
        UPDATE reservations
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'checked_in'
          AND end_time <= datetime('now')
      `);

      if (result.changes > 0) {
        console.log(`[定时任务] 标记 ${result.changes} 个已结束预约为完成状态`);
      }
    } catch (err) {
      console.error('[定时任务] 更新已结束预约失败:', err);
    }
  });

  console.log(`  - 过期预约检查: 每5分钟执行`);
  console.log(`  - 已结束预约标记: 每天凌晨执行`);
};

module.exports = { startScheduledTasks };
