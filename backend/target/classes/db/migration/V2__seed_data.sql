-- V2__seed_data.sql
-- Development seed data — NOT for production

-- Admin user (password: Admin@123 — BCrypt hash)
INSERT INTO users (email, username, password, role)
VALUES ('admin@codearena.local', 'admin',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2sgiKynmae',
        'ADMIN');

-- Participant (password: Student@123)
INSERT INTO users (email, username, password, role)
VALUES ('student@codearena.local', 'student1',
        '$2a$12$8K1p/a0dR1xqM8K3T7Qk7.5kLjS5K5dM2p5D5O5m5f5G5H5I5J5K5',
        'PARTICIPANT');

-- Demo competition
INSERT INTO competitions (name, description, rules, start_time, end_time, status, created_by)
VALUES (
    'CodeArena Demo Contest',
    'A demonstration competition featuring three classic algorithmic problems. Perfect for getting familiar with the CodeArena platform.',
    E'## Rules\n\n1. Only Java 21 submissions are accepted.\n2. You may submit as many times as you want.\n3. Only your highest-scoring submission counts.\n4. The leaderboard is ranked by total score, then by time of last accepted submission.',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours',
    'LIVE',
    1
);

-- Problem A: Two Sum
INSERT INTO problems (competition_id, title, slug, description, input_format, output_format, constraints, difficulty, points, time_limit_ms, memory_limit_mb)
VALUES (
    1,
    'Two Sum',
    'A',
    E'## Two Sum\n\nGiven an array of integers `nums` and an integer `target`, return **the indices** of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the indices in ascending order.',
    E'Line 1: `n` — the number of elements\nLine 2: `n` space-separated integers\nLine 3: `target` — the target sum',
    E'Two space-separated integers — the indices (0-indexed) in ascending order.',
    E'- 2 ≤ n ≤ 10⁴\n- -10⁹ ≤ nums[i] ≤ 10⁹\n- -10⁹ ≤ target ≤ 10⁹\n- Exactly one valid answer exists.',
    'EASY',
    100,
    2000,
    256
);

-- Problem B: Maximum Subarray
INSERT INTO problems (competition_id, title, slug, description, input_format, output_format, constraints, difficulty, points, time_limit_ms, memory_limit_mb)
VALUES (
    1,
    'Maximum Subarray',
    'B',
    E'## Maximum Subarray\n\nGiven an integer array `nums`, find the subarray with the largest sum and return its sum.\n\nA **subarray** is a contiguous non-empty part of an array.',
    E'Line 1: `n` — the number of elements\nLine 2: `n` space-separated integers',
    E'A single integer — the maximum subarray sum.',
    E'- 1 ≤ n ≤ 10⁵\n- -10⁴ ≤ nums[i] ≤ 10⁴',
    'MEDIUM',
    150,
    2000,
    256
);

-- Problem C: Number of Islands
INSERT INTO problems (competition_id, title, slug, description, input_format, output_format, constraints, difficulty, points, time_limit_ms, memory_limit_mb)
VALUES (
    1,
    'Number of Islands',
    'C',
    E'## Number of Islands\n\nGiven an `m x n` 2D binary grid which represents a map of `''1''`s (land) and `''0''`s (water), return the number of islands.\n\nAn **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.',
    E'Line 1: `m n` — dimensions of the grid\nNext `m` lines: a string of `n` characters (''1'' or ''0'')',
    E'A single integer — the number of islands.',
    E'- 1 ≤ m, n ≤ 300\n- grid[i][j] is ''0'' or ''1''',
    'HARD',
    200,
    3000,
    256
);

-- Test cases for Problem A (Two Sum)
INSERT INTO test_cases (problem_id, input, expected_output, is_sample, is_hidden, points, order_index)
VALUES
    -- Sample (visible)
    (1, E'4\n2 7 11 15\n9',   '0 1', TRUE,  FALSE, 0,  1),
    (1, E'3\n3 2 4\n6',       '1 2', TRUE,  FALSE, 0,  2),
    -- Hidden
    (1, E'2\n3 3\n6',         '0 1', FALSE, TRUE,  20, 3),
    (1, E'5\n1 2 3 4 5\n9',   '3 4', FALSE, TRUE,  20, 4),
    (1, E'6\n-3 4 3 90 -8 2\n0', '0 2', FALSE, TRUE, 30, 5),
    (1, E'4\n1000000000 -1000000000 500000000 -500000000\n0', '0 1', FALSE, TRUE, 30, 6);

-- Test cases for Problem B (Maximum Subarray)
INSERT INTO test_cases (problem_id, input, expected_output, is_sample, is_hidden, points, order_index)
VALUES
    -- Sample
    (2, E'9\n-2 1 -3 4 -1 2 1 -5 4\n', '6',   TRUE,  FALSE, 0,  1),
    (2, E'1\n1\n',                       '1',   TRUE,  FALSE, 0,  2),
    -- Hidden
    (2, E'5\n5 4 -1 7 8\n',             '23',  FALSE, TRUE,  30, 3),
    (2, E'3\n-2 -1 -3\n',               '-1',  FALSE, TRUE,  30, 4),
    (2, E'10\n1 2 3 4 5 6 7 8 9 10\n',  '55',  FALSE, TRUE,  40, 5),
    (2, E'6\n-1 -2 -3 -4 -5 -6\n',      '-1',  FALSE, TRUE,  50, 6);

-- Test cases for Problem C (Number of Islands)
INSERT INTO test_cases (problem_id, input, expected_output, is_sample, is_hidden, points, order_index)
VALUES
    -- Sample
    (3, E'4 5\n11110\n11010\n11000\n00000\n', '1', TRUE,  FALSE, 0,  1),
    (3, E'4 5\n11000\n11000\n00100\n00011\n', '3', TRUE,  FALSE, 0,  2),
    -- Hidden
    (3, E'1 1\n1\n',                          '1', FALSE, TRUE,  30, 3),
    (3, E'1 1\n0\n',                          '0', FALSE, TRUE,  30, 4),
    (3, E'3 3\n111\n010\n111\n',              '1', FALSE, TRUE,  70, 5),
    (3, E'5 5\n10101\n01010\n10101\n01010\n10101\n', '13', FALSE, TRUE, 70, 6);

-- Enroll the demo participant in the competition
INSERT INTO competition_participants (competition_id, user_id)
VALUES (1, 2);

-- Leaderboard entry for demo participant
INSERT INTO leaderboard_entries (competition_id, user_id, total_score, problems_solved)
VALUES (1, 2, 0, 0);
