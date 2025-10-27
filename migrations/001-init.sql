-- migrations/001-init.sql
-- PostgreSQL schema for chat app with JWT-based auth

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    room VARCHAR(100) NOT NULL,
    text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    summary TEXT,
    sentiment VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: seed an admin user (replace password hash)
-- INSERT INTO users (name, email, password_hash)
-- VALUES ('Admin', 'admin@example.com', '$2b$10$...');

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
