-- Enable pgvector extension for PostgreSQL
-- This is required for the vector type used in User model's embedding_vector field

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';
