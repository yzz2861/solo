const dayjs = require('dayjs');

function isInsuranceSufficient(sampleValue, insuranceAmount, minRatio = 1.0) {
  return insuranceAmount >= sampleValue * minRatio;
}

function isInsuranceExpiring(expiryDate, warningDays = 30) {
  if (!expiryDate) return false;
  const expiry = dayjs(expiryDate);
  const now = dayjs();
  return expiry.diff(now, 'day') <= warningDays && expiry.diff(now, 'day') >= 0;
}

function isInsuranceExpired(expiryDate) {
  if (!expiryDate) return false;
  return dayjs(expiryDate).isBefore(dayjs(), 'day');
}

function isOverdue(plannedReturnDate) {
  if (!plannedReturnDate) return false;
  return dayjs(plannedReturnDate).isBefore(dayjs(), 'day');
}

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  return dayjs(expiryDate).diff(dayjs(), 'day');
}

function formatDate(date) {
  if (!date) return null;
  return dayjs(date).format('YYYY-MM-DD');
}

module.exports = {
  isInsuranceSufficient,
  isInsuranceExpiring,
  isInsuranceExpired,
  isOverdue,
  daysUntilExpiry,
  formatDate
};
