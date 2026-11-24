import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
import {identity,collection,respondError} from '@/lib/resource-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req){try{
  await identity(req);const c=await collection();
  const [group]=await c.aggregate([{$facet:{
    byKind:[{$group:{_id:'$kind',count:{$sum:1}}},{$sort:{count:-1,_id:1}}],
    tags:[{$unwind:'$tags'},{$group:{_id:'$tags',count:{$sum:1}}},{$sort:{count:-1,_id:1}},{$limit:8}],
    totals:[{$group:{_id:null,count:{$sum:1},authors:{$addToSet:'$ownerId'},skills:{$addToSet:'$skillId'}}}]
  }}]).toArray();
  const [sql]=await query('SELECT (SELECT COUNT(*) FROM students) students,(SELECT COUNT(*) FROM skills) skills,(SELECT COUNT(*) FROM sessions) sessions');
  const total=group.totals[0];
  return NextResponse.json({storage:{sql:'MySQL',documents:'MongoDB'},mysql:sql,mongo:{resources:total?.count||0,authors:total?.authors.length||0,skills:total?.skills.length||0,byKind:group.byKind,tags:group.tags}});
}catch(e){return respondError(e);}}
