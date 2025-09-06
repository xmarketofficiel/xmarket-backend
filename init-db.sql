-- Database initialization script for development
-- This script ensures the database is properly set up

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS university_marketplace;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions (optional, for development)
-- GRANT ALL PRIVILEGES ON DATABASE university_marketplace TO postgres;

-- Initialize any default data can be added here
-- Tables will be created automatically by TypeORM when the backend starts
