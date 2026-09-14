export type Role = 'owner' | 'employee';
export type Actor = { email: string; role: Role };
export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  variation: string;
  supplier: string;
  photo: string;
  cost: number;
  price: number;
  stock: number;
  min: number;
  active: boolean;
};
export type Account = { id: string; name: string; opening: number };
export type Item = {
  productId: string;
  name: string;
  qty: number;
  unit: number;
  cost: number;
  received: number;
};
export type Order = {
  id: string;
  number: string;
  type: 'sale' | 'purchase';
  contact: string;
  date: string;
  items: Item[];
  discount: number;
  total: number;
  status: 'confirmed' | 'partial' | 'received' | 'cancelled';
  method: string;
};
export type Bill = {
  id: string;
  orderId: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  due: string;
  cancelled: boolean;
};
export type Entry = {
  id: string;
  billId: string;
  accountId: string;
  amount: number;
  fee: number;
  date: string;
  description: string;
  kind: 'payment' | 'fee' | 'transfer' | 'reversal' | 'withdrawal';
  reverses?: string;
};
export type Movement = {
  id: string;
  productId: string;
  delta: number;
  reason: string;
  date: string;
  actor: string;
};
export type State = {
  products: Product[];
  accounts: Account[];
  orders: Order[];
  bills: Bill[];
  entries: Entry[];
  movements: Movement[];
  members: { email: string; role: Role; active: boolean }[];
  contacts: {
    id: string;
    name: string;
    type: string;
    phone: string;
    email: string;
  }[];
  audit: {
    id: string;
    type: string;
    actor: string;
    date: string;
    summary: string;
  }[];
  processed: string[];
};
export type Command = {
  id: string;
  type: string;
  payload: Record<string, any>;
};
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const emptyState = (): State => ({
  products: [],
  accounts: [{ id: 'cash', name: 'Caixa da loja', opening: 0 }],
  orders: [],
  bills: [],
  entries: [],
  movements: [],
  members: [],
  contacts: [],
  audit: [],
  processed: [],
});
export const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    v / 100,
  );
export function int(
  v: unknown,
  label: string,
  min = 0,
  max = 1000000000,
): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new Error(label + ' inválido.');
  return n;
}
export function txt(
  v: unknown,
  label: string,
  required = true,
  max = 200,
): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if ((required && !s) || s.length > max) throw new Error(label + ' inválido.');
  return s;
}
export function validDate(v: unknown): string {
  const s = String(v);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Error('Data inválida.');
  return s;
}
export function splitCents(total: number, n: number) {
  return Array.from(
    { length: n },
    (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0),
  );
}
export function monthDate(date: string, index: number) {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + index);
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, end));
  return d.toISOString().slice(0, 10);
}
export const accountBalance = (s: State, id: string) =>
  (s.accounts.find((a) => a.id === id)?.opening || 0) +
  s.entries.filter((e) => e.accountId === id).reduce((t, e) => t + e.amount, 0);
export const paid = (s: State, b: Bill) =>
  s.entries
    .filter(
      (e) =>
        e.billId === b.id &&
        e.kind === 'payment' &&
        !s.entries.some((r) => r.reverses === e.id),
    )
    .reduce((t, e) => t + Math.abs(e.amount), 0);
export const remaining = (s: State, b: Bill) =>
  b.cancelled ? 0 : Math.max(0, b.amount - paid(s, b));
