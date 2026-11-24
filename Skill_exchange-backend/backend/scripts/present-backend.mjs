import mysql from 'mysql2/promise';
import {MongoClient,ObjectId} from 'mongodb';
import readline from 'node:readline/promises';
const sql=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
const mongo=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
const rl=process.argv.includes('--auto')?null:readline.createInterface({input:process.stdin,output:process.stdout});
let cookie='',createdId;
async function step(title,explanation){console.log('\n============================================================\n'+title+'\n============================================================\n'+explanation+'\n');if(rl)await rl.question('Press ENTER to demonstrate this step... ');}
async function request(route,method='GET',body){
  const response=await fetch('http://127.0.0.1:3000/api/'+route,{method,headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3000',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const result=await response.json();if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  console.log(`${method} /api/${route} -> HTTP ${response.status}`);if(!response.ok)throw new Error(result.error||'API request failed');return result;
}
try{
  await mongo.connect();const resources=mongo.db(process.env.MONGODB_DATABASE||'skill_resources').collection('learning_resources');
  console.log('\nSTUDENT SKILL EXCHANGE — BACKEND PRESENTATION\nSQL: MySQL | NoSQL: MongoDB | API: Next.js\nNo frontend is needed for this demonstration.');
  await step('1. ACTUAL SQL TABLES AND RELATIONSHIPS','These tables are stored in MySQL. Foreign keys enforce relationships.');
  const [tables]=await sql.query('SHOW FULL TABLES');console.table(tables);
  const [keys]=await sql.execute('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,REFERENCED_TABLE_NAME AS references_table,REFERENCED_COLUMN_NAME AS references_column FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,ORDINAL_POSITION',[process.env.MYSQL_DATABASE]);console.table(keys);
  const [ddl]=await sql.query('SHOW CREATE TABLE student_skills');console.log(ddl[0]['Create Table']);
  await step('2. SQL JOIN AND AGGREGATION','Student names and skill names are stored separately, then joined. Views calculate teacher ratings and skill popularity.');
  const [join]=await sql.query("SELECT st.name AS student,k.name AS skill,ss.kind,ss.level FROM students st JOIN student_skills ss ON ss.student_id=st.id JOIN skills k ON k.id=ss.skill_id ORDER BY st.name,k.name");console.table(join);
  const [ratings]=await sql.query('SELECT * FROM teacher_ratings');console.table(ratings);
  const [popular]=await sql.query('SELECT * FROM skill_popularity');console.table(popular);
  await step('3. ADVANCED DATABASE FEATURES','The project implements transactions, views, indexing, triggers and a stored procedure. This UPDATE is rolled back.');
  const [triggers]=await sql.query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()');console.table(triggers);
  const [summary]=await sql.query('CALL student_summary(1)');console.table(summary[0]);
  await sql.beginTransaction();const [before]=await sql.query('SELECT id,bio FROM students WHERE id=1 FOR UPDATE');
  await sql.execute('UPDATE students SET bio=? WHERE id=1',['Temporary presentation value — will be rolled back']);
  console.log('Inside transaction:');const [inside]=await sql.query('SELECT id,bio FROM students WHERE id=1');console.table(inside);
  await sql.rollback();const [after]=await sql.query('SELECT id,bio FROM students WHERE id=1');console.log('After ROLLBACK:');console.table(after);if(after[0].bio!==before[0].bio)throw new Error('Rollback verification failed');
  await step('4. REAL MONGODB DOCUMENTS AND INDEXES','MongoDB stores learning resources, embedded tags and optional nested metadata. ownerId and skillId reference MySQL records through API validation.');
  console.log(JSON.stringify(await resources.find({},{projection:{title:1,kind:1,tags:1,metadata:1,ownerId:1,skillId:1}}).limit(3).toArray(),null,2));
  console.table((await resources.listIndexes().toArray()).map(i=>({name:i.name,key:JSON.stringify(i.key)})));
  await step('5. MONGODB FULL-TEXT SEARCH AND AGGREGATION','The text index searches resources. The aggregation pipeline counts how often each tag appears.');
  console.table(await resources.find({$text:{$search:'SQL'}},{projection:{title:1,kind:1}}).toArray());
  console.table(await resources.aggregate([{$unwind:'$tags'},{$group:{_id:'$tags',count:{$sum:1}}},{$sort:{count:-1,_id:1}},{$limit:8}]).toArray());
  await step('6. API AUTHENTICATION AND CROSS-DATABASE INTEGRATION','Login verifies the MySQL password hash. A resource is written to MongoDB only after checking the SQL account and skill.');
  await request('auth/login','POST',{email:'chandana@example.com',password:'Student@123'});
  const profile=await request('profile');console.log('Authenticated MySQL student:',profile.id,profile.name);
  const unique='demo'+Date.now(),body={skillId:3,title:'Live backend demonstration '+unique,summary:'A temporary learning note created through the Next.js API and stored in MongoDB.',kind:'note',url:'',tags:['sql','mongodb',unique],metadata:{difficulty:'Beginner'}};
  const created=await request('resources','POST',body);createdId=created.id;
  console.log('Document read directly from MongoDB:');console.log(JSON.stringify(await resources.findOne({_id:new ObjectId(createdId)}),null,2));
  const result=await request('resources?q='+unique);console.log('API adds author and skill names from MySQL:');console.log(JSON.stringify(result.resources,null,2));
  await step('7. UPDATE, DELETE AND FINAL COUNTS','The resource author can modify and delete their own document. This demonstration cleans up only the temporary resource it just created.');
  await request('resources/'+createdId,'PUT',{...body,title:'Updated live demonstration '+unique});
  console.log('Updated document title:',(await resources.findOne({_id:new ObjectId(createdId)})).title);
  await request('resources/'+createdId,'DELETE');createdId=null;
  console.dir(await request('resources/stats'),{depth:null});
  console.log('\nDEMONSTRATION COMPLETE. Both SQL and NoSQL were queried live.\nTemporary updates were rolled back and the demo resource was removed.\nUse 3-RUN-ALL-TESTS.bat to demonstrate the 79 automated checks.');
}finally{
  if(createdId)await mongo.db(process.env.MONGODB_DATABASE||'skill_resources').collection('learning_resources').deleteOne({_id:new ObjectId(createdId)});
  await sql.rollback().catch(()=>{});await sql.end();await mongo.close();rl?.close();
}
