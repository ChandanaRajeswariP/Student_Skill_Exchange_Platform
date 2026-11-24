import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { saveWorkspaceProfile, workspaceProfile } from '../lib/workspace.mjs';

const file = process.argv[2];
if (!file) throw new Error('Supply the full path to the old app/server/data/db.json file.');
const { users } = JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, ''));
if (!Array.isArray(users)) throw new Error('Expected a legacy file with a users array.');

const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const presets = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends'];
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const skillList = list => {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map(skill => typeof skill === 'string' ? { name: skill } : skill || {})
    .map(skill => ({
      name: text(skill.name, 100),
      level: levels.find(level => level.toLowerCase() === String(skill.level || '').trim().toLowerCase()) || 'Intermediate',
    }))
    .filter(skill => skill.name && !seen.has(skill.name.toLowerCase()) && seen.add(skill.name.toLowerCase()));
};

// The old JSON app accepted almost any profile values. Clean them to the new limits
// instead of rejecting the whole import because one account has an unusual field.
function cleanProfile(user) {
  return workspaceProfile.parse({
    name: text(user.name, 80).padEnd(2, '.'),
    bio: text(user.bio, 1000),
    course: text(user.course, 100),
    year: text(user.year, 100),
    location: text(user.location, 100),
    teaches: skillList(user.teaches),
    learns: skillList(user.learns),
    availability: (Array.isArray(user.availability) ? user.availability : []).filter(value => presets.includes(value)),
  });
}

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
let imported = 0, existing = 0, rejected = 0;
try {
  for (const user of users) {
    const email = text(user?.email, 190).toLowerCase();
    const label = email || '(account without email)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user?.passwordHash || '')) {
      console.log(`Skipped ${label}: missing email or invalid password hash.`);
      rejected++;
      continue;
    }
    const [found] = await connection.execute('SELECT id FROM students WHERE email=?', [email]);
    if (found.length) { existing++; continue; }
    // One transaction per account: a problem with one profile never undoes the others.
    try {
      const profile = cleanProfile(user);
      await connection.beginTransaction();
      const [result] = await connection.execute('INSERT INTO students(name,email,password_hash) VALUES(?,?,?)',
        [profile.name, email, user.passwordHash]);
      await saveWorkspaceProfile(connection, result.insertId, profile);
      await connection.commit();
      imported++;
    } catch (error) {
      await connection.rollback().catch(() => {});
      console.log(`Skipped ${label}: ${error.issues ? error.issues.map(i => i.path.join('.') + ' ' + i.message).join('; ') : error.message}`);
      rejected++;
    }
  }
  console.log(`Imported ${imported} account(s). Skipped ${existing} already-registered email address(es)${rejected ? ` and ${rejected} unusable account(s)` : ''}.`);
} finally {
  await connection.end();
}
