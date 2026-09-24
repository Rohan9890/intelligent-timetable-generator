# SmartSchedule

Intelligent timetable generator for a college. Built for the Edumerge Solutions Pre-Drive Product Engineering Assignment 3.

A timetable coordinator selects a department, generates a weekly schedule, and either sees the grid or a specific explanation of why generation is impossible.

## 1. Project Overview

SmartSchedule plans one week of classes for divisions, subjects, faculty, and classrooms. It enforces hard conflicts and keeps the last successful timetable when a new attempt fails.

The coordinator UI manages setup data, edits faculty availability, generates a timetable, and shows it by division, faculty, or room. A slot can be moved by hand when the same hard constraints still hold.

## 2. Problem Statement

A college must place weekly periods without double-booking a teacher, a division, or a room, and without ignoring availability, room size, or lab-room rules. When the data makes a timetable impossible, the coordinator needs the reason and a practical next step, not a generic failure message.

## 3. Solution

The React app calls an Express API. The API loads one department plus the shared classrooms, maps that data into plain objects, and calls a pure scheduling module. A successful result is saved as the active timetable. A failed result is saved as conflict reports and does not replace the previous success.

```mermaid
flowchart TD
  react[React coordinator UI]
  api[Express API]
  generation[Generation service]
  scheduler[Pure scheduling engine]
  prisma[Prisma]
  db[PostgreSQL]

  react --> api
  api --> generation
  generation --> scheduler
  generation --> prisma
  prisma --> db
```

The scheduler does not import Prisma and does not query the database. That keeps constraint tests independent of PostgreSQL and stops route handlers from containing placement rules.

## 4. Key Features

- Department-scoped generation
- Create, edit, and delete for faculty, subjects, divisions, classrooms, and assignments
- Faculty availability grid: a marked cell is unavailable, and saving replaces that faculty member’s rows
- Manual slot edits for day, period, and classroom, with the same hard checks as generation
- Automatic generation on a Monday–Friday, six-period grid
- Division, faculty, and room timetable views, filtered in the browser
- Structured conflict explanation with suggested actions
- Transactional save of a successful run
- Failed runs do not deactivate the previous successful timetable
- Generation history for the selected department, including conflicts from failed runs

## 5. Technology Stack

| Layer | Choice |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma 6.19.3 |
| Scheduler | Pure TypeScript, tested with `node:test` |

## 6. Architecture

`client/` is the coordinator interface. `server/` is a modular monolith.

- `server/src/routes` and `server/src/controllers` validate HTTP input and call services.
- `server/src/services/generation.service.ts` loads Prisma data, adapts it, and persists the outcome.
- `server/src/services/scheduler/` accepts and returns plain objects only.

Prisma 6.19.3 is pinned so `DATABASE_URL` stays in `schema.prisma`. Newer Prisma majors move the URL out of the schema and require a driver adapter.

## 7. Scheduling Approach

`generateTimetable` is a deterministic most-constrained-first greedy search. It is explainable. It is not a globally optimal solver.

1. Each assignment with `periodsPerWeek = N` becomes N single-period sessions.
2. Each session is scored by how many day/period/room options satisfy static rules.
3. Sessions with fewer options are placed first. Ties break by weekly load, assignment id, then session index.
4. Candidates are ordered by day (Monday to Friday), period (1 to 6), then smallest suitable room, then room name and id.
5. A candidate is kept only if the faculty member is free, the division is free, the room is free, the room type matches, and the room is large enough.
6. The first remaining candidate is chosen. `Math.random()` is not used.
7. If any required session cannot be placed, the run fails and no partial timetable is returned.
8. The generation service then saves either slots or conflict reports inside a database transaction.

The same input produces the same timetable.

## 8. Hard Constraints

- A faculty member cannot teach two sessions in the same day and period.
- A division cannot have two sessions in the same day and period.
- A classroom cannot host two sessions in the same day and period.
- A `FacultyAvailability` row means that faculty member is unavailable. No row means available.
- `classroom.capacity` must be at least `division.studentCount`.
- A lab subject (`isLab`) can use only `LAB` rooms.
- A theory subject can use only `CLASSROOM` rooms.
- An assignment must receive exactly `periodsPerWeek` sessions.
- The grid is Monday–Friday, periods 1–6 (30 periods per division).

