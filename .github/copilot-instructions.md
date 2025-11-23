<!-- .github/copilot-instructions.md - Project-specific guidance for AI coding agents -->
# Copilot instructions — my-accounting-app

Purpose
- Short, actionable guidance for AI agents working on this repository (full‑stack React + Express + MongoDB).

Big picture
- Frontend: `client_new/` — Create React App (React 19, axios, chart.js). Primary entry `client_new/src/App.js`.
- Backend: `server/` — Express + Mongoose. Single entry `server/index.js` exposes APIs under `/api/*`.
- Data: MongoDB (Mongoose models in `server/models/Record.js` and `server/models/User.js`). `Record` has `description`, `amount` (number; negative = expense), `category`, `createdAt`.
- PDF: Server generates Chinese PDFs with `pdfkit` using font at `server/fonts/NotoSansTC-Regular.ttf` — ensure the font exists or the `/api/export-pdf` endpoint fails.

Key endpoints and flows (examples)
- GET `/api/records` — returns records (frontend uses this in `client_new/src/App.js`).
- POST `/api/records` — create a record; expects `{ description, amount, category }`.
- DELETE `/api/records/:id` — remove record.
- POST `/api/export-pdf` — accepts `{ records }` and returns a PDF stream.
- POST `/api/register` — accepts `{ email, password }`; password hashed with `bcryptjs` and saved to `User` model.

Developer workflows & commands
- Frontend (dev):
  - `cd client_new && npm install && npm start` — starts CRA dev server on `localhost:3000`.
  - `cd client_new && npm run build` — production build.
- Backend (dev):
  - There is no `start` script in `server/package.json`. To run: `cd server && npm install && node index.js` (or use `nodemon index.js` if available).
  - Mongo connection string is currently hard-coded in `server/index.js` as `MONGO_URI` (MongoDB Atlas). Change this file or inject environment variables if you need local DB.

Project-specific conventions & patterns
- API host: The frontend ships with hard-coded cloud URLs in `client_new/src/App.js` and `client_new/src/AuthPage.js` (e.g. `https://my-accounting-app-ev44.onrender.com/api/records`).
  - When switching between local and deployed environments, update these constants or introduce `REACT_APP_API_URL` in `client_new/.env` and update code accordingly.
- Amount semantics: `amount < 0` is treated as expense in UI and charts. Records' `createdAt` is used for time-series aggregation in `StatisticsChart.js`.
- Schema changes: `Record` includes a `category` field with `default: '其他'` — new UI expects categories defined in `client_new/src/App.js`.

Coding agent rules (be specific)
- Preserve CommonJS in `server/` files (modules use `require`/`module.exports`). Do not migrate server to ESM without the developer's explicit request.
- Respect Chinese text and date formatting used across UI and PDF (e.g., `zh-TW` locale). PDF generation requires registering the font in `server/index.js`.
- When changing API paths or payloads, update both `client_new/src/*` and `server/index.js` and run the app locally to verify end-to-end behavior.
- Do not commit secrets: the repo currently contains a hard-coded `MONGO_URI` in `server/index.js`. Flag this for removal and suggest using `.env` and `process.env.MONGO_URI` instead.

Quick examples (curl)
- List records:
  - `curl http://localhost:5000/api/records`
- Create record:
  - `curl -X POST http://localhost:5000/api/records -H "Content-Type: application/json" -d '{"description":"晚餐","amount":-150,"category":"食物"}'`
- Register user:
  - `curl -X POST http://localhost:5000/api/register -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"Secret123"}'`

Files to inspect for changes or patterns
- `server/index.js` — central backend logic, Mongo URI, PDF generation, auth endpoints.
- `server/models/Record.js`, `server/models/User.js` — mongoose schemas.
- `client_new/src/App.js`, `client_new/src/AuthPage.js`, `client_new/src/StatisticsChart.js` — frontend API usage, formatting, chart aggregation logic.
- `client_new/package.json`, `server/package.json` — run scripts and dependencies.

If anything in these sections is unclear or you want additional details (env patterns, CI, or a starter `.env`), tell me which area to expand and I will update this file.