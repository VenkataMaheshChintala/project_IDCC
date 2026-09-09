# CodeArena — Competitive Programming Platform

CodeArena is a comprehensive, open-source competitive programming platform designed for college-level contests. It features real-time leaderboards, a secure Docker-based sandboxed code judge, a scalable backend, and a modern, responsive React frontend.

## Architecture

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS, Monaco Editor.
*   **Backend**: Spring Boot 3, Java 21, Spring Security (JWT).
*   **Judge Worker**: Spring Boot 3, Java 21, Docker Java SDK (for isolated code execution).
*   **Database**: PostgreSQL 15, Flyway (migrations).
*   **Cache & Queues**: Redis 7.

## Key Features

*   **Participant Portal**: Join live competitions, solve problems in an in-browser IDE, test against sample cases, and submit for evaluation.
*   **Admin Dashboard**: Create competitions, add problems with markdown formatting, manage hidden test cases, and monitor live submissions.
*   **Real-time Updates**: Server-Sent Events (SSE) power real-time submission status updates and live leaderboard changes.
*   **Secure Code Execution**: The standalone Judge Worker executes untrusted code inside isolated, network-less Docker containers with strict CPU, memory, and capability limits.
*   **Anti-Cheat**: Server-authoritative countdown timers and strict status enforcements.

## Running Locally (Docker Compose)

The easiest way to run the full stack is using Docker Compose.

1. Ensure you have Docker and Docker Compose installed.
2. Clone the repository and navigate to the root directory.
3. Start all services:
   ```bash
   docker-compose up --build -d
   ```
4. Access the platform:
   * **Frontend**: [http://localhost](http://localhost)
   * **Backend API**: `http://localhost:8080/api`

### Demo Credentials

The database is pre-seeded with demo data (migrations/V2__seed_data.sql).

*   **Admin User**: `admin@codearena.local` / `Admin@123`
*   **Participant User**: `student@codearena.local` / `Student@123`

## Development Setup

If you prefer to run the components individually for development:

1. **Start Infrastructure**:
   ```bash
   docker run -d --name codearena-postgres -p 5432:5432 -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=codearena postgres:15-alpine
   docker run -d --name codearena-redis -p 6379:6379 redis:7-alpine
   ```
2. **Backend**:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
3. **Judge Worker**:
   ```bash
   cd judge-worker
   mvn spring-boot:run
   ```
4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## License
MIT License
