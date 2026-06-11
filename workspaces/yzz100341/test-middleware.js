const jwt = require('jsonwebtoken');

const JWT_SECRET = 'bus-change-service-dev-secret-change-me';
const COOKIE_NAME = 'bus_auth_token';

// 从 cookies.txt 里取 token
const fs = require('fs');
const cookieContent = fs.readFileSync('cookies.txt', 'utf8');
const match = cookieContent.match(/bus_auth_token\s+(.+)/);
if (!match) {
  console.error('No token found in cookies.txt');
  process.exit(1);
}
const token = match[1].trim();
console.log('Token from cookies.txt:', token.substring(0, 50) + '...');

function verifyToken(t) {
  try {
    return jwt.verify(t, JWT_SECRET);
  } catch (e) {
    console.error('Verify error:', e.message);
    return null;
  }
}

const decoded = verifyToken(token);
console.log('Decoded:', decoded);
