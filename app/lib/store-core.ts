import { emptyState, type State } from './domain.ts';
export async function loadFrom(db: any) {
  await db
    .prepare("INSERT OR IGNORE INTO store_meta(id,version) VALUES('main',0)")
    .run();
  const [meta, rows] = await db.batch([
    db.prepare("SELECT version FROM store_meta WHERE id='main'"),
    db.prepare('SELECT kind,payload FROM store_records ORDER BY rowid'),
  ]);
  const state = emptyState();
  for (const row of rows.results as { kind: keyof State; payload: string }[]) {
    const value = JSON.parse(row.payload);
    if (row.kind === 'accounts' && value.id === 'cash')
      state.accounts[0] = value;
    else (state[row.kind] as any[]).push(value);
  }
  return { state, version: (meta.results[0] as { version: number }).version };
}
function records(s: State) {
  const map = new Map<string, { kind: string; payload: string }>();
  for (const [kind, values] of Object.entries(s))
    for (const item of values) {
      const key =
        typeof item === 'string' ? item : 'id' in item ? item.id : item.email;
      map.set(kind + ':' + key, { kind, payload: JSON.stringify(item) });
    }
  return map;
}
export async function saveTo(
  db: any,
  before: State,
  after: State,
  version: number,
) {
  const previous = records(before);
  const next = records(after);
  const changed = [...next.entries()].filter(
    ([id, r]) => previous.get(id)?.payload !== r.payload,
  );
  const statements = [
    db
      .prepare(
        "UPDATE store_meta SET version=CASE WHEN version=? THEN version+1 ELSE NULL END WHERE id='main'",
      )
      .bind(version),
  ];
  for (let i = 0; i < changed.length; i += 25) {
    const batch = changed.slice(i, i + 25);
    statements.push(
      db
        .prepare(
          'INSERT INTO store_records(id,kind,payload) VALUES ' +
            batch.map(() => '(?,?,?)').join(',') +
            ' ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
        )
        .bind(...batch.flatMap(([id, r]) => [id, r.kind, r.payload])),
    );
  }
  try {
    await db.batch(statements);
  } catch (e) {
    if (String(e).includes('NOT NULL')) throw new Error('CONFLICT');
    throw e;
  }
}
