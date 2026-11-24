import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import { studentWorkspace } from '@/lib/workspace.mjs';
import bcrypt from 'bcryptjs';
import {query,transaction} from '@/lib/db';
import {signIn,userId} from '@/lib/auth';
import {registerSchema,profileSchema,skillSchema,sessionSchema,reviewSchema} from '@/lib/validation.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const int=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)fail(400,'Invalid identifier');return n;};
async function handle(req,context){try{
 const {path}=await context.params;const route=path.join('/');const method=req.method;const url=new URL(req.url);
 if(method!=='GET'&&req.headers.get('origin')&&new URL(req.headers.get('origin')).host!==req.headers.get('host'))fail(403,'Cross-origin request rejected');
 let data={};if(method!=='GET'){try{data=await req.json();}catch{fail(400,'Request must contain valid JSON');}}
 if(route==='auth/register'&&method==='POST'){
 const p=registerSchema.parse(data);const hash=await bcrypt.hash(p.password,12);
 const r=await query('INSERT INTO students(name,email,password_hash) VALUES(?,?,?)',[p.name,p.email,hash]);await signIn(r.insertId);return NextResponse.json({ok:true},{status:201});}
 if(route==='auth/login'&&method==='POST'){
 const email=String(data.email||'').trim().toLowerCase();const [student]=await query('SELECT id,password_hash FROM students WHERE email=?',[email]);
 if(!student||!await bcrypt.compare(String(data.password||''),student.password_hash))fail(401,'Email or password is incorrect');await signIn(student.id);return NextResponse.json({ok:true});}
 if(route==='auth/logout'&&method==='POST'){(await cookies()).delete('skill_session');return NextResponse.json({ok:true});}
 if(route==='skills'&&method==='GET')return NextResponse.json(await query('SELECT * FROM skill_popularity ORDER BY name'));
 const id=await userId();if(!id)fail(401,'Please log in to continue');
 if(path[0]==='students'){
 const result=await studentWorkspace(id,route,method,url.searchParams,data);
 if(result)return NextResponse.json(result);
 }
 if(route==='profile'&&method==='GET'){
 const [s]=await query('SELECT id,name,email,bio,department FROM students WHERE id=?',[id]);if(!s)fail(401,'Account no longer exists');
 s.skills=await query('SELECT ss.*,k.name,k.category FROM student_skills ss JOIN skills k ON k.id=ss.skill_id WHERE student_id=?',[id]);s.availability=await query('SELECT day,start_hour AS start,end_hour AS end FROM availability WHERE student_id=? ORDER BY day,start_hour',[id]);return NextResponse.json(s);}
 if(route==='profile'&&method==='PUT'){const p=profileSchema.parse(data);await transaction(async c=>{await c.execute('SELECT id FROM students WHERE id=? FOR UPDATE',[id]);await c.execute('UPDATE students SET name=?,bio=?,department=? WHERE id=?',[p.name,p.bio,p.department,id]);await c.execute('DELETE FROM availability WHERE student_id=?',[id]);for(const a of p.availability)await c.execute('INSERT INTO availability(student_id,day,start_hour,end_hour) VALUES(?,?,?,?)',[id,a.day,a.start,a.end]);});return NextResponse.json({ok:true});}
 if(route==='profile/skills'&&method==='POST'){const p=skillSchema.parse(data);await query('INSERT INTO student_skills(student_id,skill_id,kind,level) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE level=?',[id,p.skillId,p.kind,p.level,p.level]);return NextResponse.json({ok:true});}
 if(route==='profile/skills'&&method==='DELETE'){const p=skillSchema.parse(data);await query('DELETE FROM student_skills WHERE student_id=? AND skill_id=? AND kind=?',[id,p.skillId,p.kind]);return NextResponse.json({ok:true});}
 if(route==='matches'&&method==='GET'){
 const skill=Number(url.searchParams.get('skillId')||0);const level=Number(url.searchParams.get('level')||1);const search=(url.searchParams.get('q')||'').slice(0,100);const category=(url.searchParams.get('category')||'').slice(0,80);
 if(!Number.isInteger(skill)||skill<0||!Number.isInteger(level)||level<1||level>5)fail(400,'Invalid search filters');
 const rows=await query(`SELECT st.id,st.name,st.department,st.bio,k.id skill_id,k.name skill,ss.level,COALESCE(tr.average_rating,0) rating,COALESCE(tr.review_count,0) review_count,
 EXISTS(SELECT 1 FROM availability a JOIN availability mine ON mine.student_id=? AND a.day=mine.day AND a.start_hour<mine.end_hour AND a.end_hour>mine.start_hour WHERE a.student_id=st.id) has_overlap,
 (ss.level*10 + COALESCE(tr.average_rating,0)*4 + 30*EXISTS(SELECT 1 FROM availability a JOIN availability mine ON mine.student_id=? AND a.day=mine.day AND a.start_hour<mine.end_hour AND a.end_hour>mine.start_hour WHERE a.student_id=st.id)) score
 FROM student_skills ss JOIN students st ON st.id=ss.student_id JOIN skills k ON k.id=ss.skill_id LEFT JOIN teacher_ratings tr ON tr.teacher_id=st.id
 WHERE ss.kind='offer' AND st.id<>? AND (?=0 OR k.id=?) AND ss.level>=? AND (st.name LIKE ? OR k.name LIKE ?) AND (?='' OR k.category=?) ORDER BY score DESC,st.id,k.id LIMIT 100`,[id,id,id,skill,skill,level,'%'+search+'%','%'+search+'%',category,category]);return NextResponse.json(rows);}
 if(route==='availability'&&method==='GET')return NextResponse.json(await query('SELECT day,start_hour AS start,end_hour AS end FROM availability WHERE student_id=? ORDER BY day,start_hour',[int(url.searchParams.get('studentId'))]));
 if(route==='sessions'&&method==='GET')return NextResponse.json(await query(`SELECT s.*,k.name skill,t.name teacher,l.name learner,r.id review_id FROM sessions s JOIN skills k ON k.id=s.skill_id JOIN students t ON t.id=s.teacher_id JOIN students l ON l.id=s.learner_id LEFT JOIN reviews r ON r.session_id=s.id WHERE s.teacher_id=? OR s.learner_id=? ORDER BY s.starts_at DESC`,[id,id]));
 if(route==='sessions'&&method==='POST'){
 const p=sessionSchema.parse(data);if(p.teacherId===id)fail(400,'Choose another student');const start=new Date(p.start);const end=new Date(start.getTime()+p.duration*60000);if(start.getTime()<=Date.now())fail(400,'Choose a future session time');
 const stamp=d=>d.toISOString().slice(0,19).replace('T',' ');
 const result=await transaction(async c=>{
 // Participant locks serialize all booking attempts involving either student.
 for(const pid of [id,p.teacherId].sort((a,b)=>a-b)){const [r]=await c.execute('SELECT id FROM students WHERE id=? FOR UPDATE',[pid]);if(!r.length)fail(404,'Student not found');}
 const [offer]=await c.execute("SELECT 1 FROM student_skills WHERE student_id=? AND skill_id=? AND kind='offer'",[p.teacherId,p.skillId]);if(!offer.length)fail(400,'Student does not offer this skill');
 const [a]=await c.execute('SELECT 1 FROM availability WHERE student_id=? AND day=? AND start_hour<=? AND end_hour>=?',[p.teacherId,start.getUTCDay(),start.getUTCHours()+start.getUTCMinutes()/60,end.getUTCHours()+end.getUTCMinutes()/60]);if(!a.length||start.toISOString().slice(0,10)!==end.toISOString().slice(0,10))fail(409,'Time must fall within teacher availability (UTC)');
 const [busy]=await c.execute("SELECT id FROM sessions WHERE status IN ('pending','accepted') AND (teacher_id IN (?,?) OR learner_id IN (?,?)) AND starts_at<? AND ends_at>? LIMIT 1",[id,p.teacherId,id,p.teacherId,stamp(end),stamp(start)]);if(busy.length)fail(409,'A participant already has a session at this time');
 const [r]=await c.execute('INSERT INTO sessions(teacher_id,learner_id,skill_id,starts_at,ends_at,note) VALUES(?,?,?,?,?,?)',[p.teacherId,id,p.skillId,stamp(start),stamp(end),p.note]);return r.insertId;});return NextResponse.json({id:result},{status:201});}
 if(path[0]==='sessions'&&path.length===2&&method==='PATCH'){
 const sid=int(path[1]);const status=data.status;
 await transaction(async c=>{const [rows]=await c.execute('SELECT * FROM sessions WHERE id=? FOR UPDATE',[sid]);const s=rows[0];if(!s)fail(404,'Session not found');if(s.teacher_id!==id&&s.learner_id!==id)fail(403,'Not your session');
 const valid=(status==='cancelled'&&['pending','accepted'].includes(s.status))||(status==='accepted'&&s.status==='pending'&&s.teacher_id===id)||(status==='completed'&&s.status==='accepted'&&s.teacher_id===id&&new Date(s.ends_at.replace(' ','T')+'Z').getTime()<=Date.now());if(!valid)fail(409,'This session transition is not allowed');await c.execute('UPDATE sessions SET status=? WHERE id=?',[status,sid]);});return NextResponse.json({ok:true});}
 if(route==='reviews'&&method==='POST'){const p=reviewSchema.parse(data);const [s]=await query("SELECT id FROM sessions WHERE id=? AND learner_id=? AND status='completed'",[p.sessionId,id]);if(!s)fail(403,'Only completed sessions you learned in can be reviewed');await query('INSERT INTO reviews(session_id,reviewer_id,rating,comment) VALUES(?,?,?,?)',[p.sessionId,id,p.rating,p.comment]);return NextResponse.json({ok:true},{status:201});}
 if(route==='reviews'&&method==='GET'){const teacher=int(url.searchParams.get('teacherId'));return NextResponse.json(await query('SELECT r.rating,r.comment,r.created_at,st.name FROM reviews r JOIN sessions s ON s.id=r.session_id JOIN students st ON st.id=r.reviewer_id WHERE s.teacher_id=? ORDER BY r.created_at DESC LIMIT 50',[teacher]));}
 fail(404,'Endpoint not found');
 }catch(e){if(e.name==='ZodError')return NextResponse.json({error:e.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},{status:400});if(e.code==='ER_DUP_ENTRY')return NextResponse.json({error:'This email, skill, availability, or review already exists'},{status:409});if(e.code==='ER_NO_REFERENCED_ROW_2')return NextResponse.json({error:'Referenced record does not exist'},{status:400});if(!e.status)console.error(e);return NextResponse.json({error:e.status?e.message:'Service unavailable. Check the database connection and server logs.'},{status:e.status||503});}}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE,handle as PATCH};