import mysql from 'mysql2/promise';
import readline from 'node:readline/promises';
const c=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
console.log('MySQL skill_exchange — enter one SQL statement per line. Type exit to finish.\nExamples: SHOW TABLES;  SHOW CREATE TABLE sessions;  SELECT * FROM skill_popularity;\n');
try{while(true){const input=(await rl.question('SQL> ')).trim();if(input.toLowerCase()==='exit')break;if(!input)continue;try{const [rows]=await c.query(input);if(Array.isArray(rows)&&rows.length===1&&rows[0]['Create Table'])console.log(rows[0]['Create Table']);else if(Array.isArray(rows))console.table(rows);else console.log(rows);}catch(e){console.log(e.message);}}}finally{rl.close();await c.end();}
