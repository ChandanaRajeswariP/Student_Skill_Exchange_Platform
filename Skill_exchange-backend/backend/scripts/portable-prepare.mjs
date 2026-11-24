import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const envFile=new URL('../.env',import.meta.url);
const secretFile=new URL('../work/portable-secrets.json',import.meta.url);
await fs.mkdir(new URL('../work/logs/',import.meta.url),{recursive:true});
try{await fs.access(envFile);await fs.access(secretFile);console.log('Existing local configuration preserved.');}
catch(e){
  if(e.code!=='ENOENT')throw e;
  try{await fs.access(new URL('../work/mysql-data/mysql/',import.meta.url));throw new Error('Existing database found without its configuration. Restore .env and work/portable-secrets.json; do not reinitialize it.');}catch(check){if(check.code!=='ENOENT')throw check;}
  const random=()=>crypto.randomBytes(24).toString('hex');
  const secrets={mysqlRoot:random(),mysqlApp:random(),auth:random()};
  await fs.writeFile(secretFile,JSON.stringify(secrets),{mode:0o600});
  await fs.writeFile(envFile,[
    'MYSQL_HOST=127.0.0.1','MYSQL_PORT=13306','MYSQL_USER=skillapp',`MYSQL_PASSWORD=${secrets.mysqlApp}`,
    'MYSQL_DATABASE=skill_exchange',`AUTH_SECRET=${secrets.auth}`,
    'MONGODB_HOST=127.0.0.1','MONGODB_PORT=27028','MONGODB_DATABASE=skill_resources',
    'SKILLSWAP_LOCAL_HTTP=1','PORT=3000','HOSTNAME=127.0.0.1',''
  ].join('\n'),{mode:0o600});
  console.log('Generated new private credentials for this laptop.');
}
