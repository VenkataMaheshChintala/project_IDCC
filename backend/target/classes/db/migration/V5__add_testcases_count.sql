-- V5__add_testcases_count.sql
ALTER TABLE submissions
ADD COLUMN passed_test_cases INT NOT NULL DEFAULT 0,
ADD COLUMN total_test_cases INT NOT NULL DEFAULT 0;
