ALTER TABLE competition_participants ADD COLUMN end_reason VARCHAR(50);
ALTER TABLE competition_participants ADD COLUMN warnings_count INT NOT NULL DEFAULT 0;
