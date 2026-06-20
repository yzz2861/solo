const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const config = require('../config');

function generateNo(prefix) {
  const dateStr = moment().format('YYYYMMDD');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${dateStr}${random}`;
}

function calculateExtensionFee(monthlyFee, days) {
  const dailyRate = monthlyFee / config.dailyRateDivisor;
  const amount = dailyRate * days;
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    days: days,
    amount: Math.round(amount * 100) / 100,
    formula: `${monthlyFee}元/月 ÷ ${config.dailyRateDivisor}天 × ${days}天 = ${Math.round(amount * 100) / 100}元`
  };
}

function calculateRefundFee(monthlyFee, days) {
  const dailyRate = monthlyFee / config.dailyRateDivisor;
  const amount = dailyRate * days;
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    days: days,
    amount: Math.round(amount * 100) / 100,
    formula: `${monthlyFee}元/月 ÷ ${config.dailyRateDivisor}天 × ${days}天 = ${Math.round(amount * 100) / 100}元`
  };
}

function isCardExpiredTooLong(endDate, maxDays) {
  const daysExpired = moment().diff(moment(endDate), 'days');
  return daysExpired > maxDays;
}

function getDaysExpired(endDate) {
  return moment().diff(moment(endDate), 'days');
}

function addDays(dateStr, days) {
  return moment(dateStr).add(days, 'days').format('YYYY-MM-DD');
}

function isToday(dateStr) {
  return moment(dateStr).isSame(moment(), 'day');
}

function formatDate(dateStr) {
  return moment(dateStr).format('YYYY-MM-DD');
}

function formatDateTime(dateStr) {
  return moment(dateStr).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = {
  generateNo,
  calculateExtensionFee,
  calculateRefundFee,
  isCardExpiredTooLong,
  getDaysExpired,
  addDays,
  isToday,
  formatDate,
  formatDateTime
};
