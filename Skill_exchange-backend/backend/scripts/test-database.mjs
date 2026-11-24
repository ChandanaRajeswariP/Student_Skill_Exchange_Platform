import mysql from 'mysql2/promise';import assert from 'node:assert/strict';
const c=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
let passed=0;async function check(name,fn){await fn();console.log('PASS '+name);passed++;}
async function rejects(sql,args,code){await assert.rejects(c.execute(sql,args),e=>e.code===code);}
try{await c.beginTransaction();
const key=Date.now();const [a]=await c.execute('INSERT INTO students(name,email,password_hash) VALUES(?,?,?)',['Test learner','test-learner-'+key+'@example.com','test-only']);const learner=a.insertId;
const [b]=await c.execute('INSERT INTO students(name,email,password_hash) VALUES(?,?,?)',['Test teacher','test-teacher-'+key+'@example.com','test-only']);const teacher=b.insertId;
await check('unique student email',()=>rejects('INSERT INTO students(name,email,password_hash) VALUES(?,?,?)',['Duplicate','test-learner-'+key+'@example.com','x'],'ER_DUP_ENTRY'));
await check('foreign key prevents orphan skill',()=>rejects("INSERT INTO student_skills VALUES(?,99999999,'offer',3)",[teacher],'ER_NO_REFERENCED_ROW_2'));
await check('skill level CHECK constraint',()=>rejects("INSERT INTO student_skills VALUES(?,1,'offer',9)",[teacher],'ER_CHECK_CONSTRAINT_VIOLATED'));
await check('availability order CHECK constraint',()=>rejects('INSERT INTO availability(student_id,day,start_hour,end_hour) VALUES(?,1,15,12)',[teacher],'ER_CHECK_CONSTRAINT_VIOLATED'));
await c.execute("INSERT INTO student_skills VALUES(?,1,'offer',4)",[teacher]);
const [s]=await c.execute("INSERT INTO sessions(teacher_id,learner_id,skill_id,starts_at,ends_at) VALUES(?,?,1,'2025-01-01 10:00:00','2025-01-01 11:00:00')",[teacher,learner]);const sid=s.insertId;
await check('trigger rejects review before completion',()=>rejects('INSERT INTO reviews(session_id,reviewer_id,rating,comment) VALUES(?,?,5,?)',[sid,learner,'Good lesson'],'ER_SIGNAL_EXCEPTION'));
await c.execute("UPDATE sessions SET status='accepted' WHERE id=?",[sid]);await c.execute("UPDATE sessions SET status='completed' WHERE id=?",[sid]);
await check('audit trigger records status changes',async()=>{const [r]=await c.execute('SELECT COUNT(*) n FROM session_audit WHERE session_id=?',[sid]);assert.equal(r[0].n,2);});
await check('trigger rejects a non-learner review',()=>rejects('INSERT INTO reviews(session_id,reviewer_id,rating,comment) VALUES(?,?,5,?)',[sid,teacher,'Wrong reviewer'],'ER_SIGNAL_EXCEPTION'));
await c.execute('INSERT INTO reviews(session_id,reviewer_id,rating,comment) VALUES(?,?,5,?)',[sid,learner,'Useful lesson']);
await check('rating view aggregates completed review',async()=>{const [r]=await c.execute('SELECT * FROM teacher_ratings WHERE teacher_id=?',[teacher]);assert.equal(Number(r[0].average_rating),5);assert.equal(r[0].review_count,1);});
await check('one review per session',()=>rejects('INSERT INTO reviews(session_id,reviewer_id,rating,comment) VALUES(?,?,4,?)',[sid,learner,'Second review'],'ER_DUP_ENTRY'));
await check('join and subquery retrieve teacher skill',async()=>{const [r]=await c.execute("SELECT st.id FROM students st JOIN student_skills ss ON ss.student_id=st.id WHERE ss.kind='offer' AND st.id=? AND ss.level>=(SELECT AVG(level) FROM student_skills WHERE student_id=?)",[teacher,teacher]);assert.equal(r.length,1);});
await check('stored procedure returns summary',async()=>{const [r]=await c.query('CALL student_summary(?)',[teacher]);assert.equal(r[0][0].completed_sessions,1);});
await c.rollback();await check('rollback removes temporary fixture',async()=>{const [r]=await c.execute('SELECT id FROM students WHERE id IN (?,?)',[teacher,learner]);assert.equal(r.length,0);});console.log(passed+' database checks passed; fixtures rolled back.');
}catch(e){await c.rollback();throw e;}finally{await c.end();}