## 9. Conflict Handling

A failed generation returns a conflict with a reason code, a plain-language summary, required periods, compatible periods, and suggested actions. Compatible periods are day/period cells that pass static rules before occupancy is considered.

The Information Technology demo returns `ROOM_CAPACITY`: Computer Networks Lab needs a lab for 120 students, and no lab is large enough. Required periods are 2. Compatible periods are 0.

The UI shows the problem, why it happened, and what can be done. It does not show raw JSON. If no timetable exists yet, it also says that none has been generated.

A specific reason is used only when the candidate analysis supports it. If more than one occupancy rule fully explains the failure, the reason is `INSUFFICIENT_CANDIDATE_SLOTS`.

On failure the service writes a `FAILED` generation run and its conflict reports. It does not write timetable slots and does not deactivate the previous successful run.

## 10. Data Model Overview

Department owns faculty, subjects, and divisions. Classrooms are shared by the college. An assignment links one subject, one division, and one faculty member, with a weekly period count. One subject-division pair has one faculty member. A course with both theory and lab is two subjects.

`GenerationRun` is either `SUCCESS` or `FAILED`. Successful slots copy subject, division, faculty, and classroom so the three occupancy rules can be enforced in the database. `GenerationRun` has no `departmentId`. The active timetable for a department is the latest `SUCCESS` run with `isActive = true` whose slots belong to that department’s divisions. A failed run is tied to the department through its conflict reports’ assignments. History lists both.

## 11. API Overview

