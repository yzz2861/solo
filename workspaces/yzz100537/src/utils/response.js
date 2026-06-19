const { v4: uuidv4 } = require('uuid');

function generateId(prefix = '') {
  return prefix + uuidv4().replace(/-/g, '').slice(0, 16);
}

function successResponse(res, data = null, message = 'success') {
  res.json({
    code: 0,
    message,
    data
  });
}

function errorResponse(res, message = 'error', code = 400, statusCode = 400) {
  res.status(statusCode).json({
    code,
    message,
    data: null
  });
}

function validateRequiredFields(body, fields) {
  const missing = [];
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }
  return missing.length > 0 ? missing : null;
}

module.exports = {
  generateId,
  successResponse,
  errorResponse,
  validateRequiredFields
};
