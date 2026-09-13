-- V4__add_code_drafts.sql

CREATE TABLE code_drafts (
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id      BIGINT       NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language        VARCHAR(20)  NOT NULL,
    source_code     TEXT         NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, problem_id, language)
);

CREATE INDEX idx_code_drafts_user_problem ON code_drafts(user_id, problem_id);
