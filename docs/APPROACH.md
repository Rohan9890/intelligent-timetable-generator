# SmartSchedule approach

How the college timetable problem was interpreted and what was built for the Edumerge Solutions assignment.

## Problem interpretation

The coordinator must produce one weekly timetable for many divisions at once. The hard part is not drawing a grid. It is refusing an impossible week and saying which rule blocked it.

Teacher, division, and classroom clashes are occupancy rules. Room size and lab-versus-theory are eligibility rules. Weekly period counts are demand. All of them are hard. A timetable that breaks one of them is not a timetable.

The product therefore has two successful outcomes: a complete grid, or a written diagnosis. “Generation failed” is not an outcome.

## Assumptions

Every division shares Monday–Friday and periods 1–6. Faculty are available unless a row says otherwise. One faculty member owns each subject-division assignment. Theory and lab are separate subjects, and each session is one period. The user is a single coordinator. Authentication, fees, attendance, and messaging are outside the brief. Replacing a department’s active timetable when a new generation succeeds is acceptable.

## User roles

The primary user is the timetable coordinator. They select a department, inspect setup data, generate, and read either the grid or the conflict card.

Faculty are a secondary audience in the sense that the timetable can be filtered to one teacher. There is no separate faculty login.

## Core workflow

1. Seed or API data defines departments, people, subjects, divisions, rooms, unavailable periods, and assignments.
2. The coordinator selects a department. Computer Engineering and Information Technology are the two seeded cases.
3. Generate loads that department’s assignments and the shared classrooms.
4. The pure scheduler either places every required session or returns conflicts.
5. Success becomes the active timetable. Failure is stored and the previous success stays active.
6. The UI filters the active slots by division, faculty, or room. It does not call three different timetable APIs.

Setup pages are lists. Creating records is supported by the API, not by forms in the UI.

## Hard constraints

Occupancy: one faculty member, one division, and one room per day and period.

Eligibility: capacity must cover the division, labs use lab rooms only, and theory uses classrooms only. Unavailable periods are never chosen.

Demand: `periodsPerWeek` sessions must all be placed, and that number cannot exceed 30. The database checks positive counts and the period range 1–6. It does not re-implement lab, capacity, or clash rules. Those belong to the scheduler, which is what gets tested.

## Scheduling decisions

The engine is greedy and most-constrained-first. Sessions with fewer legal day/period/room options go first, so a lab that fits only one room is placed before a theory class that fits several rooms. Among legal candidates, the earliest day and period wins, then the smallest suitable room, so a large room is not taken when a smaller one works.

This is deterministic. It is not claimed to be optimal. A later session can fail even when a different earlier choice would have left room. That limit is acceptable here because every failure still names the blocking rule, and the solvable demo fits without search backtracking.

The scheduler receives plain objects. The generation service is the only place that knows Prisma. Tests can build a tiny college in memory and assert clashes, capacity, labs, weekly counts, and stable output.

Reason codes are conservative. A reason is reported when that rule alone accounts for the failure. If faculty clash and room clash both fully explain it, the code is `INSUFFICIENT_CANDIDATE_SLOTS` and the evidence counts are kept.

## Failure handling

`POST /api/generate` requires `departmentId`, so the solvable and impossible demos are not mixed.

On success, one transaction deactivates that department’s previous active run and inserts the new run plus every slot.

On failure, one transaction inserts a failed run and conflict reports. Slot rows are not inserted. The previous active run is left alone. The IT demo can fail without removing the 34 Computer Engineering slots.

`GenerationRun` has no department column. The active run is found by joining slots to divisions. That is safe only because each generate call writes one department, and a department with nothing to schedule is rejected instead of saving an empty success.

The conflict card shows the subject, the reason, the summary, required and compatible periods, and the suggested actions. For the IT lab, that is room capacity, 2 required periods, and 0 compatible periods.

## Technical trade-offs

A constraint solver would search a larger space and might schedule weeks this greedy pass cannot. It would also make the failure explanation depend on solver internals. The assignment rewards a clear explanation more than a optimality proof, so the greedy module stayed small and tested.

A fixed grid avoids a settings change that would invalidate availability and slots. No login, no soft preferences, no drag-and-drop, no live collaboration, and no multi-campus model were left out because each one is a separate product around the same scheduler. They do not answer whether a week is feasible.

Prisma 6.19.3 stays on the classic schema URL. Moving to Prisma 7 or 8 would change client construction without improving scheduling.

## Validation strategy

Scheduler tests do not touch the database. They cover the solvable week, the three occupancy rules, unavailable periods, lab rooms, capacity, the IT capacity failure, exact weekly counts, and two identical runs.

The API was checked with health, faculty, divisions, Computer Engineering generate (34 slots), timetable fetch, and Information Technology generate (`ROOM_CAPACITY`, no slots, previous success still active).

The browser pass opened Overview, Timetable, and each setup page, switched division, faculty, and room, confirmed the 34-period success, and confirmed the IT conflict card plus the empty-timetable message. Backend and frontend production builds both passed.

## Future improvements

Limited backtracking, an availability editor, setup forms, and manual edits that reuse the same hard checks. A `departmentId` on the generation run if active timetables must be addressed without looking at slots. Soft preferences only after the hard pass remains explainable.
