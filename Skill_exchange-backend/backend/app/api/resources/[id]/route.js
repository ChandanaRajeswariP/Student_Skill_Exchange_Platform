import {ObjectId} from 'mongodb';
import {NextResponse} from 'next/server';
import {identity,parseInput,collection,respondError,fail} from '@/lib/resource-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function owned(req,context){
  const student=await identity(req,true),{id}=await context.params;
  if(!/^[a-f0-9]{24}$/i.test(id))fail(400,'Invalid resource identifier');
  const _id=new ObjectId(id),c=await collection(),existing=await c.findOne({_id});
  if(!existing)fail(404,'Resource not found');if(existing.ownerId!==student.id)fail(403,'Only the author can change this resource');
  return {c,_id,ownerId:student.id};
}
export async function PUT(req,context){try{
  const {c,_id,ownerId}=await owned(req,context),data=await parseInput(req);
  const r=await c.updateOne({_id,ownerId},{$set:{...data,updatedAt:new Date()}});
  if(!r.matchedCount)fail(404,'Resource not found');return NextResponse.json({ok:true});
}catch(e){return respondError(e);}}
export async function DELETE(req,context){try{
  const {c,_id,ownerId}=await owned(req,context);
  const r=await c.deleteOne({_id,ownerId});if(!r.deletedCount)fail(404,'Resource not found');
  return NextResponse.json({ok:true});
}catch(e){return respondError(e);}}
