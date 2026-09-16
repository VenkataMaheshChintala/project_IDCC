-- Remove the difficulty column from problems; difficulty is no longer used.
ALTER TABLE problems DROP COLUMN IF EXISTS difficulty;
