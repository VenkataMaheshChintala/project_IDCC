# CodeArena Project Context

CodeArena is a scalable, open-source competitive programming platform designed for hackathons and coding competitions.

## Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (for the in-browser IDE).
- **Backend API:** Spring Boot 3.2 (Java 21), Spring Security (Stateless JWT), Spring Data JPA, PostgreSQL 15, Flyway.
- **Judge Engine:** A separate Spring Boot (Java 21) application that uses the Docker Java SDK and a Redis Queue Worker. It evaluates submissions in an isolated environment.
- **Execution Sandbox:** A custom Docker image (`codearena-sandbox:latest`) that provides isolated execution environments for Java, Python, C, and C++ code with memory and CPU limits.
- **Persistence & Cache:** PostgreSQL 15 for data, Redis 7 for queues, code draft cache, and Server-Sent Events (SSE) dispatch.

## Key Features

1. **Participant Portal:** In-browser IDE (Monaco Editor) supporting multi-language execution (Java, Python, C, C++), auto-saving drafts, and two-stage testing (run on samples, submit for full evaluation).
2. **Evaluation System:** Supports partial marking (per-testcase points). Verdicts include ACCEPTED, PARTIAL, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc.
3. **Leaderboard:** Real-time updates using Server-Sent Events (SSE).
4. **Anti-Cheat:** Server-authoritative timers, fullscreen/tab monitoring, and configurable warning limits.
5. **Admin Capabilities:** Rich Markdown problem statements, dynamic test case CRUD, one-click reports export (CSV/Excel).
6. **Team Registration:** Specialized registration for two-member student teams.

## Structure

- `backend/`: Spring Boot REST API
- `frontend/`: React SPA
- `judge-worker/`: Code Evaluation Engine
- `docker/`: Dockerfiles for deployment and sandboxing
- `database/`: SQL seed scripts

## Development

The project is designed to be easily spun up using Docker Compose (`docker-compose.yml`), which launches the frontend, backend, judge-worker, Postgres, and Redis containers.
