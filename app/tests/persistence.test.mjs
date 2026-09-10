import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { loadFrom, saveTo } from '../lib/store-core.ts';
import { applyCommand, redact } from '../lib/domain.ts';
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0000_tiny_karnak.sql', import.meta.url),
      'utf8',
    ),
  );
  const db = {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async run() {
          sqlite.prepare(sql).run(...this.args);
        },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((s) => {
          const q = sqlite.prepare(s.sql);
          return s.sql.trim().startsWith('SELECT')
            ? { results: q.all(...s.args) }
            : { results: [], meta: q.run(...s.args) };
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db;
}
const actor = { email: 'owner@example.com', role: 'owner' };
const command = (type, payload) => ({ id: crypto.randomUUID(), type, payload });
test('persistência mantém venda, estoque e financeiro após releitura', async () => {
  const db = database();
  let { state, version } = await loadFrom(db);
  let next = applyCommand(
    state,
    command('product', {
      name: 'Oráculo',
      sku: 'ORA',
      price: 10000,
      cost: 5000,
      stock: 3,
    }),
    actor,
  );
  await saveTo(db, state, next, version);
  ({ state, version } = await loadFrom(db));
  assert.equal(state.products.length, 1);
  assert.equal(state.products[0].stock, 3);
  next = applyCommand(
    state,
    command('order', {
      type: 'sale',
      items: [{ productId: state.products[0].id, qty: 1, unit: 10000 }],
      date: '2026-09-10',
      due: '2026-09-10',
      installments: 2,
    }),
    actor,
  );
  await saveTo(db, state, next, version);
  const loaded = await loadFrom(db);
  assert.equal(loaded.state.products[0].stock, 2);
  assert.equal(loaded.state.bills.length, 2);
  assert.equal(loaded.state.orders.length, 1);
  assert.equal(loaded.version, 2);
});
test('gravação concorrente com versão antiga não altera nenhum registro', async () => {
  const db = database();
  const a = await loadFrom(db),
    b = await loadFrom(db);
  await saveTo(
    db,
    a.state,
    applyCommand(
      a.state,
      command('account', { name: 'Banco A', opening: 100 }),
      actor,
    ),
    a.version,
  );
  await assert.rejects(
    () =>
      saveTo(
        db,
        b.state,
        applyCommand(
          b.state,
          command('account', { name: 'Banco B', opening: 900 }),
          actor,
        ),
        b.version,
      ),
    /CONFLICT/,
  );
  const result = await loadFrom(db);
  assert.equal(result.state.accounts.length, 2);
  assert.equal(result.state.accounts[1].name, 'Banco A');
  assert.equal(result.version, 1);
});
test('resposta de funcionário não expõe custos, pagamentos ou administração', () => {
  let s = awaitless();
  const result = redact(s, { email: 'team@example.com', role: 'employee' });
  assert.equal(result.products[0].cost, 0);
  assert.equal(result.accounts.length, 0);
  assert.equal(result.bills.length, 0);
  assert.equal(result.audit.length, 0);
});
function awaitless() {
  return applyCommand(
    {
      products: [],
      accounts: [],
      orders: [],
      bills: [],
      entries: [],
      movements: [],
      members: [],
      contacts: [],
      audit: [],
      processed: [],
    },
    command('product', {
      name: 'Oráculo',
      sku: 'ORA',
      price: 10000,
      cost: 5000,
      stock: 3,
    }),
    actor,
  );
}
