import {NextResponse} from 'next/server';
import {identity,parseInput,collection,respondError,enrich,fail} from '@/lib/resource-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req){try{
  await identity(req);
  const p=new URL(req.url).searchParams,q=(p.get('q')||'').trim();
  if(q.length>200)fail(400,'Search must be at most 200 characters');
  const filter={};
  if(q)filter.$text={$search:q};
  if(p.get('skillId')){const id=Number(p.get('skillId'));if(!Number.isSafeInteger(id)||id<1)fail(400,'Invalid skill');filter.skillId=id;}
  if(p.get('kind')){if(!['article','video','exercise','note'].includes(p.get('kind')))fail(400,'Invalid format');filter.kind=p.get('kind');}
  const c=await collection();
  const cursor=q?c.find(filter,{projection:{score:{$meta:'textScore'}}}).sort({score:{$meta:'textScore'},createdAt:-1}):c.find(filter).sort({createdAt:-1});
  return NextResponse.json({resources:await enrich(await cursor.limit(100).toArray())});
}catch(e){return respondError(e);}}

export async function POST(req){try{
  const student=await identity(req,true),data=await parseInput(req),now=new Date();
  const c=await collection();const result=await c.insertOne({...data,ownerId:student.id,createdAt:now,updatedAt:now});
  return NextResponse.json({id:result.insertedId.toString()},{status:201});
}catch(e){return respondError(e);}}
