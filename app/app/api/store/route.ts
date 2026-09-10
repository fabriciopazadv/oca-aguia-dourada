import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
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
async function context() {
  const user = await getChatGPTUser();
  if (!user) throw new Error('AUTH');
  const data = await loadStore();
  const email = user.email.toLowerCase();
  const configured = (
    env as unknown as { OWNER_EMAIL?: string }
  ).OWNER_EMAIL?.toLowerCase();
  const owner =
    process.env.NODE_ENV === 'development' ? 'seedy@sites.test' : configured;
  const member = data.state.members.find((m) => m.email === email && m.active);
  if (email !== owner && !member) throw new Error('FORBIDDEN');
  const actor: Actor = {
    email,
    role: email === owner ? 'owner' : member!.role,
  };
  return { ...data, actor, name: user.displayName };
}
function error(e: unknown) {
  const message = e instanceof Error ? e.message : 'Erro inesperado.';
  if (message === 'AUTH')
    return reply({ error: 'Entre para acessar a loja.', auth: true }, 401);
  if (message === 'FORBIDDEN')
    return reply(
      {
        error:
          'Seu e-mail ainda não tem acesso à loja. Solicite a liberação ao proprietário.',
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
export async function GET() {
  try {
    const { state, version, actor, name } = await context();
    return reply({ state: redact(state, actor), version, actor, name });
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
    const { state, version, actor, name } = await context();
    if (state.processed.includes(command.id))
      return reply({ state: redact(state, actor), version, actor, name });
    if (command.version !== version) throw new Error('CONFLICT');
    const next = applyCommand(state, command, actor);
    await saveStore(state, next, version);
    return reply({
      state: redact(next, actor),
      version: version + 1,
      actor,
      name,
    });
  } catch (e) {
    return error(e);
  }
}
