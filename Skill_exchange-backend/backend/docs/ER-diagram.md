# Student Skill Exchange Platform — ER model
Group: PES2UG24AM027, PES2UG24AM043

```mermaid
erDiagram
    STUDENTS ||--o{ STUDENT_SKILLS : has
    SKILLS ||--o{ STUDENT_SKILLS : identifies
    STUDENTS ||--o{ AVAILABILITY : declares
    STUDENTS ||--o{ SESSIONS : teaches
    STUDENTS ||--o{ SESSIONS : learns
    SKILLS ||--o{ SESSIONS : covers
    SESSIONS ||--o| REVIEWS : receives
    STUDENTS ||--o{ REVIEWS : writes
    SESSIONS ||--o{ SESSION_AUDIT : records
    STUDENTS {
        bigint id PK
        varchar email UK
        varchar name
        varchar password_hash
        varchar bio
        varchar department
        timestamp created_at
    }
    SKILLS {
        bigint id PK
        varchar name UK
        varchar category
    }
    STUDENT_SKILLS {
        bigint student_id PK,FK
        bigint skill_id PK,FK
        enum kind PK
        tinyint level
    }
    AVAILABILITY {
        bigint id PK
        bigint student_id FK
        tinyint day
        tinyint start_hour
        tinyint end_hour
    }
    SESSIONS {
        bigint id PK
        bigint teacher_id FK
        bigint learner_id FK
        bigint skill_id FK
        datetime starts_at
        datetime ends_at
        enum status
        varchar note
        timestamp created_at
    }
    REVIEWS {
        bigint id PK
        bigint session_id FK,UK
        bigint reviewer_id FK
        tinyint rating
        varchar comment
        timestamp created_at
    }
    SESSION_AUDIT {
        bigint id PK
        bigint session_id FK
        varchar old_status
        varchar new_status
        timestamp changed_at
    }
```

Relational schema:
- Students(**id**, name, email UNIQUE, password_hash, bio, department, created_at)
- Skills(**id**, name UNIQUE, category)
- StudentSkills(**student_id, skill_id, kind**, level)
- Availability(**id**, student_id, day, start_hour, end_hour); unique student/day/start/end
- Sessions(**id**, teacher_id, learner_id, skill_id, starts_at, ends_at, status, note, created_at)
- Reviews(**id**, session_id UNIQUE, reviewer_id, rating, comment, created_at)
- SessionAudit(**id**, session_id, old_status, new_status, changed_at)

Each attribute contains one value (1NF). Skill descriptions are independent of student-skill associations, avoiding partial dependencies (2NF). Names and departments are stored on students rather than copied to sessions; skill categories are stored on skills (3NF). Teacher and learner reference the same student entity in different roles. A student can offer and learn the same skill; kind is therefore part of the composite key.

Availability uses UTC, Sunday=0, and whole-hour windows. Sessions use UTC timestamps and half-open intervals [start,end). Rating averages are calculated in a view, avoiding stored aggregate inconsistencies. Pending requests reserve time until accepted or cancelled. Reviews have a unique session key and an insert trigger checking the learner and completed status.

