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
