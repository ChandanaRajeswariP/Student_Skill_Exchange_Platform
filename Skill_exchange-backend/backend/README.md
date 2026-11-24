# Student Skill Exchange Platform — Database and Backend
Group: PES2UG24AM027, PES2UG24AM043

This repository contains the MySQL database, MongoDB learning-resource library, Next.js APIs and resource interface, and database tests. See docs/SQL-and-MongoDB.md for the new document model, indexes, APIs and presentation steps. On the prepared Windows machine, double-click Start-Presentation.bat and open http://127.0.0.1:3000.

## Deliverables
| Requirement | Files |
|---|---|
| ER diagram and relational schema | docs/ER-diagram.svg, docs/ER-diagram.md, docs/ER-diagram.mmd |
| MySQL tables, keys, constraints, indexes and views | database/01-schema.sql |
| Stored procedure and triggers | database/02-programmability.sql |
| Seed DML | database/03-seed.sql, scripts/setup-db.mjs, scripts/seed-demo.mjs |
| Joins, grouping, aggregates, subqueries and transactions | database/04-queries-and-transactions.sql |
| Actual SQL query results | docs/SQL-results.json |
| MySQL connection pool and transactions | lib/db.js |
| Profile, skill, matching and session APIs | app/api/[...path]/route.js |
| Validation and authentication | lib/validation.mjs, lib/auth.js |
| Endpoint contract | docs/API.md |
| Database and API test cases | scripts/test-database.mjs, scripts/test-api.mjs |
| Validation tests and verified results | tests/validation.test.mjs, docs/Test-report.md |

## Setup
Requirements: Node.js 20.9+ and MySQL 8.0.16+ (CHECK constraints must be enforced). The supplied Docker Compose configuration provides MySQL 8.4.
```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d --wait
```
Set AUTH_SECRET in .env to a random secret of at least 32 characters. The example credentials match the local Docker configuration. Never commit your .env or real credentials.

Run schema and sample-data setup with the database-scoped application user. Install the triggers and stored procedure through the container's local administrator:
```powershell
$env:SKIP_ROUTINES='1'
npm run db:setup
Remove-Item Env:SKIP_ROUTINES
Get-Content -Raw database/02-programmability.sql | docker compose exec -T mysql mysql -uroot -plocal-root-password
npm run seed:demo
npm run dev
```
For standalone MySQL, create skill_exchange and a database-scoped user, configure .env, and run the numbered SQL files with an account permitted to create triggers and procedures. MYSQL_SETUP_USER and MYSQL_SETUP_PASSWORD can override application credentials during npm run db:setup. The Docker credentials are sample values for local development.

The backend listens on http://127.0.0.1:3000. Call the JSON endpoints through an API client or the integration test script. A Next.js learning-resource frontend is now available at /. The new resource feature uses MongoDB and links authors and skills to MySQL. Sample account: chandana@example.com / Student@123.

## Test
With MySQL and the backend running:
```powershell
npm test
npm run test:db
npm run test:api
npm run sql:demo
```
Production compilation: npm run build. Verified results: 6 validation tests, 12 MySQL tests, 33 API checks, and the production build passed. SQL tests roll back temporary records; API tests remove their generated records. Run tests against development databases only. Actual demonstration results are saved in docs/SQL-results.json. Docker setup is supplied but was not executed during verification; an isolated native MySQL 8.0.46 instance was used.

## Database behavior
Matching score = teacher level × 10 + average review × 4 + 30 for overlapping weekly availability. Filters select skill, text, category and minimum teacher experience. This is an explainable SQL ranking.

Booking transactions lock both participant rows in ID order before checking offered skill, future time, teacher availability and conflicts. Sessions use UTC and half-open intervals [start,end), allowing adjacent sessions. Weekly availability uses whole-hour UTC windows. Pending requests reserve time. Only the teacher accepts or completes sessions; completion requires the end time to have passed. Either participant can cancel an active session. Only the learner can review a completed session once.

Authentication and review endpoints support the database records and their integrity. The backend uses parameterized SQL, validation, bcrypt hashes and signed HTTP-only session cookies. This is an academic backend; production hardening such as login throttling and password recovery remains outside scope.

