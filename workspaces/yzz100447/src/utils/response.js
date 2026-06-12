function success(res, data = null, message = 'success') {
  res.json({
    code: 0,
    message,
    data
  });
}

function error(res, message = 'error', code = 400, status = 400) {
  res.status(status).json({
    code,
    message,
    data: null
  });
}

class AppError extends Error {
  constructor(message, code = 400, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

module.exports = { success, error, AppError };
