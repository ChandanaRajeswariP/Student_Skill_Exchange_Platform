import { z } from 'zod';
import { query, transaction } from './db.js';
import { profileSchema } from './validation.mjs';

const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Expert'];
const presets = {
  'Weekday mornings': [8, 12],
  'Weekday afternoons': [12, 17],
  'Weekday evenings': [17, 21],
  'Weekends': [8, 20],
};
const weekdays = [1, 2, 3, 4, 5];
const presetWindows = label => (label === 'Weekends' ? [0, 6] : weekdays)
  .map(day => ({ day, start: presets[label][0], end: presets[label][1] }));
const sameWindow = (a, b) => a.day === b.day && a.start === b.start && a.end === b.end;
const skillInput = z.object({ name: z.string().trim().min(1).max(100), level: z.enum(levels) });
export const workspaceProfile = profileSchema.omit({ department: true, availability: true }).extend({
  course: z.string().trim().max(100),
  year: z.string().trim().max(100),
  location: z.string().trim().max(100),
  teaches: z.array(skillInput),
  learns: z.array(skillInput),
  availability: z.array(z.enum(Object.keys(presets))),
});

const studentFields = 'id,name,department AS course,study_year AS year,location,bio';

async function enrich(students) {
  if (!students.length) return [];
  const ids = students.map(s => s.id);
  const placeholders = ids.map(() => '?').join(',');
  const [skills, windows] = await Promise.all([
    query(`SELECT ss.student_id,ss.kind,ss.level,k.id,k.name FROM student_skills ss JOIN skills k ON k.id=ss.skill_id WHERE ss.student_id IN (${placeholders}) ORDER BY k.name`, ids),
    query(`SELECT student_id,day,start_hour AS start,end_hour AS end FROM availability WHERE student_id IN (${placeholders}) ORDER BY day,start_hour`, ids),
  ]);
  const byId = new Map(students.map(s => [s.id, { ...s, teaches: [], learns: [], windows: [] }]));
  for (const { student_id, kind, level, ...skill } of skills) {
    byId.get(student_id)[kind === 'offer' ? 'teaches' : 'learns'].push({ ...skill, level: levels[level - 1] });
  }
  for (const { student_id, ...window } of windows) byId.get(student_id).windows.push(window);
  return [...byId.values()].map(s => ({
    ...s,
    availability: Object.keys(presets).filter(label => presetWindows(label).every(w => s.windows.some(x => sameWindow(x, w)))),
  }));
}

export async function saveWorkspaceProfile(connection, id, p) {
  await connection.execute('SELECT id FROM students WHERE id=? FOR UPDATE', [id]);
  await connection.execute('UPDATE students SET name=?,department=?,study_year=?,location=?,bio=? WHERE id=?',
    [p.name, p.course, p.year, p.location, p.bio, id]);
  const [windows] = await connection.execute('SELECT day,start_hour AS start,end_hour AS end FROM availability WHERE student_id=?', [id]);
  const presetOnly = Object.keys(presets).filter(label => presetWindows(label).every(w => windows.some(x => sameWindow(x, w)))).flatMap(presetWindows);
  for (const window of presetOnly) {
    await connection.execute('DELETE FROM availability WHERE student_id=? AND day=? AND start_hour=? AND end_hour=?',
      [id, window.day, window.start, window.end]);
  }
  for (const window of [...new Set(p.availability)].flatMap(presetWindows)) {
    await connection.execute('INSERT IGNORE INTO availability(student_id,day,start_hour,end_hour) VALUES(?,?,?,?)',
      [id, window.day, window.start, window.end]);
  }
  const [oldSkills] = await connection.execute('SELECT skill_id,kind,level FROM student_skills WHERE student_id=?', [id]);
  await connection.execute('DELETE FROM student_skills WHERE student_id=?', [id]);
  for (const [kind, skills] of [['offer', p.teaches], ['learn', p.learns]]) {
    for (const skill of skills) {
      await connection.execute("INSERT INTO skills(name,category) VALUES(?,'Community') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [skill.name]);
      const [[{ id: skillId }]] = await connection.query('SELECT LAST_INSERT_ID() AS id');
      const previous = oldSkills.find(old => old.skill_id === skillId && old.kind === kind);
      const level = previous && levels[previous.level - 1] === skill.level ? previous.level : levels.indexOf(skill.level) + 1;
      await connection.execute('INSERT INTO student_skills(student_id,skill_id,kind,level) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE level=?',
        [id, skillId, kind, level, level]);
    }
  }
}

async function profile(id) {
  const [user] = await enrich(await query(`SELECT ${studentFields},email FROM students WHERE id=?`, [id]));
  if (!user) throw Object.assign(new Error('Account no longer exists'), { status: 401 });
  return user;
}

export async function studentWorkspace(id, route, method, params, data) {
  if (route === 'students/me' && method === 'PUT') {
    const updates = workspaceProfile.parse(data);
    await transaction(connection => saveWorkspaceProfile(connection, id, updates));
    return { ok: true };
  }
  if (route === 'students/me' && method === 'GET') return { user: await profile(id) };
  if (method !== 'GET' || !['students', 'students/recommended'].includes(route)) return null;

  const students = await enrich(await query(`SELECT ${studentFields} FROM students WHERE id<>? ORDER BY name,id`, [id]));
  if (route === 'students/recommended') {
    const me = await profile(id);
    const wanted = new Set(me.learns.map(skill => skill.id));
    const matches = students.map(student => {
      const shared = student.teaches.filter(skill => wanted.has(skill.id));
      const overlaps = student.availability.filter(label => me.availability.includes(label));
      const score = Math.min(99, shared.length * 35 + overlaps.length * 10 + (shared.length ? 24 : 0));
      return { ...student, score };
    }).filter(student => student.score > 0).sort((a, b) => b.score - a.score);
    return { matches };
  }

  const [search, skill, level] = ['q', 'skill', 'level'].map(key => (params.get(key) || '').toLowerCase());
  return { students: students.filter(student => {
    const skills = [...student.teaches, ...student.learns];
    const text = [student.name, student.course, student.bio, ...skills.map(s => s.name)].join(' ').toLowerCase();
    return text.includes(search)
      && (!skill || skills.some(s => s.name.toLowerCase().includes(skill)))
      && (!level || skills.some(s => s.level.toLowerCase() === level));
  }) };
}
