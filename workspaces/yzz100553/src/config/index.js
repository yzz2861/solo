module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'library-study-room-secret-key-2024',
  jwtExpiresIn: '7d',

  checkInWindowMinutes: 15,
  maxViolationsBeforeBlacklist: 3,
  blacklistDays: 7,

  cron: {
    checkExpiredReservations: '*/5 * * * *',
  },
};
