import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  validCode,
  sessionToken,
  sessionCookie,
  readToken,
  digest,
  readSession,
  reserveAttempt,
  WINDOW_SECONDS,
} from '../lib/access-core.ts';
const file = (p) => readFileSync(new URL(p, import.meta.url));
function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(file('../drizzle/0001_bitter_zombie.sql').toString());
  return {
    sql,
    prepare(query) {
      return {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          return sql.prepare(query).get(...this.args);
        },
      };
    },
  };
}
test('código correto é obrigatório e comparações não convertem tipos', async () => {
  assert.equal(await validCode('4826', '4826'), true);
  for (const x of ['4827', '', 4826, null, 'x'.repeat(33)])
    assert.equal(await validCode(x, '4826'), false);
});
test('tokens aleatórios e cookies protegidos', () => {
  const a = sessionToken(),
    b = sessionToken();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  const c = sessionCookie(a);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=43200'])
    assert.ok(c.includes(flag));
  assert.equal(readToken(c), a);
  assert.equal(readToken('oca_session=invalid'), null);
  assert.match(sessionCookie('', true, true), /Max-Age=0/);
});
test('tentativas são contadas atomicamente e janela expira', async () => {
  const db = database();
  for (let i = 1; i <= 6; i++)
    assert.equal((await reserveAttempt(db, 'ip', 100)).attempts, i);
  assert.equal(
    (await reserveAttempt(db, 'ip', 100 + WINDOW_SECONDS)).attempts,
    1,
  );
  db.sql.close();
});
test('sessões expiram e são invalidadas por troca de código ou logout', async () => {
  const db = database(),
    token = sessionToken(),
    id = await digest(token);
  db.sql
    .prepare('INSERT INTO access_sessions VALUES(?,?,?,?)')
    .run(id, 'Equipe', 200, 'tag');
  assert.equal((await readSession(db, token, 'tag', 100)).name, 'Equipe');
  assert.equal(await readSession(db, token, 'tag', 200), null);
  assert.equal(await readSession(db, token, 'changed', 100), null);
  db.sql.prepare('DELETE FROM access_sessions WHERE id=?').run(id);
  assert.equal(await readSession(db, token, 'tag', 100), null);
  db.sql.close();
});
test('manifest possui ícones PNG de instalação nas dimensões declaradas', () => {
  const m = JSON.parse(file('../public/manifest.webmanifest'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/');
  for (const size of [192, 512]) {
    const icon = m.icons.find((x) => x.sizes === `${size}x${size}`);
    assert.ok(icon);
    const b = file('../public' + icon.src);
    assert.equal(b.readUInt32BE(16), size);
    assert.equal(b.readUInt32BE(20), size);
  }
});
test('service worker não intercepta API e oferece página offline', async () => {
  const handlers = {};
  const offline = new Response('offline');
  vm.runInNewContext(file('../public/sw.js').toString(), {
    self: {
      location: { origin: 'https://oca.test' },
      addEventListener: (name, fn) => (handlers[name] = fn),
    },
    URL,
    fetch: () => Promise.reject(new Error('offline')),
    caches: { match: async () => offline },
  });
  let intercepted = false;
  handlers.fetch({
    request: {
      method: 'GET',
      url: 'https://oca.test/api/store',
      mode: 'navigate',
    },
    respondWith() {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
  let response;
  handlers.fetch({
    request: { method: 'GET', url: 'https://oca.test/', mode: 'navigate' },
    respondWith(p) {
      response = p;
    },
  });
  assert.equal(await (await response).text(), 'offline');
});
