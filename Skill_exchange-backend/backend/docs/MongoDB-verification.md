# SQL and MongoDB verification

Verified on 2 November 2026 against the local Chandana DBMS project.

| Check | Result |
|---|---|
| Next.js production build | Passed, including the resource UI and all three new API route segments |
| Existing validation tests | 6 passed |
| Existing MySQL database tests | 12 passed; fixtures rolled back |
| Existing backend API tests | 33 passed; generated records removed |
| New MySQL/MongoDB resource integration tests | 28 passed; temporary resource removed |
| Browser login | Passed with the existing MySQL demo account |
| Browser full-text search | SQL search returned the matching resource cards |
| Browser create and persistence | Saved a resource through the form, refreshed, and verified it remained |
| Browser document inspection | Showed the actual persisted document, tags, metadata and MySQL reference IDs |

The 28 new checks cover authentication, MySQL account and skill validation, malformed metadata, same-origin browser-style requests, cross-origin rejection, MongoDB create/read/update/delete persistence, full-text search, filters, author/skill enrichment from MySQL, author-only modification, aggregation totals, invalid identifiers, native MongoDB document validation, text-index creation and logout. During browser testing, a request-host mismatch was corrected by comparing Origin to the actual Host header, matching the existing application policy. The integration requests now send Origin so this behavior is exercised.

Local services: MySQL on 127.0.0.1:3307; authenticated MongoDB Community 8.0.17 on 127.0.0.1:27018; Next.js on 127.0.0.1:3000. No cloud service, AI model or external account is required. Resource links may require internet, but database operations work locally.

The live library contains six idempotently seeded examples plus a note created through the browser explaining the two databases. No unrelated records were removed. Dependencies were installed with a lockfile, and npm reported zero known vulnerabilities during the MongoDB driver installation.

Source changes are saved locally. They have not been committed or pushed to GitHub. This verification establishes the added SQL + NoSQL feature; it is not a claim that every item in the course rubric is complete.