The API listens on port `3001` unless `PORT` is set. The Vite dev server proxies `/api` to that port.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/departments` | Department id, name, and code |
| GET, POST | `/api/faculty` | List or create faculty |
| PUT, DELETE | `/api/faculty/:facultyId` | Update or delete one faculty member |
| GET, PUT | `/api/faculty/:facultyId/availability` | Read or replace unavailable periods |
| GET, POST | `/api/subjects` | List or create subjects |
| PUT, DELETE | `/api/subjects/:subjectId` | Update or delete one subject |
| GET, POST | `/api/divisions` | List or create divisions |
| PUT, DELETE | `/api/divisions/:divisionId` | Update or delete one division |
| GET, POST | `/api/classrooms` | List or create classrooms |
| PUT, DELETE | `/api/classrooms/:classroomId` | Update or delete one classroom |
| GET, POST | `/api/assignments` | List or create assignments |
| PUT, DELETE | `/api/assignments/:assignmentId` | Update or delete one assignment |
| POST | `/api/generate` | Body `{ "departmentId" }`. Required. |
| GET | `/api/timetable?departmentId=` | Active successful timetable |
| PATCH | `/api/timetable/slots/:slotId` | Move a slot’s day, period, or classroom |
| GET | `/api/generations?departmentId=` | Generation history for that department |

Invalid input returns 400. A missing department, faculty member, or timetable returns 404. A duplicate unique value returns 409. Unexpected failures return 500 with `{ "error": "..." }`. Prisma error details are not sent to the client.

A successful generate response is `{ success: true, generationRunId, slotCount, conflicts: [] }`. A scheduling failure is HTTP 200 with `success: false`, `slotCount: 0`, and the conflict list.

## 12. User Flow

1. Open the app and select Computer Engineering or Information Technology.
2. Review or edit faculty, subjects, divisions, classrooms, and assignments for that department. Availability is edited on the Faculty page.
3. Choose Generate Timetable.
4. On success, open the timetable and switch among Division, Faculty, and Room. A slot’s day, period, or classroom can be changed from the edit form. Invalid moves are rejected.
5. On failure, read the conflict card. The previous successful timetable, if any, stays available when that department is selected again.
6. Open History to see successful and failed attempts for the selected department.

There is no login. The prototype assumes one coordinator.

## 13. Validation and Testing

| Check | Result |
| --- | --- |
| `npm run build` in `server/` | Pass |
| `npm run test:scheduler` | 10 passed, 0 failed |
| `npm run build` in `client/` | Pass |
| Computer Engineering generation | Pass, 34 slots |
| Information Technology generation | Pass, `ROOM_CAPACITY` |
| Browser pass of the main pages and both demos | Pass |
| API checks for health, generate, and timetable | Pass |

Scheduler tests cover a solvable week, faculty, division, and room clashes, unavailable periods, lab rooms, capacity, the IT failure, weekly period counts, and deterministic output.

## 14. Demo Scenarios

Both scenarios are seeded. Generate one department at a time. Rooms are shared, so a combined run is not what the product does.

**Computer Engineering (`CE`)** is solvable. Two divisions need 17 periods each, 34 sessions in total. Labs fit the larger laboratory. Faculty unavailable periods are exceptions, not a full block.

**Information Technology (`IT`)** is impossible on purpose. IT-A has 120 students and a 2-period Computer Networks Lab. The largest lab, LAB-A, holds 70. The assigned faculty member has no availability exceptions. The only hard failure is lab capacity.

## 15. Assumptions

- One weekly grid is shared by every division.
- Working days are Monday–Friday, with periods 1–6.
- Faculty are available unless an exception row exists.
- One faculty member teaches each subject-division assignment.
- Lab and theory are separate subjects.
- Each session is one period. Consecutive double periods are out of scope.
- Authentication is out of scope.
- One coordinator uses the prototype.
- Replacing a department’s active timetable on a new success is acceptable.

## 16. Trade-offs

- **Greedy search instead of an optimization solver.** A solver might place more difficult weeks, but it is harder to explain and to test under a short assignment. The greedy pass is deterministic and states why a session could not be placed.
- **Fixed Monday–Friday, six-period grid.** The assignment assumes one shared grid. A settings table would invalidate availability rows and saved slots whenever the grid changed.
- **No authentication.** The task is timetable correctness, not identity. A login system would not show whether the scheduler is sound.
- **No soft constraints.** Preferences such as fewer gaps are secondary to hard feasibility and clear failures.
- **No drag-and-drop editing.** A coordinator can still move a slot with the edit form. The same hard checks reject an invalid move, and the slot is marked manual.
- **No real-time collaboration.** One coordinator edits setup data. Concurrent editing is a different product.
- **No multi-campus model.** Classrooms are one shared pool. Campus boundaries were not part of the brief.

## 17. Known Limitations

- The search can miss a feasible timetable that a backtracking search or solver would find.
- `GenerationRun` has no department column. A success is tied to a department through its slots. A failure is tied through conflict assignments. Deleting that assignment can drop an old failed run out of history. A department with no assignments is rejected, because a successful run with zero slots could not be tied back to a department.
- Saving a slot back to its original day and period still leaves it marked manual.
- Deleting a faculty member who has no assignments also removes their availability rows, because that relation cascades.
- Editing a room or assignment that is already used does not rewrite or recheck existing timetable slots.
- Lab sessions are single periods, not consecutive blocks.
- Changing `PORT` away from 3001 also requires changing the Vite proxy.

## 18. Setup and Run Instructions

Requirements: Node.js, npm, and a local PostgreSQL database.

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`. The example is:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartschedule?schema=public"
```

Create the `smartschedule` database, then:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

`npm run prisma:migrate` runs `prisma migrate dev`. `npm run prisma:seed` runs `prisma db seed`. The API listens on port 3001.

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173`.

Production builds:

```bash
cd server
npm run build
npm start
```

```bash
cd client
npm run build
npm run preview
```

Scheduler tests, from `server/`:

```bash
npm run test:scheduler
```

## 19. AI-Assisted Development

The implementation was produced with an AI coding assistant in Cursor, in phases: schema and seed, scheduler, API, then UI. Generated code was checked against the brief rather than accepted as-is.

Reviewed decisions included pinning Prisma 6.19.3, keeping the scheduler free of database access, storing only unavailable faculty periods, and identifying a department’s active run through its slots instead of adding a schema column during the API phase. Scheduler unit tests, HTTP checks, and a browser pass over both demo departments were used to confirm behavior. The greedy algorithm is not described as optimal.

## 20. Future Improvements

- Limited backtracking when the greedy pass fails but a feasible timetable may exist
- An availability grid in the coordinator UI
- Create and edit forms for setup data
- Manual slot edits that run the same hard-constraint checks
- A `departmentId` on `GenerationRun` if more than one department must stay active without inferring it from slots
- Soft preferences after hard constraints are stable
