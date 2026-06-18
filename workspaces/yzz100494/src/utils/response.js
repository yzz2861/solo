function success(res, data = null, message = '成功') {
  res.json({ code: 0, message, data });
}

function fail(res, message = '失败', code = 400, statusCode = 400) {
  res.status(statusCode).json({ code, message });
}

function generateOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `WX${y}${m}${d}${rand}`;
}

function parsePagination(query) {
  const page = parseInt(query.page) || 1;
  const pageSize = parseInt(query.pageSize) || 10;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

module.exports = { success, fail, generateOrderNo, parsePagination };
