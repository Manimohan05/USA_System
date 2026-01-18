-- V1: Establishes the complete initial schema for the application

-- For Role-Based Access Control (RBAC)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id)
);

-- Core Institute Data
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    batch_year INTEGER UNIQUE NOT NULL
);

CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE students (
    id UUID PRIMARY KEY,
    student_id_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(20) NOT NULL,
    student_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    batch_id INTEGER NOT NULL REFERENCES batches(id)
);

-- Junction table for many-to-many relationship between students and subjects
CREATE TABLE student_subjects (
    student_id UUID NOT NULL REFERENCES students(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    PRIMARY KEY (student_id, subject_id)
);

-- Core Functionality Tables
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    attendance_timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE fee_records (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id),
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- e.g., 'DUE', 'PAID', 'OVERDUE'
    description VARCHAR(255)
);

-- Insert initial roles
INSERT INTO roles (name) VALUES ('ROLE_SUPER_ADMIN'), ('ROLE_STAFF');