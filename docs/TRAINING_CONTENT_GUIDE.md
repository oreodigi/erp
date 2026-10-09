# Training content guide

How to write Training Academy content for an ERP screen, workflow, quiz or practice exercise. Types are defined in
`source/sk-erp/src/training/types.ts`. Content files live in `source/sk-erp/src/training/content/<area>.ts` and export:

```ts
export const screens: ScreenTraining[] = [...];
export const questions: Question[] = [...];
export const exercises: Exercise[] = [...];
export const workflows: Workflow[] = [...];   // end-to-end flows owned by this area
export const lessons: Lesson[] = [...];       // optional concept lessons (screen lessons are generated from `screens`)
```

`npm run test:training` checks every file against the ERP routes and the rules below.

## IDs

| Item | Format | Example |
|---|---|---|
| Screen | the route key in `src/pages.tsx` | `ops/orders` |
| Question | `q.<module>.<slug>` | `q.ops.lr-dispatch-gate` |
| Exercise | `ex.<module>.<slug>` | `ex.ops.create-order` |
| Workflow | `wf.<slug>` | `wf.road-transport` |
| Lesson | `ls.<module>.<slug>` | `ls.smartload.payload` |

All IDs are lowercase and match `^[a-z0-9][a-z0-9:/._-]{0,119}$`. Screen lessons are generated automatically with the ID `screen:<route>`.

## Accuracy rules

- Read the screen's component and the store action it calls (`src/store/store.ts`, `A.*`) before writing. Describe what the
  ERP actually does: real field names, real statuses, real validations and guard messages.
- Never invent features. If a button only shows a confirmation (simulated email, print preview), say so.
- Questions must test system rules and decisions ("An LR is finalised but loading is not confirmed – can it be dispatched?"),
  not menu labels. Every explanation teaches the rule and, where useful, where to fix it.
- Smart Load Planning content must state that geometric planning is not certified axle-load, stability or securement analysis.

## Writing style

- English for screen text: short, plain sentences for staff who are not comfortable with English. Use the ERP's own words
  (LR, POD, GRN, DGRN, DC/LDC, VP, rake, TBB, To Pay).
- `audio`: Hinglish narration in Devanagari with everyday English work words left in English, 3–7 lines, each line one
  natural spoken sentence. Explain the work, do not read labels. Example:
  - `'यह Order Board है। हर order और LR, booking से payment तक, बाएँ से दाएँ।'`
  - `'लाल card late है, और card पर लिखा होता है कि क्यों अटका है।'`
- `walkthrough`: 3–6 steps in the order an employee works the screen.
- `mistakes`: real mistakes the screen allows or blocks, with the consequence.

## Practice exercises

Exercises run only on isolated practice data (`buildSeed()` sample data, kept in the employee's browser and never saved to
the shared PostgreSQL ERP state). A step's `check(db, base, ctx)` looks only at what changed since the exercise began, using
helpers in `src/training/check.ts`: `created`, `changed`, `fieldChanged`, `before`, `pass`, `notYet`. A checker must never
mutate data and must return a human-readable `found` text (shown as "Your action").
