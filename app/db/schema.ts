import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const storeMeta = sqliteTable('store_meta', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(0),
});
export const storeRecords = sqliteTable(
  'store_records',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    payload: text('payload').notNull(),
  },
  (t) => [index('idx_store_records_kind').on(t.kind)],
);

export const accessSessions = sqliteTable(
  'access_sessions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    expiresAt: integer('expires_at').notNull(),
    codeTag: text('code_tag').notNull(),
  },
  (t) => [index('idx_access_sessions_expiry').on(t.expiresAt)],
);
export const accessAttempts = sqliteTable(
  'access_attempts',
  {
    id: text('id').primaryKey(),
    attempts: integer('attempts').notNull(),
    resetAt: integer('reset_at').notNull(),
  },
  (t) => [index('idx_access_attempts_reset').on(t.resetAt)],
);
