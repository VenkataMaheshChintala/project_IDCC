ALTER TABLE competitions ADD COLUMN time_limit_minutes INT;
ALTER TABLE competition_participants ADD COLUMN attempt_started_at TIMESTAMP WITH TIME ZONE;
