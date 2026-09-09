-- V1__init_schema.sql
-- CodeArena initial database schema

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'PARTICIPANT',
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ─── Competitions ─────────────────────────────────────────────────────────────
CREATE TABLE competitions (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    rules       TEXT,
    start_time  TIMESTAMPTZ,
    end_time    TIMESTAMPTZ,
    status      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    created_by  BIGINT       NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitions_status     ON competitions(status);
CREATE INDEX idx_competitions_start_time ON competitions(start_time);

-- ─── Competition Participants ─────────────────────────────────────────────────
CREATE TABLE competition_participants (
    id              BIGSERIAL PRIMARY KEY,
    competition_id  BIGINT      NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (competition_id, user_id)
);

CREATE INDEX idx_cp_competition ON competition_participants(competition_id);
CREATE INDEX idx_cp_user        ON competition_participants(user_id);

-- ─── Problems ─────────────────────────────────────────────────────────────────
CREATE TABLE problems (
    id               BIGSERIAL PRIMARY KEY,
    competition_id   BIGINT       NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(10)  NOT NULL,          -- A, B, C, ...
    description      TEXT         NOT NULL,
    input_format     TEXT,
    output_format    TEXT,
    constraints      TEXT,
    difficulty       VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    points           INT          NOT NULL DEFAULT 100,
    time_limit_ms    INT          NOT NULL DEFAULT 2000,
    memory_limit_mb  INT          NOT NULL DEFAULT 256,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (competition_id, slug)
);

CREATE INDEX idx_problems_competition ON problems(competition_id);

-- ─── Test Cases ──────────────────────────────────────────────────────────────
CREATE TABLE test_cases (
    id               BIGSERIAL PRIMARY KEY,
    problem_id       BIGINT      NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input            TEXT        NOT NULL,
    expected_output  TEXT        NOT NULL,
    is_sample        BOOLEAN     NOT NULL DEFAULT FALSE,
    is_hidden        BOOLEAN     NOT NULL DEFAULT TRUE,
    points           INT         NOT NULL DEFAULT 0,
    order_index      INT         NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tc_problem    ON test_cases(problem_id);
CREATE INDEX idx_tc_hidden     ON test_cases(problem_id, is_hidden);
CREATE INDEX idx_tc_sample     ON test_cases(problem_id, is_sample);

-- ─── Submissions ─────────────────────────────────────────────────────────────
CREATE TABLE submissions (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users(id),
    competition_id    BIGINT       NOT NULL REFERENCES competitions(id),
    problem_id        BIGINT       NOT NULL REFERENCES problems(id),
    language          VARCHAR(20)  NOT NULL DEFAULT 'JAVA',
    source_code       TEXT         NOT NULL,
    status            VARCHAR(30)  NOT NULL DEFAULT 'QUEUED',
    score             INT          NOT NULL DEFAULT 0,
    max_score         INT          NOT NULL DEFAULT 0,
    execution_time_ms BIGINT,
    memory_used_mb    INT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_sub_user          ON submissions(user_id);
CREATE INDEX idx_sub_competition   ON submissions(competition_id);
CREATE INDEX idx_sub_problem       ON submissions(problem_id);
CREATE INDEX idx_sub_status        ON submissions(status);
CREATE INDEX idx_sub_user_problem  ON submissions(user_id, problem_id, competition_id);

-- ─── Submission Test Results ──────────────────────────────────────────────────
CREATE TABLE submission_test_results (
    id              BIGSERIAL PRIMARY KEY,
    submission_id   BIGINT      NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id    BIGINT      NOT NULL REFERENCES test_cases(id),
    status          VARCHAR(30) NOT NULL,
    points_earned   INT         NOT NULL DEFAULT 0,
    execution_time_ms BIGINT,
    memory_used_mb  INT,
    actual_output   TEXT,           -- stored but NOT returned to participants for hidden tests
    order_index     INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_str_submission ON submission_test_results(submission_id);

-- ─── Leaderboard (materialized view for fast reads) ───────────────────────────
CREATE TABLE leaderboard_entries (
    id              BIGSERIAL PRIMARY KEY,
    competition_id  BIGINT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_score     INT    NOT NULL DEFAULT 0,
    problems_solved INT    NOT NULL DEFAULT 0,
    last_accepted_at TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (competition_id, user_id)
);

CREATE INDEX idx_lb_competition_score ON leaderboard_entries(competition_id, total_score DESC, last_accepted_at ASC);
