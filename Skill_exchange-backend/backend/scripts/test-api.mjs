import assert from 'node:assert/strict';import mysql from 'mysql2/promise';
const base='http://127.0.0.1:3000/api/';let checks=0;const ids=[];const token=Date.now();
function client(){let cookie='';return async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};}
function ok(name,actual,expected){assert.deepEqual(actual,expected,name);console.log('PASS '+name);checks++;}
const anon=client(),learner=client(),teacher=client(),stranger=client();const db=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
let session;
try{
const cross=await fetch(base+'auth/login',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://unrelated.example'},body:JSON.stringify({email:'none@example.com',password:'bad'})});ok('cross-origin mutations rejected',cross.status,403);
const same=await fetch(base+'auth/login',{method:'POST',headers:{'Content-Type':'application/json',origin:'http://127.0.0.1:3000'},body:JSON.stringify({email:'none@example.com',password:'bad'})});ok('same-origin request reaches login validation',same.status,401);
ok('protected profile requires login',(await anon('profile')).status,401);
ok('malformed registration rejected',(await anon('auth/register','POST',{name:'A',email:'bad',password:'123'})).status,400);
for(const [agent,role] of [[learner,'learner'],[teacher,'teacher'],[stranger,'stranger']]){ok('register '+role,(await agent('auth/register','POST',{name:'API '+role,email:role+token+'@example.com',password:'Student@123'})).status,201);const profile=await agent('profile');ids.push(profile.data.id);ok('profile read '+role,profile.status,200);}
const [lid,tid,xid]=ids;
ok('duplicate email',(await anon('auth/register','POST',{name:'Duplicate',email:'learner'+token+'@example.com',password:'Student@123'})).status,409);
ok('invalid password',(await anon('auth/login','POST',{email:'learner'+token+'@example.com',password:'badpassword'})).status,401);
const windows=Array.from({length:7},(_,day)=>({day,start:8,end:20}));
for(const [agent,name] of [[learner,'API learner'],[teacher,'API teacher']])ok('profile and availability update '+name,(await agent('profile','PUT',{name,bio:'Test profile',department:'CS',availability:windows})).status,200);
ok('offer skill',(await teacher('profile/skills','POST',{skillId:1,kind:'offer',level:5})).status,200);
ok('invalid skill level',(await teacher('profile/skills','POST',{skillId:1,kind:'offer',level:9})).status,400);
const matched=await learner('matches?skillId=1&level=5');ok('matching includes offered skill',matched.data.some(x=>x.id===tid),true);ok('matching availability score',Number(matched.data.find(x=>x.id===tid).score),80);
ok('matching excludes self',(await teacher('matches?skillId=1')).data.some(x=>x.id===tid),false);
const date=new Date();date.setUTCDate(date.getUTCDate()+3);date.setUTCHours(10,0,0,0);const booking={teacherId:tid,skillId:1,start:date.toISOString(),duration:60,note:'Functions'};
ok('self-booking rejected',(await learner('sessions','POST',{...booking,teacherId:lid})).status,400);
ok('unoffered skill rejected',(await learner('sessions','POST',{...booking,skillId:7})).status,400);
const race=await Promise.all([learner('sessions','POST',booking),learner('sessions','POST',booking)]);ok('simultaneous booking race gives one winner',race.map(x=>x.status).sort(),[201,409]);session=race.find(x=>x.status===201).data.id;
ok('unrelated student cannot cancel',(await stranger('sessions/'+session,'PATCH',{status:'cancelled'})).status,403);
ok('learner cannot accept',(await learner('sessions/'+session,'PATCH',{status:'accepted'})).status,409);
ok('teacher accepts',(await teacher('sessions/'+session,'PATCH',{status:'accepted'})).status,200);
ok('early completion rejected',(await teacher('sessions/'+session,'PATCH',{status:'completed'})).status,409);
ok('premature review rejected',(await learner('reviews','POST',{sessionId:session,rating:5,comment:'Useful lesson'})).status,403);
// Move this test-only fixture into the past so the normal API can complete it.
await db.execute("UPDATE sessions SET starts_at='2025-01-01 10:00:00',ends_at='2025-01-01 11:00:00' WHERE id=?",[session]);
ok('teacher completes elapsed session',(await teacher('sessions/'+session,'PATCH',{status:'completed'})).status,200);
ok('learner submits review',(await learner('reviews','POST',{sessionId:session,rating:5,comment:'Useful lesson'})).status,201);
ok('duplicate review rejected',(await learner('reviews','POST',{sessionId:session,rating:4,comment:'Another review'})).status,409);
ok('teacher review list',(await teacher('reviews?teacherId='+tid)).data.length,1);
ok('logout',(await learner('auth/logout','POST',{})).status,200);ok('logout blocks profile',(await learner('profile')).status,401);
console.log(checks+' API checks passed.');
}finally{
if(ids.length){const placeholders=ids.map(()=>'?').join(',');const [rows]=await db.execute('SELECT id FROM sessions WHERE teacher_id IN ('+placeholders+') OR learner_id IN ('+placeholders+')',[...ids,...ids]);for(const s of rows){await db.execute('DELETE FROM reviews WHERE session_id=?',[s.id]);await db.execute('DELETE FROM session_audit WHERE session_id=?',[s.id]);await db.execute('DELETE FROM sessions WHERE id=?',[s.id]);}for(const id of ids){await db.execute('DELETE FROM availability WHERE student_id=?',[id]);await db.execute('DELETE FROM student_skills WHERE student_id=?',[id]);await db.execute('DELETE FROM students WHERE id=?',[id]);}}
await db.end();}
