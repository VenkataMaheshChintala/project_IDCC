-- V3__update_passwords.sql
-- Fix the incorrect bcrypt hashes in the initial seed data

UPDATE users
SET password = '$2a$12$ViQ6HMOcSiPGwX/IKBGqJevILqFyW.OAgZPdymyHr6.PIFusVqlrq'
WHERE email = 'admin@codearena.local';

UPDATE users
SET password = '$2a$12$c/thIJc6BRX1FWRr3Cg4uugkdWUQz6zgpo6EhL0f6owXm2L6VY9fS'
WHERE email = 'student@codearena.local';
