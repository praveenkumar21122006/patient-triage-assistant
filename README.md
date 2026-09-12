# Patient Intake Triage Assistant

A self-contained Node.js web app for walk-in clinics and urgent-care intake. Staff capture a patient's complaint, vitals, red flags and history; a deterministic rule-based engine assigns a triage priority (Level 1–5) and expected wait, and stores every encounter locally.

Single process — no separate frontend build, no external database server. The engine runs fully offline.

## Features

- **Intake form** with dynamic red-flag checklists per complaint category and a **live triage preview** as you type
- **Rule-based triage engine** (`src/triage.js`) — a simplified ESI-style 5-level scale:

  | Level | Label | Expected wait |
  |------:|-------|---------------|
  | 1 | Resuscitation | Immediate — physician now |
  | 2 | Emergent | Within 10 minutes |
  | 3 | Urgent | Within 30 minutes |
  | 4 | Less urgent | Within 60–120 minutes |
  | 5 | Non-urgent | Within 2–4 hours |

- Rules cover life-threatening keywords in free text, per-category red flags, **age-adjusted vital thresholds** (infant / 1–5 / 6–12 / adult), severe pain, high-risk categories and relevant co-morbidities
- **Login & sessions** — staff authenticate at `/login`; sessions are cookie-based (`httpOnly`, `sameSite=lax`) with scrypt-hashed passwords and persist across restarts. All pages and API endpoints except `/login`, `/logout` and `/api/health` are protected.
- **Dashboard** — queue of assessments with per-level filters and counts, plus per-patient **visit history**
- **Local persistence** via SQLite (WASM, no native compilation) with sample data seeded on first run
- JSON APIs for assessment scoring and the intake feed (`/api/assess`, `/api/intakes`)

> **Disclaimer.** This is a guideline-level urgency estimate, not a diagnosis, and never a substitute for professional clinical judgment. When in doubt, escalate.

## Quick start

```bash
cd patient-triage
npm install
npm start          # → http://localhost:3000
```

First run seeds 5 sample encounters and a default login, so the dashboard is populated immediately. Data is stored in `./data/triage.db` (auto-created; delete it to re-seed).

Default login (printed to the server console on first run):

```
username: admin
password: admin123        # set ADMIN_PASSWORD=... in .env to choose your own
```

Anyone can create their own account at `/register` (username + password, min 8 chars); the account is logged in automatically after creation.

Development auto-restart:

```bash
npm run dev
```

## Tests

```bash
npm test
```

38 tests: 15 unit tests for the triage engine (vitals, red flags, pediatric handling, keyword detection) and 23 HTTP tests covering authentication, registration, login/logout, route protection and the intake/database layer.

## Project layout

```
patient-triage/
├── src/
│   ├── server.js            # entry point (boots db, seeds, listens)
│   ├── app.js               # express app, middleware, error handling
│   ├── db.js                # sql.js (SQLite/WASM) layer + schema
│   ├── auth.js              # scrypt password hashing + session middleware
│   ├── triage.js            # rule-based assessment engine
│   ├── triage-data.js       # categories, red flags, thresholds, vitals ranges
│   ├── seed.js              # 5-sample demo data + default admin user
│   ├── format.js            # display helpers (time-ago, dates)
│   ├── routes/
│   │   ├── index.js         # dashboard, intake, patient detail, APIs
│   │   └── auth.js          # /login, /logout, /register
│   ├── views/               # EJS templates (layout, login, register, dashboard, intake, patient)
│   └── public/app.js        # live preview + dynamic form behaviour
└── test/                    # triage unit tests + HTTP integration tests
```

## Configuration

`.env` (all optional):

```
PORT=3000
HOST=0.0.0.0
DB_PATH=/path/to/triage.db
ADMIN_PASSWORD=your-own-password
```

## API

All endpoints except `/api/health` require a valid login session (cookie).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/login` | Log in |
| POST | `/login` | Authenticate and start a session |
| GET | `/register` | Registration form |
| POST | `/register` | Create an account (auto-logs in) |
| POST | `/logout` | End the session |
| GET | `/` | Dashboard |
| GET | `/intake/new` | Intake form (`?patient=<id>` pre-fills a returning patient) |
| POST | `/intake` | Create patient (if new) + triage intake, redirects to patient page |
| GET | `/patients/:id` | Patient profile + visit history |
| GET | `/api/intakes?level=N` | JSON intake feed |
| POST | `/api/assess` | Score a raw payload → triage result |
| GET | `/api/health` | Health check |

Example assessment payload:

```json
{
  "complaint": "chest tightness",
  "category": "chest-pain",
  "painLevel": 7,
  "redFlags": ["cp-radiating", "cp-autonomic"],
  "vitals": { "temp": 36.8, "hr": 118, "rr": 22, "sbp": 148, "dbp": 90, "spo2": 96 },
  "age": 45
}
```

Response includes `level`, `color`, `label`, `wait`, plus `reasons`, `vitalsFlags` and `recommendations` explaining the decision.