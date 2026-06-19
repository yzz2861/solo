const moment = require('moment');

const generateOrderNo = (prefix = 'SO') => {
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${date}${random}`;
};

const generateRepaymentNo = () => {
  return generateOrderNo('RP');
};

const generateReturnNo = () => {
  return generateOrderNo('RT');
};

const formatDate = (date) => {
  return moment(date).format('YYYY-MM-DD');
};

const formatDateTime = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

const isToday = (date) => {
  return moment(date).isSame(moment(), 'day');
};

const isOverdue = (dueDate) => {
  return moment().isAfter(moment(dueDate), 'day');
};

const getMonthRange = (year, month) => {
  const start = moment([year, month - 1]).startOf('month').format('YYYY-MM-DD');
  const end = moment([year, month - 1]).endOf('month').format('YYYY-MM-DD');
  return { start, end };
};

const round2 = (num) => {
  return Math.round(num * 100) / 100;
};

module.exports = {
  generateOrderNo,
  generateRepaymentNo,
  generateReturnNo,
  formatDate,
  formatDateTime,
  isToday,
  isOverdue,
  getMonthRange,
  round2
};
