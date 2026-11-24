# API contract
All routes are Next.js App Router handlers. JSON request and response bodies. Protected routes derive identity from a signed, HTTP-only cookie; clients cannot choose the acting student ID.

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register | name, email, password; creates account and session |
| POST | /api/auth/login | email, password |
| POST | /api/auth/logout | ends browser session |
| GET | /api/profile | own details, skills, availability |
| PUT | /api/profile | name, bio, department, availability: [{day,start,end}] |
| POST / DELETE | /api/profile/skills | skillId, kind: offer or learn, level: 1–5 |
| GET | /api/skills | catalogue and offer/learn counts |
| GET | /api/matches | q, skillId, category, level filters |
| GET | /api/availability?studentId=2 | weekly UTC availability |
| GET / POST | /api/sessions | list own sessions / teacherId, skillId, start ISO UTC, duration, note |
| PATCH | /api/sessions/:id | status: accepted, cancelled, completed |
| GET | /api/reviews?teacherId=2 | teacher feedback |
| POST | /api/reviews | sessionId, rating, comment |

Status codes: 400 invalid JSON or fields, 401 missing/invalid session, 403 forbidden participant/action, 404 missing route/record, 409 duplicate or conflict, 503 unavailable database. Errors use `{ "error": "human-readable message" }`.

Matching first filters offered skills, category, minimum level and text, excluding the current student. Score = level×10 + average review×4 + 30 if any weekly availability overlaps; maximum 100. This is an explainable rule-based ranking, not machine learning. A beginner learner's desired level is not interpreted as a required teacher level; use the explicit minimum teacher level filter.

Booking locks both student rows in sorted ID order within a MySQL transaction, then checks offered skill, future time, teacher availability and conflicts across both teacher and learner roles. Requests reserve time. Only the teacher can accept; either participant can cancel an active session; only the teacher can complete an accepted session after its end. Only the learner can review a completed session once.

Security scope: parameterized queries, bcrypt password hashes, Zod validation, same-site cookies, same-origin mutation checks, participant checks. Before internet deployment add login throttling, email verification, password reset, monitoring, HTTPS and managed secrets. This repository is a local academic demo.