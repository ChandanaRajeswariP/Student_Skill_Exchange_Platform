import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
try {
  for (const field of ['study_year', 'location']) {
    const [existing] = await connection.execute(
      'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',
      ['students', field],
    );
    if (!existing.length) await connection.query(`ALTER TABLE students ADD COLUMN ${field} VARCHAR(100) NOT NULL DEFAULT ''`);
  }
} finally {
  await connection.end();
}

