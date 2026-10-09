import assert from 'node:assert/strict';
import { buildCurriculum } from '../src/training/curriculum';
import { SCREENS, QUESTIONS } from '../src/training/registry';
import { computeProgress, recKey, prerequisitesMet } from '../src/training/progress';
import { scoreQuiz, mergeAttempt } from '../src/training/quiz';
import { DEFAULT_READINESS } from '../src/training/config';
const roles=['SA','AD','OP','BU','AC','CC','CO','SI','HR'];
const all=SCREENS.map(s=>s.id);
for(const role of roles){const c=buildCurriculum({role,allowed:all});assert.ok(c.lessons.length,role+' curriculum empty');assert.ok(c.screens.length,role+' screens empty');assert.equal(new Set(c.lessons.map(x=>x.id)).size,c.lessons.length,role+' duplicate lessons')}
const opAllowed=SCREENS.filter(s=>s.roles.includes('OP')||['dashboard','help'].includes(s.id)).map(s=>s.id);
const op=buildCurriculum({role:'OP',allowed:opAllowed});assert.ok(op.screens.every(s=>new Set([...opAllowed,'dashboard','help']).has(s.id)),'permission filtering failed');
const blank=computeProgress(op,{}, {},DEFAULT_READINESS,new Date('2026-10-09T00:00:00Z'));assert.equal(blank.status,'Not Started');
if(op.lessons[0]?.prerequisites?.length){assert.equal(prerequisitesMet(op.lessons[0],{}),false)}
const q=QUESTIONS.find(x=>x.type!=='order')!;const correct=scoreQuiz([q],{[q.id]:q.answer},80);assert.equal(correct.score,100);assert.equal(correct.passed,true);
const bad=scoreQuiz([q],{},80);assert.equal(bad.score,0);assert.equal(bad.passed,false);
let sum=mergeAttempt(undefined,'q',bad,'2026-10-09T01:00:00Z');sum=mergeAttempt(sum,'q',correct,'2026-10-09T02:00:00Z');assert.equal(sum.attempts,2);assert.equal(sum.best,100);assert.equal(sum.passed,true);
const completed:any={};for(const id of op.required.lessons)completed[recKey('lesson',id)]={kind:'lesson',item_id:id,status:'completed'};for(const id of op.required.tours)completed[recKey('tour',id)]={kind:'tour',item_id:id,status:'completed'};for(const id of op.required.exercises)completed[recKey('exercise',id)]={kind:'exercise',item_id:id,status:'passed'};for(const id of op.required.workflows)completed[recKey('workflow',id)]={kind:'workflow',item_id:id,status:'completed'};
const quizzes:any={};for(const id of [...op.required.quizzes,op.required.final].filter(Boolean))quizzes[id]={quiz_id:id,attempts:1,best:100,last:100,passed:true,last_at:'2026-10-09T02:00:00Z',wrong:[]};
const done=computeProgress(op,completed,quizzes,DEFAULT_READINESS,new Date('2026-10-09T00:00:00Z'));assert.equal(done.status,'Ready');assert.equal(done.readinessPct,100);
console.log('Training unit PASS:',{roles:roles.length,opLessons:op.lessons.length,opRequired:op.required.lessons.length});
