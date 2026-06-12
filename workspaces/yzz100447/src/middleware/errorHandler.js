function notFoundHandler(req, res) {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.status || err.code) {
    return res.status(err.status || 400).json({
      code: err.code || 400,
      message: err.message || '请求错误',
      data: null
    });
  }

  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null
  });
}

module.exports = { notFoundHandler, errorHandler };
