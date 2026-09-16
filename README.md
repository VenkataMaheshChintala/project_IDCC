# CodeArena — Scalable Competitive Programming Platform

CodeArena is an enterprise-grade, open-source competitive programming and contest platform built for colleges, hackathons, and coding competitions. It features real-time scoring with partial marking, live leaderboards, an isolated multi-language Docker execution sandbox, comprehensive anti-cheat proctoring, and a modern, high-performance web interface.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React 19 + TypeScript   │
                          │   Vite + Monaco Editor    │
                          │      Tailwind CSS UI      │
                          └─────────────┬─────────────┘
                                        │ HTTP / REST / SSE
                                        ▼
                          ┌───────────────────────────┐
                          │    Spring Boot Backend    │
                          │      Java 21 + JWT        │
                          │   Rate Limiting & Admin   │
                          └──────┬──────────────┬─────┘
                                 │              │
                   JPA / Flyway  │              │ Redis Pub/Sub & Queue
                                 ▼              ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │  PostgreSQL 15   │  │       Redis 7        │
                    │ Database Storage │  │  Queues & SSE Events │
                    └──────────────────┘  └──────────┬───────────┘
                                                     │ Job Dispatch
                                                     ▼
                                          ┌──────────────────────┐
                                          │     Judge Worker     │
                                          │   (Docker Sandbox)   │
                                          └──────────┬───────────┘
                                                     │ Container Spawn
                                                     ▼
                                          ┌──────────────────────┐
                                          │ codearena-sandbox    │
                                          │ C, C++, Java, Python │
                                          └──────────────────────┘
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React, `react-markdown`, `remark-gfm`, `remark-breaks`, Axios |
| **Backend API** | Spring Boot 3.2 (Java 21), Spring Security (Stateless JWT), Spring Data JPA, Hibernate, Bucket4j (Rate limiting), Apache POI (Excel export), Apache Commons CSV, Flyway DB Migrations |
| **Judge Engine** | Spring Boot 3 (Java 21), Docker Java SDK, Redis Queue Worker, Exact & Whitespace-Tolerant Output Comparators |
| **Execution Sandbox** | `codearena-sandbox:latest` (Alpine-based, OpenJDK 21, Python 3, GCC/G++ 20, network-less, memory/CPU caps, seccomp/cgroup isolated) |
| **Persistence & Cache** | PostgreSQL 15, Redis 7 (Queues, Task status, Code draft cache, SSE stream dispatch) |
| **DevOps / Deployment** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## Key Features & Capabilities

### 1. Participant Portal & Coding Experience
- **In-Browser IDE**: Monaco Editor with syntax highlighting, autocomplete, code folding, and multi-language support (Java 21, Python 3, C, C++).
- **Two-Stage Code Testing**:
  - **Run Code**: Instantly compiles and executes code against public sample test cases with visible inputs, outputs, and diffs.
  - **Submit Code**: Enqueues code for background evaluation against hidden test cases.
- **Code Draft Auto-Saving**: Automatically preserves in-progress code per user, problem, and language in both local storage and the database.
- **Rules & Guide Modals**: In-platform Markdown rendered competition guidelines and platform instructions.

