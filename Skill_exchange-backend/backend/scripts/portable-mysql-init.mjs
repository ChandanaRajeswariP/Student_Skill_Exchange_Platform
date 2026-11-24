import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
const secrets=JSON.parse(await fs.readFile(new URL('../work/portable-secrets.json',import.meta.url),'utf8'));
const options={host:'127.0.0.1',port:13306,user:'root',password:secrets.mysqlRoot};
let c;
try{c=await mysql.createConnection(options);}
catch(e){if(!process.argv.includes('--fresh')||e.code!=='ER_ACCESS_DENIED_ERROR')throw e;c=await mysql.createConnection({...options,password:''});}
try{
  await c.query('CREATE DATABASE IF NOT EXISTS skill_exchange CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
  for(const host of ['localhost','127.0.0.1']){
    await c.query(`CREATE USER IF NOT EXISTS 'skillapp'@'${host}' IDENTIFIED BY ?`,[secrets.mysqlApp]);
    await c.query(`GRANT ALL PRIVILEGES ON skill_exchange.* TO 'skillapp'@'${host}'`);
  }
  await c.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[secrets.mysqlRoot]);
  console.log('MySQL database and database-scoped application user ready.');
}finally{await c.end();}
