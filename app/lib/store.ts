import { env } from 'cloudflare:workers';
import { loadFrom, saveTo } from './store-core';
import type { State } from './domain';
function database() {
  const db = (env as unknown as { DB: D1Database }).DB;
  if (!db) throw new Error('Banco não configurado.');
  return db;
}
export const loadStore = () => loadFrom(database());
export const saveStore = (before: State, after: State, version: number) =>
  saveTo(database(), before, after, version);
