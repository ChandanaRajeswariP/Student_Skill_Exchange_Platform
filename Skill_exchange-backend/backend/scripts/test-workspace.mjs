import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:3000';
let cookie = '';
async function request(path, method = 'GET', body, status = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { origin: base, cookie, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, status, path);
  if (response.headers.has('set-cookie')) {
    const header = response.headers.get('set-cookie');
    if (!header.startsWith('skill_session=;')) assert.match(header, /httponly/i);
    assert.doesNotMatch(header, /;\s*secure(?:;|$)/i);
    cookie = header.split(';')[0];
  }
  return response.json();
}

for (const path of ['/', '/discover', '/sessions', '/library']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const page = await response.text();
  const asset = page.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset, path);
  assert.equal((await fetch(base + asset)).status, 200, asset);
}
await request('/api/students/me', 'GET', undefined, 401);
const email = 'workspace' + Date.now() + '@example.com';
const password = 'Student@123';
await request('/api/auth/register', 'POST', {name:'Workspace Test', email, password}, 201);
const initial = (await request('/api/students/me')).user;
const skillName = 'Test skill ' + Date.now();
await request('/api/students/me', 'PUT', {
  ...initial, course:'Computing', year:'2', location:'Campus A', bio:'Workspace verification',
  teaches:[{name:skillName,level:'Intermediate'}], learns:[{name:'Python',level:'Beginner'}],
  availability:['Weekends'],
});
const saved = (await request('/api/students/me')).user;
assert.equal(saved.year, '2');
assert.equal(saved.location, 'Campus A');
assert.equal(saved.teaches[0].name, skillName);
assert.deepEqual(saved.availability, ['Weekends']);
assert.equal((await request('/api/profile')).department, 'Computing');
assert.ok((await request('/api/skills')).some(skill => skill.name === skillName));
assert.ok((await request('/api/students/recommended')).matches.some(student => student.name === 'Aarav'));
assert.ok((await request('/api/matches')).some(row => row.skill === 'Python'));
await request('/api/auth/logout', 'POST', {});
await request('/api/resources', 'GET', undefined, 401);
await request('/api/auth/login', 'POST', {email:'chandana@example.com',password});
const found = await request('/api/students?skill=' + encodeURIComponent(skillName) + '&level=Intermediate');
assert.deepEqual(found.students.map(student => student.id), [saved.id]);
assert.ok((await request('/api/resources')).resources.length);
console.log('Workspace checks passed: production pages and assets, profile, skills, availability, discovery, recommendations, sign-in and shared resource access.');

