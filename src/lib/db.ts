import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
});

// Initialize database schema on first use
let initialized = false;

export async function initDB() {
  if (initialized) return;
  
  try {
    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        timezone TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create teams table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        invite_code TEXT UNIQUE NOT NULL,
        owner_id TEXT REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create team_members table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT REFERENCES teams(id),
        user_id TEXT REFERENCES users(id),
        role TEXT DEFAULT 'member',
        timezone TEXT,
        working_hours TEXT,
        joined_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create meetings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        team_id TEXT REFERENCES teams(id),
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        created_by TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create meeting_participants table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id TEXT PRIMARY KEY,
        meeting_id TEXT REFERENCES meetings(id),
        user_id TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        responded_at TEXT
      )
    `);

    initialized = true;
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export { db };