import assert from 'node:assert/strict';
import {MongoClient,ObjectId} from 'mongodb';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const mongo=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
let cookie='',otherCookie='',createdId;let checks=0;
async function call(route,method='GET',body,auth=cookie){
  const r=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',Origin:new URL(base).origin,...(auth?{Cookie:auth}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
function ok(label,actual,expected){assert.deepEqual(actual,expected,label);checks++;console.log('PASS '+label);}
const unique='verify'+Date.now();
try{
  await mongo.connect();const c=mongo.db(process.env.MONGODB_DATABASE||'skill_resources').collection('learning_resources');
  ok('anonymous reads blocked',(await call('resources','GET',undefined,'')).status,401);
  const login=await call('auth/login','POST',{email:'chandana@example.com',password:process.env.DEMO_PASSWORD||'Student@123'},'');ok('MySQL-backed login',login.status,200);cookie=login.cookie;assert.ok(cookie);
  const profile=await call('profile');ok('MySQL profile loaded',profile.status,200);
  const skills=await call('skills');const skillId=skills.data[0].id;
  const body={skillId,title:'Verification resource '+unique,summary:'A temporary resource for testing MongoDB persistence and MySQL references.',kind:'video',url:'https://example.com/learning',tags:['verification',unique],metadata:{durationMinutes:15,difficulty:'Beginner'}};
  ok('nonexistent MySQL skill rejected',(await call('resources','POST',{...body,skillId:999999999})).status,400);
  ok('invalid metadata rejected',(await call('resources','POST',{...body,metadata:{durationMinutes:-1}})).status,400);
  const cross=await fetch(base+'/api/resources',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:'https://unrelated.example'},body:JSON.stringify(body)});ok('cross-origin writes blocked',cross.status,403);
  const created=await call('resources','POST',body);ok('resource created',created.status,201);createdId=created.data.id;
  const stored=await c.findOne({_id:new ObjectId(createdId)});ok('actual MongoDB document persisted',stored.title,body.title);ok('owner is MySQL student ID',stored.ownerId,profile.data.id);ok('nested metadata persisted',stored.metadata.durationMinutes,15);
  const found=await call('resources?q='+unique);ok('MongoDB text search returns document',found.data.resources.some(r=>r._id===createdId),true);
  const row=found.data.resources.find(r=>r._id===createdId);ok('MySQL author enrichment',row.ownerName,profile.data.name);ok('MySQL skill enrichment',row.skillName,skills.data[0].name);
  const filtered=await call('resources?kind=video&skillId='+skillId);ok('combined skill and format filters',filtered.data.resources.some(r=>r._id===createdId),true);
  const other=await call('auth/login','POST',{email:'aarav@example.com',password:process.env.DEMO_PASSWORD||'Student@123'},'');ok('second student login',other.status,200);otherCookie=other.cookie;
  ok('other student update forbidden',(await call('resources/'+createdId,'PUT',body,otherCookie)).status,403);
  ok('other student delete forbidden',(await call('resources/'+createdId,'DELETE',undefined,otherCookie)).status,403);
  ok('owner update accepted',(await call('resources/'+createdId,'PUT',{...body,title:'Updated '+unique})).status,200);
  ok('updated title persisted',(await c.findOne({_id:new ObjectId(createdId)})).title,'Updated '+unique);
  const stats=await call('resources/stats');ok('MongoDB aggregation endpoint',stats.status,200);ok('aggregation groups every resource by format',stats.data.mongo.byKind.reduce((n,x)=>n+x.count,0),stats.data.mongo.resources);ok('two database identities reported',stats.data.storage,{sql:'MySQL',documents:'MongoDB'});
  ok('invalid identifier rejected',(await call('resources/not-an-id','DELETE')).status,400);
  ok('owner delete accepted',(await call('resources/'+createdId,'DELETE')).status,200);ok('delete persisted',await c.countDocuments({_id:new ObjectId(createdId)}),0);createdId=null;
  let validationRejected=false;try{await c.insertOne({title:'Invalid document'});}catch(e){validationRejected=e.code===121;}ok('MongoDB native document validation',validationRejected,true);
  const indexes=await c.listIndexes().toArray();ok('text index installed',indexes.some(i=>i.name==='resource_text'),true);
  ok('logout',(await call('auth/logout','POST',{})).status,200);
  console.log(`All ${checks} resource integration checks passed. Temporary test resource removed.`);
}finally{
  if(createdId){await mongo.db(process.env.MONGODB_DATABASE||'skill_resources').collection('learning_resources').deleteOne({_id:new ObjectId(createdId)});}
  await mongo.close();
}
