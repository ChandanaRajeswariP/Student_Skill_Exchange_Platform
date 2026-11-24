import {MongoClient} from 'mongodb';

export async function resourceDb() {
  if (!process.env.MONGODB_URI) throw new Error('MongoDB is not configured. Run Start-Presentation.ps1.');
  if (!globalThis.skillMongoPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {serverSelectionTimeoutMS: 5000, maxPoolSize: 10});
    globalThis.skillMongoPromise = client.connect().catch(error => { globalThis.skillMongoPromise = null; throw error; });
  }
  return (await globalThis.skillMongoPromise).db(process.env.MONGODB_DATABASE || 'skill_resources');
}

export const resourceValidator = {$jsonSchema: {
  bsonType: 'object', required: ['ownerId','skillId','title','summary','kind','tags','metadata','createdAt','updatedAt'],
  additionalProperties: false,
  properties: {
    _id: {bsonType:'objectId'},
    ownerId: {bsonType:'number', minimum:1}, skillId: {bsonType:'number', minimum:1},
    title: {bsonType:'string', minLength:3, maxLength:120},
    summary: {bsonType:'string', minLength:10, maxLength:3000},
    kind: {enum:['article','video','exercise','note']},
    url: {bsonType:'string', maxLength:500, pattern:'^(https?://|$)'},
    tags: {bsonType:'array', maxItems:8, uniqueItems:true, items:{bsonType:'string', minLength:1, maxLength:24}},
    metadata: {bsonType:'object', additionalProperties:false, properties:{
      durationMinutes:{bsonType:'number',minimum:1,maximum:600},
      pages:{bsonType:'number',minimum:1,maximum:1000},
      language:{bsonType:'string',maxLength:40},
      difficulty:{enum:['Beginner','Intermediate','Advanced']}
    }},
    createdAt:{bsonType:'date'}, updatedAt:{bsonType:'date'},
    demoKey:{bsonType:'string'}
  }
}};

export async function initializeResources(db) {
  try { await db.createCollection('learning_resources', {validator:resourceValidator}); }
  catch(error) { if(error.code!==48) throw error; }
  const c=db.collection('learning_resources');
  await c.createIndexes([
    {key:{title:'text',summary:'text',tags:'text'},name:'resource_text',weights:{title:5,tags:3,summary:1}},
    {key:{skillId:1,createdAt:-1},name:'resource_skill'},
    {key:{ownerId:1},name:'resource_owner'},
    {key:{demoKey:1},name:'resource_demo_key',unique:true,partialFilterExpression:{demoKey:{$type:'string'}}}
  ]);
  return c;
}
