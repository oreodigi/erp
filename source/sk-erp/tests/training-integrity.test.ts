import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCREENS, QUESTIONS, EXERCISES, WORKFLOWS, LESSONS, QUIZZES, SCREEN_BY_ID, QUESTION_BY_ID, EXERCISE_BY_ID, LESSON_BY_ID } from '../src/training/registry';

const pageSrc=fs.readFileSync(new URL('../src/pages.tsx', import.meta.url),'utf8');
const body=pageSrc.split('export const PAGES')[1]?.split('};')[0]||'';
const routes=[...body.matchAll(/(?:^|,\s*|\n\s*)(?:'([^']+)'|([A-Za-z][\w-]*))\s*:/g)].map(m=>m[1]||m[2]).filter(Boolean);
const exclude=new Set(['access/credentials']);
const trainable=routes.filter(r=>!exclude.has(r));
const missing=trainable.filter(r=>!SCREEN_BY_ID.has(r));
const stale=SCREENS.filter(s=>!routes.includes(s.id)).map(s=>s.id);
assert.deepEqual(missing,[], 'Routes missing training metadata: '+missing.join(', '));
assert.deepEqual(stale,[], 'Training screens pointing to missing routes: '+stale.join(', '));

function dup<T extends {id:string}>(xs:T[]){const seen=new Set<string>(),d:string[]=[];for(const x of xs){if(seen.has(x.id))d.push(x.id);seen.add(x.id)}return d}
for(const [name,xs] of [['screens',SCREENS],['questions',QUESTIONS],['exercises',EXERCISES],['workflows',WORKFLOWS],['lessons',LESSONS],['quizzes',QUIZZES]] as const) assert.deepEqual(dup(xs as any),[], 'Duplicate '+name+' ids');
for(const s of SCREENS){
 for(const r of [...s.upstream,...s.downstream,...s.related]) assert.ok(SCREEN_BY_ID.has(r),s.id+' references missing screen '+r);
 for(const q of s.quiz) assert.ok(QUESTION_BY_ID.has(q),s.id+' references missing question '+q);
 if(s.practice) assert.ok(EXERCISE_BY_ID.has(s.practice),s.id+' references missing exercise '+s.practice);
 assert.ok(s.purpose&&s.why&&s.when&&s.walkthrough.length,s.id+' has incomplete help');
}
for(const q of QUESTIONS){assert.ok(q.screens.length,q.id+' has no screen');for(const s of q.screens)assert.ok(SCREEN_BY_ID.has(s),q.id+' references missing screen '+s)}
for(const e of EXERCISES){assert.ok(e.steps.length,e.id+' has no steps');for(const st of e.steps){assert.ok(SCREEN_BY_ID.has(st.screen),e.id+' step references missing screen '+st.screen);assert.equal(typeof st.check,'function')}}
for(const w of WORKFLOWS){assert.ok(w.steps.length,w.id+' has no steps');for(const st of w.steps)assert.ok(SCREEN_BY_ID.has(st.screen),w.id+' references missing screen '+st.screen);if(w.exercise)assert.ok(EXERCISE_BY_ID.has(w.exercise),w.id+' missing exercise '+w.exercise);if(w.lesson)assert.ok(LESSON_BY_ID.has(w.lesson),w.id+' missing lesson '+w.lesson)}
for(const l of LESSONS){for(const s of l.screens)assert.ok(SCREEN_BY_ID.has(s),l.id+' references missing screen '+s);for(const p of l.prerequisites||[])assert.ok(LESSON_BY_ID.has(p),l.id+' missing prerequisite '+p);for(const q of l.quiz||[])assert.ok(QUESTION_BY_ID.has(q),l.id+' missing question '+q)}
console.log('Training integrity PASS:',{routes:routes.length,covered:SCREENS.length,questions:QUESTIONS.length,exercises:EXERCISES.length,workflows:WORKFLOWS.length,lessons:LESSONS.length,quizzes:QUIZZES.length});
