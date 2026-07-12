import Database from 'better-sqlite3';

export interface UserProfile {
  userId: string;
  readingPreference: 'plain language' | 'bullet summaries' | 'original';
  expandAcronyms: boolean;
  describeImages: boolean;
  digest: 'off' | 'daily';
  digestHour?: number; // 0-23
  nudgeMentions: boolean;
  saved?: boolean; // true if the user has explicitly saved a profile
}

const defaultProfile: Omit<UserProfile, 'userId'> = {
  readingPreference: 'plain language',
  expandAcronyms: true,
  describeImages: true,
  digest: 'off',
  nudgeMentions: false,
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || './clarion.db';
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        reading_preference TEXT NOT NULL DEFAULT 'plain language',
        expand_acronyms INTEGER NOT NULL DEFAULT 1,
        describe_images INTEGER NOT NULL DEFAULT 1,
        digest TEXT NOT NULL DEFAULT 'off',
        digest_hour INTEGER,
        nudge_mentions INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER DEFAULT (strftime('%s','now'))
      );
      CREATE TABLE IF NOT EXISTS welcome_seen (
        user_id TEXT PRIMARY KEY,
        seen_at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);
  }
  return db;
}

export function getProfile(userId: string): UserProfile {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  if (!row) {
    return { userId, ...defaultProfile, saved: false };
  }
  return {
    userId,
    saved: true,
    readingPreference: row.reading_preference as any,
    expandAcronyms: !!row.expand_acronyms,
    describeImages: !!row.describe_images,
    digest: row.digest as any,
    digestHour: row.digest_hour ?? undefined,
    nudgeMentions: !!row.nudge_mentions,
  };
}

export function saveProfile(profile: UserProfile): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO profiles (user_id, reading_preference, expand_acronyms, describe_images, digest, digest_hour, nudge_mentions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      reading_preference = excluded.reading_preference,
      expand_acronyms = excluded.expand_acronyms,
      describe_images = excluded.describe_images,
      digest = excluded.digest,
      digest_hour = excluded.digest_hour,
      nudge_mentions = excluded.nudge_mentions,
      updated_at = strftime('%s','now')
  `).run(
    profile.userId,
    profile.readingPreference,
    profile.expandAcronyms ? 1 : 0,
    profile.describeImages ? 1 : 0,
    profile.digest,
    profile.digestHour ?? null,
    profile.nudgeMentions ? 1 : 0
  );
}

export function getUsersWithImagesEnabled(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT user_id FROM profiles WHERE describe_images = 1').all() as any[];
  return rows.map(r => r.user_id);
}

export function hasSeenWelcome(userId: string): boolean {
  const db = getDb();
  return !!db.prepare('SELECT 1 FROM welcome_seen WHERE user_id = ?').get(userId);
}

export function markWelcomeSeen(userId: string): void {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO welcome_seen (user_id) VALUES (?)').run(userId);
}
