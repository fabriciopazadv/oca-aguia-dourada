import { database } from '@/lib/store';
import { accessConfig, codeTag, currentAccess } from '@/lib/access';
import {
  digest,
  validCode,
  sessionToken,
  readToken,
  sessionCookie,
  reserveAttempt,
  MAX_ATTEMPTS,
  SESSION_SECONDS,
} from '@/lib/access-core';
export const dynamic = 'force-dynamic';
const response = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
const sameOrigin = (r: Request) =>
  r.headers.get('origin') === new URL(r.url).origin;
export async function GET(request: Request) {
  try {
    return response(await currentAccess(request));
  } catch {
    return response({ error: 'Informe seu código para entrar.' }, 401);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return response({ error: 'Origem inválida.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return response({ error: 'Formato inválido.' }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return response({ error: 'Dados inválidos.' }, 413);
    let data: { code?: unknown; name?: unknown };
    try {
      data = JSON.parse(raw);
    } catch {
      return response({ error: 'Dados inválidos.' }, 400);
    }
    if (!data || typeof data !== 'object')
      return response({ error: 'Dados inválidos.' }, 400);
    const config = accessConfig(),
      db = database(),
      now = Math.floor(Date.now() / 1000);
    const ip = request.headers.get('cf-connecting-ip') || 'shared';
    const key = await digest(config.secret + ':attempt:' + ip);
    const budget = await reserveAttempt(db, key, now);
    if (budget.attempts > MAX_ATTEMPTS)
      return response(
        { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' },
        429,
        { 'Retry-After': String(Math.max(1, budget.reset_at - now)) },
      );
    if (!(await validCode(data.code, config.code)))
      return response(
        { error: 'Código incorreto. Confira com o responsável.' },
        401,
      );
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (name.length > 60 || /[\x00-\x1f\x7f]/.test(name))
      return response(
        { error: 'Informe um nome válido, com até 60 caracteres.' },
        400,
      );
    const token = sessionToken();
    await db.batch([
      db
        .prepare(
          'INSERT INTO access_sessions(id,name,expires_at,code_tag) VALUES(?,?,?,?)',
        )
        .bind(
          await digest(token),
          name || 'Equipe OCA',
          now + SESSION_SECONDS,
          await codeTag(),
        ),
      db.prepare('DELETE FROM access_attempts WHERE id=?').bind(key),
      db.prepare('DELETE FROM access_sessions WHERE expires_at<=?').bind(now),
      db.prepare('DELETE FROM access_attempts WHERE reset_at<=?').bind(now),
    ]);
    return response({ ok: true }, 200, {
      'Set-Cookie': sessionCookie(
        token,
        process.env.NODE_ENV !== 'development',
      ),
    });
  } catch (e) {
    console.error(
      'Access request failed',
      e instanceof Error ? e.message : 'unknown',
    );
    return response(
      { error: 'Não foi possível iniciar o acesso. Tente novamente.' },
      503,
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return response({ error: 'Origem inválida.' }, 403);
  try {
    const token = readToken(request.headers.get('cookie'));
    if (token)
      await database()
        .prepare('DELETE FROM access_sessions WHERE id=?')
        .bind(await digest(token))
        .run();
    return response({ ok: true }, 200, {
      'Set-Cookie': sessionCookie(
        '',
        process.env.NODE_ENV !== 'development',
        true,
      ),
    });
  } catch {
    return response(
      { error: 'Não foi possível encerrar a sessão. Tente novamente.' },
      503,
    );
  }
}
