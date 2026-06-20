module.exports = {
  port: process.env.PORT || 3001,
  maxExpiredDaysForExtension: 90,
  dailyRateDivisor: 30,
  extensionReasons: [
    'business_trip',
    'vehicle_maintenance',
    'vehicle_change',
    'other'
  ],
  extensionSources: {
    MANUAL: 'manual',
    RULE: 'rule'
  },
  transactionTypes: {
    MONTHLY_FEE: 'monthly_fee',
    EXTENSION_FEE: 'extension_fee',
    REFUND: 'refund',
    MANUAL_ADJUST: 'manual_adjust',
    PLATE_CHANGE_FEE: 'plate_change_fee'
  },
  transactionDirections: {
    IN: 'in',
    OUT: 'out'
  }
};
