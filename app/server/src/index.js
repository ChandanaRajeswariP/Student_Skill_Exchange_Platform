import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from './db.js';
import { makeToken, requireAuth } from './auth.js';

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '1mb' }));

const safeUser = (u) => {
  const { passwordHash, ...publicUser } = u;
  return publicUser;
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'SkillSwap API' }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ message: 'Name, valid email and password (at least 6 characters) are required.' });
  }
  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some(u => u.email === normalizedEmail)) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = {
    id: randomUUID(), name: name.trim(), email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 10),
    course: '', year: '', bio: '', location: '',
    teaches: [], learns: [], availability: ['Weekends'],
    createdAt: new Date().toISOString()
  };
  db.users.push(user); writeDb(db);
  res.status(201).json({ token: makeToken(user), user: safeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = readDb();
  const user = db.users.find(u => u.email === String(email || '').trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  res.json({ token: makeToken(user), user: safeUser(user) });
});

app.get('/api/students/me', requireAuth, (req, res) => {
  const user = readDb().users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Student not found.' });
  res.json({ user: safeUser(user) });
});

app.put('/api/students/me', requireAuth, (req, res) => {
  const db = readDb();
  const index = db.users.findIndex(u => u.id === req.user.id);
  if (index < 0) return res.status(404).json({ message: 'Student not found.' });
  const allowed = ['name', 'course', 'year', 'bio', 'location', 'teaches', 'learns', 'availability'];
  for (const key of allowed) if (req.body[key] !== undefined) db.users[index][key] = req.body[key];
  writeDb(db);
  res.json({ user: safeUser(db.users[index]) });
});

app.get('/api/students', requireAuth, (req, res) => {
  const db = readDb();
  const q = String(req.query.q || '').toLowerCase();
  const skill = String(req.query.skill || '').toLowerCase();
  const level = String(req.query.level || '').toLowerCase();
  const students = db.users.filter(u => u.id !== req.user.id).filter(u => {
    const text = [u.name, u.course, u.bio, ...(u.teaches || []).map(s => s.name), ...(u.learns || []).map(s => s.name)].join(' ').toLowerCase();
    const skillText = [...(u.teaches || []), ...(u.learns || [])].map(s => s.name.toLowerCase());
    const levelText = [...(u.teaches || []), ...(u.learns || [])].map(s => (s.level || '').toLowerCase());
    return (!q || text.includes(q)) && (!skill || skillText.some(s => s.includes(skill))) && (!level || levelText.includes(level));
  }).map(safeUser);
  res.json({ students });
});

app.get('/api/matches', requireAuth, (req, res) => {
  const db = readDb();
  const me = db.users.find(u => u.id === req.user.id);
  const wanted = (me?.learns || []).map(s => s.name.toLowerCase());
  const students = db.users.filter(u => u.id !== req.user.id).map(u => {
    const shared = (u.teaches || []).filter(s => wanted.includes(s.name.toLowerCase()));
    const availabilityOverlap = (u.availability || []).filter(a => (me?.availability || []).includes(a));
    const score = Math.min(99, shared.length * 35 + availabilityOverlap.length * 10 + (shared.length ? 24 : 0));
    return { ...safeUser(u), matchedSkills: shared.map(s => s.name), availabilityOverlap, score };
  }).filter(u => u.score > 0).sort((a, b) => b.score - a.score);
  res.json({ matches: students });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`SkillSwap API running at http://localhost:${PORT}`));