### 2. Multi-Tiered Evaluation & Partial Scoring
- **Per-Testcase Points**: Admins assign distinct marks/points to individual test cases.
- **Partial Credit Evaluation**: If a participant passes a subset of test cases, they are awarded the sum of points for the passing cases with a `PARTIAL` status.
- **Participant Total Score**: The participant's competition total reflects the sum of their best scores across all problems.
- **"Solved" Qualification**: A problem is officially counted as "Solved" only when 100% of test cases pass (`ACCEPTED`).
- **Verdicts Supported**: `ACCEPTED`, `PARTIAL`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILATION_ERROR`, `SYSTEM_ERROR`.

### 3. Real-Time Leaderboard & Tie-Breaking
- **Live SSE Updates**: Server-Sent Events stream live submissions, verdict changes, and leaderboard shifts without manual page refreshing.
- **Fair Tie-Breaking**: Ranks users by `Total Score (DESC)` followed by `Last Score Improvement Timestamp (ASC)` (rewarding earlier achievements).
- **Participant Drill-Down**: Admins can inspect a participant's submission history, exact source code, execution times, and per-testcase breakdowns.

### 4. Anti-Cheat & Contest Proctoring
- **Server-Authoritative Timer**: Competition start, duration, and expiration timestamps are tracked and enforced by the backend.
- **Fullscreen & Tab Monitoring**: Detects tab-switching, window blurring, and exiting fullscreen mode.
- **Configurable Warning Limits**: Automatically flags or terminates attempts if the maximum warning threshold is exceeded, recording the termination reason.
- **Admin Resume Capability**: Allows contest organizers to reinstate terminated student attempts with a single click.

### 5. Problem & Test Case Management (Admin)
- **Rich Markdown Statements**: Live Markdown preview with `remark-breaks` support (single `Enter` generates immediate line breaks).
- **Dynamic Test Case CRUD**: Add, edit (inputs, expected outputs, marks/points allocation), reorder, and delete test cases.
- **Sample vs. Hidden Flags**: Toggle visibility of sample cases vs. judging cases.
- **Dynamic Total Score Derivation**: Problem total marks are automatically computed from the sum of test case points.

### 6. One-Click Reports & Data Export
- **Leaderboard CSV Export**: Exports rankings, usernames, total points, problems solved, and completion timestamps.
- **Submissions CSV Export**: Exports full submission histories including source code, language, time spent, verdict, and points.
- **Participants Excel Export (`.xlsx`)**: Exports complete student team rosters, individual roll numbers, contact numbers, attempt start/end times, warnings, and proctoring status.

### 7. Two-Member Team Registration
- Designed for team hackathons with registration capturing **Student 1 Name & Roll No**, **Student 2 Name & Roll No**, **Contact Phone**, **Username**, and **Password**.

---

## Supported Programming Languages

| Language | Standard / Compiler | Execution Sandbox |
|---|---|---|
| **Java** | OpenJDK 21 | Memory Cap: 256MB, CPU: 1.0 core, Read-only FS |
| **Python** | Python 3.11+ | Memory Cap: 128MB, CPU: 1.0 core, Network-disabled |
| **C** | GCC 13 (C17 standard) | Memory Cap: 128MB, CPU: 1.0 core, Network-disabled |
| **C++** | G++ 13 (C++20 standard) | Memory Cap: 128MB, CPU: 1.0 core, Network-disabled |

---

## Quickstart with Docker Compose

The fastest way to spin up the entire platform (Frontend, Backend, Judge Worker, Redis, PostgreSQL, and Sandbox) is via Docker Compose:

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)

### 2. Launch Services
```bash
# Clone the repository
git clone https://github.com/your-username/IDCC.git
cd IDCC

# Copy example environment configuration
cp .env.example .env

# Build and start all containers in the background
docker compose up --build -d
```

### 3. Verify Running Containers
```bash
docker compose ps
```
You should see:
- `codearena-frontend` (Port `80`)
- `codearena-backend` (Port `8080`)
- `codearena-judge-worker` (Background Worker)
- `codearena-postgres` (Port `5432`)
- `codearena-redis` (Port `6379`)

### 4. Access the Platform
- **Web App**: [http://localhost](http://localhost)
- **Backend API**: `http://localhost:8080/api`
- **Health Check**: `http://localhost:8080/actuator/health`

---

## Default Seed Credentials

When starting on a fresh database, Flyway automatically provisions demo users (`db/migration/V2__seed_data.sql`):

