function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      businessConclusion: 'VALIDATION_FAILED',
      errorCode: 'JSON_PARSE_ERROR',
      message: '请求体JSON格式错误',
      errors: [{
        field: 'body',
        message: 'JSON格式解析失败',
        errorCode: 'JSON_PARSE_ERROR'
      }],
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      businessConclusion: 'VALIDATION_FAILED',
      errorCode: err.code || 'VALIDATION_ERROR',
      message: err.message,
      errors: [{
        field: err.field,
        message: err.message,
        errorCode: err.errorCode,
        details: err.details || {}
      }],
      timestamp: new Date().toISOString()
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      businessConclusion: err.businessConclusion || 'VALIDATION_FAILED',
      errorCode: err.errorCode || 'UNKNOWN_ERROR',
      message: err.message,
      errors: err.errors || [],
      timestamp: new Date().toISOString()
    });
  }

  res.status(500).json({
    success: false,
    businessConclusion: 'SYSTEM_ERROR',
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: '服务器内部错误',
    errors: [],
    timestamp: new Date().toISOString()
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    businessConclusion: 'NOT_FOUND',
    errorCode: 'ENDPOINT_NOT_FOUND',
    message: '接口不存在',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

function requestLogger(req, res, next) {
  req.requestTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}

function validateContentType(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        businessConclusion: 'VALIDATION_FAILED',
        errorCode: 'UNSUPPORTED_MEDIA_TYPE',
        message: '仅支持application/json格式的请求体',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  validateContentType
};
