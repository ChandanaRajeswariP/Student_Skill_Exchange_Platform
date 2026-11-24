import fs from 'node:fs/promises';import mysql from 'mysql2/promise';import bcrypt from 'bcryptjs';
const c=await mysql.createConnection({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_SETUP_USER||process.env.MYSQL_USER,password:process.env.MYSQL_SETUP_PASSWORD||process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE,multipleStatements:true});
try{
for(const file of ['01-schema.sql','02-programmability.sql','03-seed.sql']){if(file.includes('programmability')&&process.env.SKIP_ROUTINES==='1')continue;let sql=await fs.readFile(new URL('../database/'+file,import.meta.url),'utf8');if(file.includes('programmability')){sql=sql.replace(/^DELIMITER .*$/gm,'');for(const part of sql.split('$$')){if(part.trim())await c.query(part);}}else await c.query(sql);}
const hash=await bcrypt.hash('Student@123',12);
for(const [i,name,department,bio] of [[1,'Chandana','Computer Science','I love turning tricky concepts into simple lessons.'],[2,'Aarav','Data Science','Python, data, and a good cup of coffee.'],[3,'Meera','Design','Let us make technology a little more human.'],[4,'Ishaan','Computer Science','Happy to help you build your first website.']])await c.execute('INSERT IGNORE INTO students(id,name,email,password_hash,department,bio) VALUES(?,?,?,?,?,?)',[i,name,name.toLowerCase()+'@example.com',hash,department,bio]);
await c.query("INSERT IGNORE INTO student_skills(student_id,skill_id,kind,level) VALUES(1,3,'offer',4),(1,1,'learn',1),(2,1,'offer',5),(2,8,'offer',4),(3,4,'offer',5),(3,6,'offer',3),(4,2,'offer',4),(4,5,'offer',3)");
for(let student=1;student<=4;student++)for(let day=0;day<=6;day++)await c.execute('INSERT IGNORE INTO availability(student_id,day,start_hour,end_hour) VALUES(?,?,8,20)',[student,day]);
console.log('MySQL schema, routines and demo accounts ready.');
}finally{await c.end();}