| Role | Username / Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@codearena.local` | `Admin@123` | Full control over competitions, problems, testcases, exports, proctoring |
| **Participant** | `student@codearena.local` | `Student@123` | Student contestant access to competitions, IDE, submissions |

---

## Local Development Setup

To run and debug individual components natively on your host machine:

### 1. Start Supporting Infrastructure
```bash
docker run -d --name codearena-postgres -p 5432:5432 \
  -e POSTGRES_DB=codearena \
  -e POSTGRES_USER=codearena \
  -e POSTGRES_PASSWORD=changeme \
  postgres:15-alpine

docker run -d --name codearena-redis -p 6379:6379 redis:7-alpine
```

### 2. Build the Sandbox Image (Required for Judge Worker)
```bash
docker build -t codearena-sandbox:latest -f docker/Dockerfile.sandbox docker/
```

### 3. Start the Backend (Java 21)
```bash
cd backend
mvn spring-boot:run
```

### 4. Start the Judge Worker (Java 21)
```bash
cd judge-worker
mvn spring-boot:run
```

### 5. Start the Frontend (Node 20+)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `POSTGRES_DB` | `codearena` | Database name |
| `POSTGRES_USER` | `codearena` | Database user |
| `POSTGRES_PASSWORD` | `changeme` | Database password |
| `DATABASE_URL` | `jdbc:postgresql://postgres:5432/codearena` | JDBC Connection URL |
| `REDIS_HOST` | `redis` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | *(64+ char random secret)* | Key used for signing JWT auth tokens |
| `JWT_EXPIRATION_MS` | `86400000` (24h) | JWT Token validity period |
| `JUDGE_CPU_LIMIT` | `1.0` | Max CPU cores per evaluation container |
| `JUDGE_MEMORY_LIMIT_MB` | `256` | Max RAM allocated per evaluation |
| `JUDGE_TIMEOUT_SECONDS` | `10` | Hard evaluation timeout threshold |
| `VITE_API_URL` | `/api` | Base API URL for frontend Axios client |

---

## Database Migrations (Flyway)

Database evolution is version-controlled in `backend/src/main/resources/db/migration/`:

- `V1__init_schema.sql`: Core tables (`users`, `competitions`, `problems`, `test_cases`, `submissions`, `leaderboard_entries`).
- `V2__seed_data.sql`: Initial sample competitions, problems, and demo accounts.
- `V3__update_passwords.sql`: Password security updates.
- `V4__add_leetcode_style_fields.sql`: Input/Output format and constraint definitions.
- `V7`–`V8`: Attempt timestamps, server-enforced duration, and proctoring metadata.
- `V10__update_user_fields.sql`: Two-member student team fields.
- `V12__add_judge_outbox.sql`: Reliable transactional submission outbox.
- `V14__add_code_drafts.sql`: Autosaved user code drafts.
- `V15__add_participant_warnings_and_reason.sql`: Anti-cheat warning counters and disconnect reason tracking.
- `V16__drop_difficulty_column.sql`: Clean problem management without obsolete difficulty tiers.
- `V17__recalculate_leaderboard_with_partial_scores.sql`: Partial marking scoring migration.

---

## Directory Structure

```
.
├── backend/                  # Spring Boot 3 REST API
│   ├── src/main/java/        # Application code (Controllers, Services, Security, Entities)
│   └── src/main/resources/   # DB Migrations (Flyway), application.yml
├── frontend/                 # React 19 + TypeScript + Vite SPA
│   ├── src/api/              # Axios endpoints & API client
│   ├── src/components/       # Modals, Navbar, Badges, Timers
│   ├── src/context/          # AuthContext & AttemptContext (Proctoring)
│   └── src/pages/            # Problem IDE, Competitions, Admin Dashboards
├── judge-worker/             # Autonomous Code Evaluation Engine
│   └── src/main/java/        # Docker sandbox runners, queue listeners, score comparators
├── docker/                   # Dockerfiles for Backend, Frontend, Judge, Sandbox
├── database/                 # Additional SQL seed scripts
├── docker-compose.yml        # Full-stack deployment orchestration
└── README.md                 # Project documentation
```

---

## License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for educational and commercial purposes.
