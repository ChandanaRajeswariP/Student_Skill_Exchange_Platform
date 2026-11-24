# Database and Backend Test Report
Verified on 22 October 2026, Asia/Kolkata.
Environment: Windows, Node.js 24.16.0, Next.js 16.4.2, MySQL 8.0.46, isolated project database at 127.0.0.1:3307.

| Verification | Actual result |
|---|---|
| Production build | Passed; API handler compiles successfully |
| Input validation | 6 passed |
| Live MySQL database tests | 12 passed |
| Live API integration checks | 33 passed |
| SQL demonstrations | Executed; actual outputs in SQL-results.json |

## SQL cases and observed results
| Test case | Observed result |
|---|---|
| Duplicate student email | ER_DUP_ENTRY |
| Orphan student-skill reference | ER_NO_REFERENCED_ROW_2 |
| Skill level outside 1–5 | ER_CHECK_CONSTRAINT_VIOLATED |
| Reversed availability window | ER_CHECK_CONSTRAINT_VIOLATED |
| Review before completion | ER_SIGNAL_EXCEPTION from trigger |
| Accepted and completed status transitions | Two audit rows |
| Review by someone other than learner | ER_SIGNAL_EXCEPTION |
| Eligible 5-star review | Rating view reports 5.00, count 1 |
| Duplicate review | ER_DUP_ENTRY |
| Join with correlated aggregate subquery | Expected test teacher returned |
| student_summary stored procedure | Expected completed-session count 1 |
| Transaction rollback | Temporary students no longer exist |

## API cases
33 checks cover same-origin/foreign-origin handling, authentication, malformed registration, three test-user registrations and profile reads, duplicate email, incorrect password, profile and availability updates, offering a skill, invalid level, matching inclusion and score, self-exclusion, self-booking and unoffered-skill rejection, simultaneous overlapping bookings, participant authorization, teacher-only acceptance, early completion rejection, review eligibility and uniqueness, review listing and logout.

Two simultaneous identical requests produce exactly one 201 response and one 409 response. The completion test moves only its generated fixture to the past via SQL, then completes it through the normal API. SQL tests roll back all fixtures. API tests remove their generated records in a finally block. Auto-increment gaps after tests are expected.

## SQL query results
Run npm run sql:demo to regenerate docs/SQL-results.json from database/04-queries-and-transactions.sql. The output captures joined teacher/skill rows; category grouping with COUNT, AVG and HAVING; a correlated subquery; skill-popularity and teacher-rating views; student_summary output; a temporary UPDATE followed by ROLLBACK; a booking-conflict query; and EXPLAIN index details.

## Reproduction
With project MySQL and the backend running: npm test; npm run test:db; npm run test:api; npm run sql:demo. Production compilation: npm run build.

Scope is database design, SQL, backend APIs and database testing. No frontend, NoSQL or browser testing is part of this report. Docker, internet deployment and sustained load testing were not performed.

## SQL and MongoDB addition verified 2 November 2026
The project now includes a Next.js resource interface and authenticated MongoDB storage. The earlier no-frontend/no-NoSQL scope above describes the original October implementation. See MongoDB-verification.md for the current verification: production build, 28 resource integration checks, 33 existing API checks, 12 MySQL checks, 6 validation tests, and browser create/search/persistence checks all passed.
