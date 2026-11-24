# SkillSwap — Student Skill Exchange Platform

A full-stack starter application for students to teach skills, learn from peers, and discover compatible learning partners.

## Requirements
- Node.js 20 or newer (18+ should also work)
- npm
- Internet connection for the first dependency installation

## Run on Windows
1. Extract the ZIP.
2. Open the extracted `SkillSwap-Student-Platform` folder.
3. Double-click `start.bat`, or open a terminal in this folder and run:
   `npm run install:all`
   `npm run dev`
4. Open http://localhost:5173

The API health check is at http://localhost:5000/api/health.

## Demo
Register a new account from the app. The server stores users and profiles in `server/data/db.json`.
This starter uses a local JSON file for persistence. For deployment or multi-user production use, replace it with MongoDB/PostgreSQL and add production security controls.

## Included
- Responsive React dashboard and landing page
- Register, login, logout and protected dashboard routes
- Profile editing and teaching/learning skill lists
- Student discovery with search and filters
- Backend-generated matching suggestions
- Express REST API with bcrypt password hashing and JWT authentication

## API
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/students/me`
- PUT `/api/students/me`
- GET `/api/students`
- GET `/api/matches`
- GET `/api/health`

## Notes
This is a functional academic project starter, not a production-hardened service. Use HTTPS, secure token storage, rate limiting, validation, and a database before public deployment.
