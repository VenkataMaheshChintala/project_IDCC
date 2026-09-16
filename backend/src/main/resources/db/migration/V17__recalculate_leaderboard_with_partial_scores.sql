-- Recalculate leaderboard entries to include partial marks
INSERT INTO leaderboard_entries (competition_id, user_id, total_score, problems_solved, last_accepted_at, updated_at)
SELECT
    comp.id,
    u.id,
    COALESCE(SUM(best.best_score), 0),
    COUNT(DISTINCT CASE WHEN best.is_solved THEN best.problem_id END),
    MAX(best.completed_at),
    NOW()
FROM competitions comp
JOIN (SELECT DISTINCT competition_id, user_id FROM competition_participants) cp ON cp.competition_id = comp.id
JOIN users u ON u.id = cp.user_id
LEFT JOIN LATERAL (
    SELECT 
        s.problem_id, 
        MAX(s.score) as best_score,
        bool_or(s.status = 'ACCEPTED') as is_solved,
        MAX(CASE WHEN s.score > 0 THEN s.completed_at END) as completed_at
    FROM submissions s
    WHERE s.competition_id = comp.id
      AND s.user_id = u.id
    GROUP BY s.problem_id
) best ON true
GROUP BY comp.id, u.id
ON CONFLICT (competition_id, user_id) DO UPDATE
  SET total_score = EXCLUDED.total_score,
      problems_solved = EXCLUDED.problems_solved,
      last_accepted_at = EXCLUDED.last_accepted_at,
      updated_at = NOW();