const ownerOnly = new Set([
  'account',
  'bill',
  'settle',
  'transfer',
  'withdrawal',
  'member',
  'import',
  'cancelBill',
]);
function product(s: State, id: string) {
  const p = s.products.find((x) => x.id === id);
  if (!p) throw new Error('Produto não encontrado.');
  return p;
}
function move(
  s: State,
  p: Product,
  delta: number,
  reason: string,
  actor: Actor,
) {
  if (p.stock + delta < 0) throw new Error('Estoque insuficiente: ' + p.name);
  p.stock += delta;
  s.movements.push({
    id: uid(),
    productId: p.id,
    delta,
    reason,
    date: new Date().toISOString(),
    actor: actor.email,
  });
}
function reverseBill(s: State, b: Bill, reason: string) {
  b.cancelled = true;
  const entries = s.entries.filter(
    (e) => e.billId === b.id && (e.kind === 'payment' || e.kind === 'fee'),
  );
  for (const e of entries) {
    if (!s.entries.some((r) => r.reverses === e.id))
      s.entries.push({
        id: uid(),
        billId: b.id,
        accountId: e.accountId,
        amount: -e.amount,
        fee: 0,
        date: today(),
        description: reason,
        kind: 'reversal',
        reverses: e.id,
      });
  }
}
function settle(s: State, p: Record<string, any>) {
  const b = s.bills.find((x) => x.id === p.billId);
  if (!b || b.cancelled) throw new Error('Conta indisponível.');
  if (!s.accounts.some((a) => a.id === p.accountId))
    throw new Error('Selecione uma conta.');
  const amount = int(p.amount, 'Valor', 1, remaining(s, b));
  const fee = int(p.fee ?? 0, 'Taxa', 0, amount);
  const date = validDate(p.date);
  s.entries.push({
    id: uid(),
    billId: b.id,
    accountId: p.accountId,
    amount: b.type === 'income' ? amount : -amount,
    fee: 0,
    date,
    description: b.description,
    kind: 'payment',
  });
  if (fee)
    s.entries.push({
      id: uid(),
      billId: b.id,
      accountId: p.accountId,
      amount: -fee,
      fee,
      date,
      description: 'Taxa · ' + b.description,
      kind: 'fee',
    });
}
function saveProduct(s: State, p: Record<string, any>, actor: Actor) {
  const existing = p.id ? product(s, p.id) : null;
  const sku = txt(p.sku, 'SKU').toUpperCase();
  if (s.products.some((x) => x.sku.toUpperCase() === sku && x.id !== p.id))
    throw new Error('SKU já cadastrado.');
  if (
    actor.role !== 'owner' &&
    ((existing && p.cost !== undefined && p.cost !== existing.cost) ||
      (!existing && Number(p.cost) > 0))
  )
    throw new Error('Permissão necessária para definir custo.');
  const photo = txt(p.photo, 'URL da foto', false, 1000);
  if (photo && !/^https:\/\//i.test(photo))
    throw new Error('A foto deve usar uma URL HTTPS.');
  const record: Product = {
    id: existing?.id || uid(),
    name: txt(p.name, 'Nome'),
    sku,
    category: txt(p.category, 'Categoria', false),
    variation: txt(p.variation, 'Variação', false),
    supplier: txt(p.supplier, 'Fornecedor', false),
    photo,
    cost:
      actor.role === 'owner' ? int(p.cost ?? 0, 'Custo') : existing?.cost || 0,
    price: int(p.price, 'Preço', 1),
    stock: existing?.stock || 0,
    min: int(p.min ?? 0, 'Estoque mínimo'),
    active: p.active !== false,
  };
  if (existing) Object.assign(existing, record);
  else {
    s.products.push(record);
    const stock = int(p.stock ?? 0, 'Estoque inicial');
    if (stock) move(s, record, stock, 'Saldo inicial', actor);
  }
}
export function applyCommand(
  input: State,
  command: Command,
  actor: Actor,
): State {
  if (!command || !command.id || command.id.length > 100 || !command.payload)
    throw new Error('Operação inválida.');
  if (ownerOnly.has(command.type) && actor.role !== 'owner')
    throw new Error('Permissão necessária.');
  if (input.processed.includes(command.id)) return input;
  const s = structuredClone(input);
  const p = command.payload;
  let summary = '';
  switch (command.type) {
    case 'product':
      saveProduct(s, p, actor);
      summary = String(p.name);
      break;
    case 'adjust': {
      const pr = product(s, p.productId);
      const delta = int(p.delta, 'Quantidade', -1000000, 1000000);
      if (!delta) throw new Error('Informe uma diferença diferente de zero.');
      const reason = txt(p.reason, 'Motivo');
      move(s, pr, delta, reason, actor);
      summary = pr.name + ' · ' + reason;
      break;
    }
    case 'order': {
      if (!['sale', 'purchase'].includes(p.type))
        throw new Error('Tipo inválido.');
      if (p.settleNow && actor.role !== 'owner')
        throw new Error('Permissão necessária para registrar pagamentos.');
      if (p.type === 'purchase' && actor.role !== 'owner')
        throw new Error('Permissão necessária para compras.');
      if (!Array.isArray(p.items) || !p.items.length || p.items.length > 100)
        throw new Error('Adicione de 1 a 100 itens.');
      const seen = new Set<string>();
      const items: Item[] = p.items.map((i: any) => {
        const pr = product(s, i.productId);
        if (!pr.active) throw new Error('Produto inativo.');
        if (seen.has(pr.id))
          throw new Error('Agrupe a quantidade do mesmo produto em uma linha.');
        seen.add(pr.id);
        return {
          productId: pr.id,
          name: pr.name + ' · ' + pr.variation,
          qty: int(i.qty, 'Quantidade', 1, 1000000),
          unit: int(i.unit, 'Preço', 1, 100000000),
          cost: pr.cost,
          received: 0,
        };
      });
      const gross = items.reduce((t, i) => t + i.qty * i.unit, 0);
      int(gross, 'Total', 1);
      const discount = int(p.discount ?? 0, 'Desconto', 0, gross - 1);
      if (p.type === 'purchase' && discount)
        throw new Error('Nas compras, informe o custo líquido em cada item.');
      const date = validDate(p.date),
        due = validDate(p.due);
      const installments = int(p.installments ?? 1, 'Parcelas', 1, 24);
      const total = gross - discount;
      if (total < installments)
        throw new Error('Valor insuficiente para as parcelas.');
      const o: Order = {
        id: uid(),
        number:
          (p.type === 'sale' ? 'V' : 'C') +
          '-' +
          String(s.orders.length + 1).padStart(4, '0'),
        type: p.type,
        contact:
          txt(p.contact, 'Cliente / fornecedor', p.type === 'purchase') ||
          'Consumidor final',
        date,
        items,
        discount,
        total,
        status: 'confirmed',
        method: txt(p.method || 'Não informado', 'Pagamento'),
      };
      if (o.type === 'sale')
        for (const i of items)
          move(s, product(s, i.productId), -i.qty, 'Venda ' + o.number, actor);
      s.orders.push(o);
      splitCents(total, installments).forEach((amount, index) => {
        const bill: Bill = {
          id: uid(),
          orderId: o.id,
          description:
            o.number +
            ' · ' +
            o.contact +
            ' · ' +
            (index + 1) +
            '/' +
            installments,
          type: o.type === 'sale' ? 'income' : 'expense',
          category: o.type === 'sale' ? 'Vendas' : 'Mercadorias',
          amount,
          due: monthDate(due, index),
          cancelled: false,
        };
        s.bills.push(bill);
        if (p.settleNow) {
          if (installments !== 1)
            throw new Error('Pagamento imediato exige uma parcela.');
          settle(s, {
            billId: bill.id,
            amount,
            fee: int(p.fee ?? 0, 'Taxa'),
            accountId: p.accountId,
            date,
          });
        }
      });
      summary = o.number;
      break;
    }
    case 'receive': {
      if (actor.role !== 'owner') throw new Error('Permissão necessária.');
      const o = s.orders.find(
        (x) => x.id === p.orderId && x.type === 'purchase',
      );
      if (!o || o.status === 'cancelled')
        throw new Error('Compra indisponível.');
      if (!Array.isArray(p.items) || !p.items.length)
        throw new Error('Informe os itens recebidos.');
      const seen = new Set();
      let count = 0;
      for (const r of p.items) {
        if (seen.has(r.productId)) throw new Error('Item duplicado.');
        seen.add(r.productId);
        const item = o.items.find((i) => i.productId === r.productId);
        if (!item) throw new Error('Item não pertence à compra.');
        const qty = int(r.qty, 'Recebimento', 0, item.qty - item.received);
        if (!qty) continue;
        const pr = product(s, item.productId);
        pr.cost = Math.round(
          (pr.stock * pr.cost + qty * item.unit) / (pr.stock + qty),
        );
        move(s, pr, qty, 'Recebimento ' + o.number, actor);
        item.received += qty;
        count += qty;
      }
      if (!count) throw new Error('Informe pelo menos uma unidade.');
      o.status = o.items.every((i) => i.received === i.qty)
        ? 'received'
        : 'partial';
      summary = o.number;
      break;
    }
    case 'cancel': {
      if (actor.role !== 'owner')
        throw new Error('Permissão necessária para estornar.');
      const o = s.orders.find((x) => x.id === p.orderId);
      if (!o || o.status === 'cancelled')
        throw new Error('Operação já cancelada ou inexistente.');
      const reason = txt(p.reason, 'Motivo');
      for (const i of o.items) {
        const pr = product(s, i.productId);
        const qty = o.type === 'sale' ? i.qty : -i.received;
        if (qty) {
          if (o.type === 'sale')
            pr.cost = Math.round(
              (pr.stock * pr.cost + i.qty * i.cost) / (pr.stock + i.qty),
            );
          move(s, pr, qty, 'Estorno ' + o.number + ' · ' + reason, actor);
        }
      }
      for (const b of s.bills.filter((b) => b.orderId === o.id))
        reverseBill(s, b, 'Estorno ' + o.number);
      o.status = 'cancelled';
      summary = o.number + ' · ' + reason;
      break;
    }
    case 'account': {
      const current = s.accounts.find((a) => a.id === p.id);
      if (p.id && !current) throw new Error('Conta não encontrada.');
      if (current && s.entries.some((e) => e.accountId === current.id))
        throw new Error(
          'O saldo inicial só pode ser editado antes da primeira movimentação.',
        );
      const a = {
        id: current?.id || uid(),
        name: txt(p.name, 'Nome da conta'),
        opening: int(p.opening ?? 0, 'Saldo inicial', -1000000000),
      };
      if (current) Object.assign(current, a);
      else s.accounts.push(a);
      summary = p.name;
      break;
    }
    case 'bill': {
      if (!['income', 'expense'].includes(p.type))
        throw new Error('Tipo inválido.');
      s.bills.push({
        id: uid(),
        orderId: '',
        description: txt(p.description, 'Descrição'),
        type: p.type,
        category: txt(p.category, 'Categoria'),
        amount: int(p.amount, 'Valor', 1),
        due: validDate(p.due),
        cancelled: false,
      });
      summary = p.description;
      break;
    }
    case 'settle':
      settle(s, p);
      summary = s.bills.find((b) => b.id === p.billId)?.description || '';
      break;
    case 'cancelBill': {
      const b = s.bills.find((b) => b.id === p.billId);
      if (!b || b.orderId || b.cancelled)
        throw new Error('Cancele pela operação de origem.');
      const reason = txt(p.reason, 'Motivo');
      reverseBill(s, b, reason);
      summary = reason;
      break;
    }
    case 'withdrawal': {
      if (!s.accounts.some((a) => a.id === p.accountId))
        throw new Error('Selecione uma conta.');
      const amount = int(p.amount, 'Valor da retirada', 1);
      const date = validDate(p.date);
      const recipient = txt(p.recipient, 'Quem recebeu');
      const note = txt(p.description, 'Observação', false);
      const description =
        'Retirada de lucro · ' + recipient + (note ? ' · ' + note : '');
      s.entries.push({
        id: uid(),
        billId: '',
        accountId: p.accountId,
        amount: -amount,
        fee: 0,
        date,
        description,
        kind: 'withdrawal',
      });
      summary = description;
      break;
    }
    case 'transfer': {
      if (
        p.from === p.to ||
        ![p.from, p.to].every((id) => s.accounts.some((a) => a.id === id))
      )
        throw new Error('Selecione contas diferentes.');
      const amount = int(p.amount, 'Valor', 1);
      const date = validDate(p.date);
      for (const [accountId, sign] of [
        [p.from, -1],
        [p.to, 1],
      ] as [string, number][])
        s.entries.push({
          id: uid(),
          billId: '',
          accountId,
          amount: amount * sign,
          fee: 0,
          date,
          description: 'Transferência entre contas',
          kind: 'transfer',
        });
      summary = 'Transferência entre contas';
      break;
    }
    case 'member': {
      const email = txt(p.email, 'E-mail').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('E-mail inválido.');
      if (email === actor.email.toLowerCase())
        throw new Error('Você não pode alterar seu próprio acesso.');
      if (!['owner', 'employee'].includes(p.role))
        throw new Error('Perfil inválido.');
      const m = { email, role: p.role as Role, active: p.active !== false };
      const old = s.members.find((x) => x.email === email);
      if (old) Object.assign(old, m);
      else s.members.push(m);
      summary = email;
      break;
    }
    case 'contact': {
      const record = {
        id: p.id || uid(),
        name: txt(p.name, 'Nome'),
        type: txt(p.type, 'Tipo'),
        phone: txt(p.phone, 'Telefone', false),
        email: txt(p.email, 'E-mail', false),
      };
      if (!['customer', 'supplier'].includes(record.type))
        throw new Error('Tipo inválido.');
      const old = s.contacts.find((c) => c.id === record.id);
      if (old) Object.assign(old, record);
      else s.contacts.push(record);
      summary = record.name;
      break;
    }
    case 'import': {
      if (!Array.isArray(p.rows) || !p.rows.length || p.rows.length > 500)
        throw new Error('Importe entre 1 e 500 produtos por arquivo.');
      for (const row of p.rows)
        saveProduct(s, { ...row, id: undefined }, actor);
      summary = p.rows.length + ' produtos';
      break;
    }
    default:
      throw new Error('Operação desconhecida.');
  }
  s.processed.push(command.id);
  s.audit.push({
    id: uid(),
    type: command.type,
    actor: actor.email,
    date: new Date().toISOString(),
    summary,
  });
  return s;
}
export function redact(s: State, actor: Actor): State {
  if (actor.role === 'owner') return s;
  return {
    ...s,
    products: s.products.map((p) => ({ ...p, cost: 0 })),
    orders: s.orders
      .filter((o) => o.type === 'sale')
      .map((o) => ({ ...o, items: o.items.map((i) => ({ ...i, cost: 0 })) })),
    accounts: [],
    bills: [],
    entries: [],
    members: [],
    audit: [],
    processed: [],
  };
}
export function parseCSV(text: string): string[][] {
  const first = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];
  const separator = first.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === separator && !quoted) {
      row.push(field);
      field = '';
    } else if (c === '\n' && !quoted) {
      row.push(field.replace(/\r$/, ''));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV contém aspas não fechadas.');
  row.push(field.replace(/\r$/, ''));
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function exportCSV(rows: unknown[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? '');
            if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && !/^-[\d.,]+$/.test(s)))
              s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(';'),
      )
      .join('\r\n')
  );
}
