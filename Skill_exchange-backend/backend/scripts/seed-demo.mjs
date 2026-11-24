import mysql from 'mysql2/promise';
const c=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});try{
await c.query("INSERT IGNORE INTO sessions(id,teacher_id,learner_id,skill_id,starts_at,ends_at,status,note) VALUES(1001,2,1,1,UTC_DATE()-INTERVAL 3 DAY+INTERVAL 10 HOUR,UTC_DATE()-INTERVAL 3 DAY+INTERVAL 11 HOUR,'completed','Demo: Python fundamentals'),(1002,2,1,8,UTC_DATE()+INTERVAL 1 DAY+INTERVAL 10 HOUR,UTC_DATE()+INTERVAL 1 DAY+INTERVAL 11 HOUR,'accepted','Demo: explore a dataset together')");
await c.execute('INSERT IGNORE INTO reviews(session_id,reviewer_id,rating,comment) VALUES(1001,1,5,?)',['Clear explanations and a really welcoming first lesson.']);
}finally{await c.end();}
console.log('Demo sessions and review ready.');
