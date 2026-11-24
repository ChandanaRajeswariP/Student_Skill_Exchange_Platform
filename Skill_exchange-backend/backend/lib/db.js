import mysql from 'mysql2/promise';
export const pool=globalThis.skillPool??mysql.createPool({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER||'skillapp',password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE||'skill_exchange',connectionLimit:10,timezone:'Z',dateStrings:true});
if(process.env.NODE_ENV!=='production')globalThis.skillPool=pool;
export async function query(sql,args=[]){const [rows]=await pool.execute(sql,args);return rows;}
export async function transaction(fn){const c=await pool.getConnection();try{await c.beginTransaction();const result=await fn(c);await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}}