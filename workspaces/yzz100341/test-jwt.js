const jwt = require('jsonwebtoken');

const JWT_SECRET = 'bus-change-service-dev-secret-change-me';

const user = {
  id: 'cmq8tcn61000nk9k716rohlnn',
  name: '张小明爸爸',
  email: 'parent1@qq.com',
  role: 'PARENT',
  classId: null,
  routeId: null,
};

const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
console.log('Token:', token);

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Decoded:', decoded);
} catch (e) {
  console.error('Verify failed:', e.message);
}
