-- V11__increase_time_limits.sql
-- Java JVM startup inside Docker containers takes ~1.5-2s, so 2000ms time limits
-- cause correct solutions to TLE. Increase all problem time limits to 5000ms.

UPDATE problems SET time_limit_ms = 5000 WHERE time_limit_ms < 5000;
