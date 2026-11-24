# SkillSwap SQL and MongoDB implementation

This project now uses two actual database paradigms: relational MySQL and document-oriented MongoDB. The Next.js resource library at `/` reads and writes MongoDB while resolving student accounts and skill names from MySQL. MongoDB is a running Community Server, not a JSON file or an in-memory substitute.

## Why two databases

MySQL remains the source of truth for `students`, `skills`, `student_skills`, `availability`, `sessions`, `reviews` and `session_audit`. Those records need relational constraints, joins and booking transactions.

MongoDB stores the `learning_resources` collection. Students can share articles, peer-video descriptions, exercises and notes. All documents share core fields, but optional nested metadata varies by format: a video can have `durationMinutes`, a handout can have `pages`, and a note can omit both. Tags are embedded arrays. This adds a real learning feature to the existing skill-exchange domain.

## Architecture

```text
Next.js resource library
  → existing login/profile/skills APIs → MySQL skill_exchange
  → resource CRUD/search/stats APIs   → MongoDB skill_resources
       → MySQL lookup for author and skill names
```

The original MySQL ER diagram remains valid. MongoDB references SQL identifiers; these are application-level links, not SQL foreign keys across database servers.

## MongoDB document model

```javascript
{
  _id: ObjectId,
  ownerId: Number,       // students.id in MySQL
  skillId: Number,       // skills.id in MySQL
  title: String,
  summary: String,
  kind: "article" | "video" | "exercise" | "note",
  url: String,          // optional external http/https link, or empty
  tags: [String],       // up to eight distinct lowercase tags
  metadata: {
    difficulty: "Beginner" | "Intermediate" | "Advanced", // optional
    language: String,         // optional
    durationMinutes: Number,  // optional
    pages: Number             // optional
  },
  createdAt: Date,
  updatedAt: Date
}
```

Seed documents additionally have a unique `demoKey` so running the seed repeatedly does not duplicate them or overwrite edits. MongoDB's native JSON Schema validator enforces required fields, allowed formats, bounds and nested metadata. The API additionally validates integer IDs, inputs and HTTP URLs using Zod.

## Indexes and retrieval

- `resource_text`: weighted text index on title (5), tags (3) and summary (1).
- `resource_skill`: compound index on `skillId` ascending and `createdAt` descending.
- `resource_owner`: author lookup index on `ownerId`.
- `resource_demo_key`: partial unique index for the seed keys. MongoDB also creates its default `_id` index.

Search uses `$text` and sorts by MongoDB text score, then creation time. Empty searches return newest documents. Optional skill and format filters are combined with the search. The endpoint returns at most 100 documents. This is keyword/full-text retrieval, not vector or semantic search; the selected requirement option is SQL + NoSQL.

Popular tags use `$unwind`, `$group`, `$sum`, `$sort` and `$limit`. A `$facet` computes format counts, popular tags, author counts and covered-skill counts. These results drive the live library dashboard.

## APIs

All resource endpoints require the existing signed HTTP-only login cookie.

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/resources?q=&skillId=&kind=` | MongoDB search with MySQL author/skill enrichment |
| POST | `/api/resources` | Validate MySQL student/skill; insert a resource document |
| PUT | `/api/resources/:id` | Author-only update, preserving owner and creation time |
| DELETE | `/api/resources/:id` | Author-only deletion |
| GET | `/api/resources/stats` | MongoDB aggregation plus MySQL record counts |

On each request, the account must still exist in MySQL. Writes require an existing skill. MongoDB document validation protects direct database writes as well. Existing student login/password storage remains in MySQL; no password hashes or authentication tokens are copied into resource documents.

## Consistency and security

There is no distributed transaction between MySQL and MongoDB. Resource mutations write only to MongoDB after SQL validation. The application currently has no student/skill deletion endpoint; out-of-band SQL deletions could leave resource references without a matching record. Reads label missing authors/skills instead of crashing. A future deletion feature must explicitly reconcile resources or use an outbox workflow.

MongoDB binds only to `127.0.0.1:27018` and runs with authentication. The application user has `readWrite` and `dbAdmin` only on `skill_resources` (the latter is used for collection/index setup). Generated application credentials are in the ignored `.env`; generated bootstrap administrator credentials are in ignored `work/mongo-admin.json`. Never copy either into a public repository or presentation. The database files persist under `work/mongo-data`.

## Run on this Windows machine

Double-click `Start-Presentation.bat` in the project root, or run `./Start-Presentation.ps1`. It starts the existing project MySQL instance, starts authenticated MongoDB, adds missing seed resources, and launches Next.js. Open `http://127.0.0.1:3000` and keep the terminal open.

The existing local MySQL launcher and data are required on this machine. If copying source to a different computer, first set up MySQL using the README, then install MongoDB with `scripts/Install-Mongo.ps1`, run `scripts/Start-Mongo.ps1`, `npm run seed:resources`, and `npm run dev`. This downloader uses MongoDB's official Windows ZIP. Initial download needs internet; the installed local demo works offline, except opening external resource links.

Existing demo login: `chandana@example.com` / `Student@123`. This is a seeded academic-demo account, not a real user credential. The page also accepts the existing other sample accounts.

## Two-minute presentation

1. Log in. Show the MySQL student/skill counts beside the MongoDB document/contributor counts.
2. Search `SQL`: MongoDB finds resource documents using the weighted text index. Clear filters with Reset.
3. Open View document. Explain the embedded tags and nested metadata, and the SQL `ownerId` and `skillId` links.
4. Share a resource: choose SQL & Databases, enter a title and note, add tags, and save.
5. Refresh: the new document persists in MongoDB. Edit your own resource to show UPDATE, then delete it if desired.
6. Explain that Popular tags comes from MongoDB aggregation while student identities and skill names come from MySQL joins/lookups.

This addition addresses the SQL + NoSQL requirement and provides a working Next.js interface for the resource feature. It does not by itself complete every remaining documentation, individual-contribution or role-related requirement in the course rubric.
