import { currentAccess } from '@/lib/access';
import { loadStore, saveStore } from '@/lib/store';
import { applyCommand, redact, type Actor } from '@/lib/domain';
export const dynamic = 'force-dynamic';
function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
async function context(request: Request) {
  const session = await currentAccess(request);
  const data = await loadStore();
  return { ...data, ...session };
}
function error(e: unknown) {
  const message = e instanceof Error ? e.message : 'Erro inesperado.';
  if (message === 'AUTH')
    return reply({ error: 'Entre para acessar a loja.', auth: true }, 401);
  if (message === 'FORBIDDEN')
    return reply(
      {
        error: 'Acesso não autorizado.',
      },
      403,
    );
  if (message === 'CONFLICT')
    return reply(
      {
        error: 'Outra operação foi salva. Atualize os dados e tente novamente.',
      },
      409,
    );
  console.error('Store request failed:', message);
  return reply(
    {
      error:
        message.includes('D1_') || message.includes('SQLITE')
          ? 'Não foi possível acessar o banco de dados. Tente novamente.'
          : message,
    },
    400,
  );
}
export async function GET(request: Request) {
  try {
    const { state, version, actor, name } = await context(request);
    return reply({
      state: { ...redact(state, actor), members: [] },
      version,
      actor,
      name,
    });
  } catch (e) {
    return error(e);
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return reply({ error: 'Origem inválida.' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
      return reply({ error: 'Formato inválido.' }, 415);
    const raw = await request.text();
    if (raw.length > 1000000)
      return reply({ error: 'Arquivo muito grande.' }, 413);
    const command = JSON.parse(raw);
    if (command?.type === 'member')
      return reply(
        {
          error:
            'O acesso é compartilhado por código. Não há cadastro por e-mail.',
        },
        400,
      );
    const { state, version, actor, name } = await context(request);
    if (state.processed.includes(command.id))
      return reply({
        state: { ...redact(state, actor), members: [] },
        version,
        actor,
        name,
      });
    if (command.version !== version) throw new Error('CONFLICT');
    const next = applyCommand(state, command, actor);
    await saveStore(state, next, version);
    return reply({
      state: { ...redact(next, actor), members: [] },
      version: version + 1,
      actor,
      name,
    });
  } catch (e) {
    return error(e);
  }
}
