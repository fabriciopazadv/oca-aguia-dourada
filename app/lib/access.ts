import { env } from 'cloudflare:workers';
import { database } from './store';
import { digest, readToken, readSession } from './access-core';
export function accessConfig() {
  const values = env as unknown as {
    ACCESS_CODE?: string;
    ACCESS_SESSION_SECRET?: string;
  };
  if (
    !values.ACCESS_CODE ||
    values.ACCESS_CODE.length < 4 ||
    !values.ACCESS_SESSION_SECRET ||
    values.ACCESS_SESSION_SECRET.length < 32
  )
    throw new Error('ACCESS_CONFIG');
  return { code: values.ACCESS_CODE, secret: values.ACCESS_SESSION_SECRET };
}
export async function codeTag() {
  const c = accessConfig();
  return digest(c.secret + ':' + c.code);
}
export async function currentAccess(request: Request) {
  const session = await readSession(
    database(),
    readToken(request.headers.get('cookie')),
    await codeTag(),
    Math.floor(Date.now() / 1000),
  );
  if (!session) throw new Error('AUTH');
  return {
    actor: { email: session.name, role: 'owner' as const },
    name: session.name,
    expiresAt: session.expiresAt,
  };
}
