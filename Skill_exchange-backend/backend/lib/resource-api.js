import {NextResponse} from 'next/server';
import {z} from 'zod';
import {userId} from '@/lib/auth';
import {query} from '@/lib/db';
import {resourceDb} from '@/lib/mongo.mjs';

const metadata=z.object({durationMinutes:z.number().int().min(1).max(600).optional(),pages:z.number().int().min(1).max(1000).optional(),language:z.string().trim().max(40).optional(),difficulty:z.enum(['Beginner','Intermediate','Advanced']).optional()}).strict();
export const resourceInput=z.object({skillId:z.number().int().positive(),title:z.string().trim().min(3).max(120),summary:z.string().trim().min(10).max(3000),kind:z.enum(['article','video','exercise','note']),url:z.union([z.literal(''),z.url().max(500).refine(v=>['http:','https:'].includes(new URL(v).protocol),'Use an http or https URL')]).default(''),tags:z.array(z.string().trim().min(1).max(24)).max(8).transform(a=>[...new Set(a.map(t=>t.toLowerCase()))]),metadata:metadata.default({})}).strict();
export function fail(status,message){throw Object.assign(new Error(message),{status});}
export async function identity(req,mutation=false){
  const host=req.headers.get('host')||new URL(req.url).host;
  if(mutation && req.headers.get('origin') && new URL(req.headers.get('origin')).host!==host) fail(403,'Cross-origin request rejected');
  const id=await userId(); if(!id)fail(401,'Please log in to continue');
  const [student]=await query('SELECT id,name FROM students WHERE id=?',[id]);
  if(!student)fail(401,'Account no longer exists');
  return student;
}
export async function parseInput(req){
  let input;try{input=await req.json();}catch{fail(400,'Send valid JSON');}
  const data=resourceInput.parse(input);
  const [skill]=await query('SELECT id FROM skills WHERE id=?',[data.skillId]);
  if(!skill)fail(400,'Choose an existing MySQL skill');
  return data;
}
export async function collection(){return (await resourceDb()).collection('learning_resources');}
export function respondError(e){
  if(e.name==='ZodError')return NextResponse.json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});
  if(e.code===121)return NextResponse.json({error:'Resource rejected by MongoDB document validation'},{status:400});
  if(!e.status)console.error('Resource service error:',e.name,e.code||'');
  return NextResponse.json({error:e.status?e.message:'Resource service unavailable. Check MySQL and MongoDB are running.'},{status:e.status||503});
}
export async function enrich(rows){
  if(!rows.length)return [];
  const ownerIds=[...new Set(rows.map(r=>r.ownerId))],skillIds=[...new Set(rows.map(r=>r.skillId))];
  const [owners,skills]=await Promise.all([
    query(`SELECT id,name FROM students WHERE id IN (${ownerIds.map(()=>'?').join(',')})`,ownerIds),
    query(`SELECT id,name,category FROM skills WHERE id IN (${skillIds.map(()=>'?').join(',')})`,skillIds)
  ]);
  const om=new Map(owners.map(x=>[x.id,x.name])),sm=new Map(skills.map(x=>[x.id,x]));
  return rows.map(r=>({...r,_id:r._id.toString(),ownerName:om.get(r.ownerId)||'Former student',skillName:sm.get(r.skillId)?.name||'Removed skill',category:sm.get(r.skillId)?.category||''}));
}
