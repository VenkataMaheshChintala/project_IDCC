CREATE TABLE judge_outbox (
    id UUID PRIMARY KEY,
    stream_name VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_judge_outbox_pending ON judge_outbox (status, created_at);
