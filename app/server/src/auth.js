import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'skillswap-local-development-secret-change-me';

export function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });
}
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}
