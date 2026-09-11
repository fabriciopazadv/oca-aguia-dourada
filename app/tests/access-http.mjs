import assert from 'node:assert/strict';
const origin = process.env.OCA_TEST_ORIGIN || 'http://localhost:3000';
const code = process.env.OCA_TEST_CODE;
if (!code) throw new Error('OCA_TEST_CODE required');
const request = (path, init = {}) =>
  fetch(origin + path, { redirect: 'manual', ...init });
assert.equal((await request('/api/store')).status, 401);
const login = (value, site = origin) =>
  request('/api/access', {
    method: 'POST',
    headers: { Origin: site, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: value, name: 'Validação técnica' }),
  });
assert.equal((await login(code, 'https://invalid.example')).status, 403);
assert.equal((await login('invalid-test')).status, 401);
const entry = await login(code);
assert.equal(entry.status, 200);
const cookie = entry.headers.get('set-cookie');
assert.ok(cookie?.includes('HttpOnly'));
if (origin.startsWith('https:')) assert.ok(cookie.includes('Secure'));
const headers = { Cookie: cookie.split(';')[0], Origin: origin };
const res = await request('/api/store', { headers });
assert.equal(res.status, 200);
assert.equal(res.headers.get('cache-control'), 'no-store');
const body = await res.json();
assert.equal(body.actor.role, 'owner');
assert.ok(Array.isArray(body.state.accounts));
assert.equal(
  (await (await request('/manifest.webmanifest')).json()).display,
  'standalone',
);
assert.equal(
  (await request('/api/access', { method: 'DELETE', headers })).status,
  200,
);
assert.equal((await request('/api/store', { headers })).status, 401);
console.log(
  'HTTP: acesso anônimo bloqueado, código validado, financeiro acessível, instalação disponível e logout revogado.',
);
