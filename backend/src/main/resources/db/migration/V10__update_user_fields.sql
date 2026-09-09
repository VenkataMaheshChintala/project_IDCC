-- V10__update_user_fields.sql

ALTER TABLE users DROP COLUMN email CASCADE;

ALTER TABLE users 
    ADD COLUMN student1_name VARCHAR(255),
    ADD COLUMN student2_name VARCHAR(255),
    ADD COLUMN student1_rollno VARCHAR(100),
    ADD COLUMN student2_rollno VARCHAR(100),
    ADD COLUMN phone_number VARCHAR(20);
