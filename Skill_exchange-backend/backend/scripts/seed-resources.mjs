import mysql from 'mysql2/promise';
import {MongoClient} from 'mongodb';
import {initializeResources} from '../lib/mongo.mjs';
const sql=await mysql.createConnection({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
const mongo=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
try{
  const [students]=await sql.execute('SELECT id,name FROM students ORDER BY id LIMIT 4');
  const [skills]=await sql.execute('SELECT id,name FROM skills ORDER BY id');
  if(!students.length||!skills.length)throw new Error('Seed the MySQL students and skills first.');
  await mongo.connect();const c=await initializeResources(mongo.db(process.env.MONGODB_DATABASE||'skill_resources'));
  const findSkill=name=>{const s=skills.find(s=>s.name.toLowerCase().includes(name));if(!s)throw new Error(`MySQL skill missing: ${name}`);return s.id;};
  const examples=[
    {demoKey:'sql-joins',skillId:findSkill('sql'),title:'Make sense of SQL joins',summary:'A practical starting point for INNER JOIN and LEFT JOIN. Read the examples, then try joining students, skills and student_skills in our project.',kind:'article',url:'https://dev.mysql.com/doc/refman/8.0/en/join.html',tags:['sql','joins','databases'],metadata:{difficulty:'Beginner',language:'English'}},
    {demoKey:'normalization',skillId:findSkill('sql'),title:'Practice: design a student skill schema',summary:'Start with a student record containing a list of skills. Split it into students, skills and student_skills. Identify primary keys, foreign keys and the many-to-many relationship.',kind:'exercise',url:'',tags:['sql','normalization','practice'],metadata:{difficulty:'Intermediate',pages:2}},
    {demoKey:'python',skillId:findSkill('python'),title:'Your first steps with Python',summary:'Work through the official Python tutorial. Focus on lists, dictionaries and loops, then build a small program that groups learning resources by their tags.',kind:'article',url:'https://docs.python.org/3/tutorial/',tags:['python','beginner','programming'],metadata:{difficulty:'Beginner',language:'English'}},
    {demoKey:'python-video',skillId:findSkill('python'),title:'Peer walkthrough: Python dictionaries',summary:'Sample peer-video resource: trace a dictionary of student names and skills, add a new entry, and count how often each skill appears. Video duration is stored as optional metadata.',kind:'video',url:'',tags:['python','dictionaries','practice'],metadata:{difficulty:'Beginner',durationMinutes:12,language:'English'}},
    {demoKey:'web',skillId:findSkill('web'),title:'Build a small React interface',summary:'Use components, state and event handlers to create a learning-resource card. Connect a search form to a backend API and show loading and error states.',kind:'article',url:'https://react.dev/learn',tags:['react','web','frontend'],metadata:{difficulty:'Intermediate',language:'English'}},
    {demoKey:'design',skillId:findSkill('design'),title:'A quick checklist for clearer forms',summary:'Use a visible label for every input. Keep related fields together. Explain validation errors beside the form. Check keyboard focus and make every action readable on a small screen.',kind:'note',url:'',tags:['design','accessibility','forms'],metadata:{difficulty:'Beginner'}}
  ];
  let inserted=0;
  for(let i=0;i<examples.length;i++){const now=new Date();const r=await c.updateOne({demoKey:examples[i].demoKey},{$setOnInsert:{...examples[i],ownerId:students[i%students.length].id,createdAt:now,updatedAt:now}},{upsert:true});inserted+=r.upsertedCount;}
  console.log(`Resource seed complete: ${inserted} new documents; ${await c.countDocuments()} total. Existing resources were preserved.`);
}finally{await sql.end();await mongo.close();}
