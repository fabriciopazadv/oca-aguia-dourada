export const SESSION_SECONDS = 12 * 60 * 60;
export const MAX_ATTEMPTS = 5;
export const WINDOW_SECONDS = 15 * 60;
export const cookieName = 'oca_session';
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function validCode(input: unknown, expected: string) {
  if (typeof input !== 'string' || input.length > 32) return false;
  const a = await digest(input),
    b = await digest(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function sessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export function readToken(header: string | null) {
  const token = header
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookieName + '='))
    ?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function sessionCookie(token: string, secure = true, clear = false) {
  return (
    cookieName +
    '=' +
    token +
    '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' +
    (clear ? 0 : SESSION_SECONDS) +
    (secure ? '; Secure' : '')
  );
}
export async function reserveAttempt(db: any, key: string, now: number) {
  return db
    .prepare(
      'INSERT INTO access_attempts(id,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts,reset_at',
    )
    .bind(key, now + WINDOW_SECONDS, now, now)
    .first();
}
export async function readSession(
  db: any,
  token: string | null,
  tag: string,
  now: number,
) {
  if (!token) return null;
  const session = await db
    .prepare('SELECT name,expires_at,code_tag FROM access_sessions WHERE id=?')
    .bind(await digest(token))
    .first();
  if (!session || session.expires_at <= now || session.code_tag !== tag)
    return null;
  return { name: session.name, expiresAt: session.expires_at };
}
