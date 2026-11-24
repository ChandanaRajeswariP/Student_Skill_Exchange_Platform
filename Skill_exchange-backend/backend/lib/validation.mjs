import {z} from 'zod';
export const registerSchema=z.object({name:z.string().trim().min(2).max(80),email:z.email().max(190).transform(v=>v.toLowerCase()),password:z.string().min(8).max(72)});
export const profileSchema=z.object({name:z.string().trim().min(2).max(80),bio:z.string().trim().max(1000),department:z.string().trim().max(100),availability:z.array(z.object({day:z.number().int().min(0).max(6),start:z.number().int().min(0).max(23),end:z.number().int().min(1).max(24)}).refine(x=>x.end>x.start,'End must follow start')).max(14)});
export const skillSchema=z.object({skillId:z.number().int().positive(),kind:z.enum(['offer','learn']),level:z.number().int().min(1).max(5)});
export const sessionSchema=z.object({teacherId:z.number().int().positive(),skillId:z.number().int().positive(),start:z.iso.datetime(),duration:z.number().int().min(15).max(180),note:z.string().trim().max(500)});
export const reviewSchema=z.object({sessionId:z.number().int().positive(),rating:z.number().int().min(1).max(5),comment:z.string().trim().min(3).max(1000)});
export function intervalOverlap(a,b,c,d){return a<d&&b>c;}