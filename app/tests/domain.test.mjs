import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState,
  applyCommand,
  accountBalance,
  remaining,
  splitCents,
  parseCSV,
} from '../lib/domain.ts';
const owner = { email: 'owner@example.com', role: 'owner' };
const employee = { email: 'team@example.com', role: 'employee' };
function run(s, type, payload = {}, actor = owner) {
  return applyCommand(s, { id: crypto.randomUUID(), type, payload }, actor);
}
function setup() {
  let s = emptyState();
  s = run(s, 'product', {
    name: 'Incenso',
    sku: 'INC-01',
    category: 'Incensos',
    variation: 'Sândalo',
    price: 2000,
    cost: 800,
    stock: 10,
    min: 2,
  });
  return s;
}
test('parcelas preservam os centavos', () => {
  assert.deepEqual(splitCents(100, 3), [34, 33, 33]);
});
test('venda baixa estoque e gera parcelas sem alterar caixa', () => {
  let s = setup();
  s = run(s, 'order', {
    type: 'sale',
    items: [{ productId: s.products[0].id, qty: 2, unit: 2000 }],
    installments: 3,
    date: '2026-09-10',
    due: '2026-09-10',
    discount: 100,
  });
  assert.equal(s.products[0].stock, 8);
  assert.equal(
    s.bills.reduce((t, b) => t + b.amount, 0),
    3900,
  );
  assert.equal(accountBalance(s, 'cash'), 0);
});
test('estoque insuficiente rejeita toda a operação', () => {
  const s = setup();
  assert.throws(
    () =>
      run(s, 'order', {
        type: 'sale',
        items: [{ productId: s.products[0].id, qty: 11, unit: 2000 }],
        date: '2026-09-10',
        due: '2026-09-10',
        installments: 1,
      }),
    /Estoque/,
  );
  assert.equal(s.products[0].stock, 10);
  assert.equal(s.orders.length, 0);
});
test('SKU repetido e quantidade fracionada são rejeitados', () => {
  const s = setup();
  assert.throws(
    () =>
      run(s, 'product', {
        name: 'Outro',
        sku: 'inc-01',
        price: 100,
        cost: 20,
        stock: 1,
        min: 0,
      }),
    /SKU/,
  );
  assert.throws(() =>
    run(s, 'adjust', {
      productId: s.products[0].id,
      delta: 0.5,
      reason: 'Inventário',
    }),
  );
});
test('pagamento parcial com taxa e cancelamento recompõem caixa e estoque', () => {
  let s = setup();
  s = run(s, 'order', {
    type: 'sale',
    items: [{ productId: s.products[0].id, qty: 2, unit: 2000 }],
    date: '2026-09-10',
    due: '2026-09-10',
    installments: 1,
  });
  s = run(s, 'settle', {
    billId: s.bills[0].id,
    accountId: 'cash',
    amount: 1000,
    fee: 50,
    date: '2026-09-10',
  });
  assert.equal(accountBalance(s, 'cash'), 950);
  assert.equal(remaining(s, s.bills[0]), 3000);
  s = run(s, 'cancel', {
    orderId: s.orders[0].id,
    reason: 'Devolução integral confirmada',
  });
  assert.equal(s.products[0].stock, 10);
  assert.equal(accountBalance(s, 'cash'), 0);
  assert.equal(remaining(s, s.bills[0]), 0);
  assert.throws(() =>
    run(s, 'cancel', { orderId: s.orders[0].id, reason: 'Outra devolução' }),
  );
});
test('recebimentos parciais atualizam custo médio e impedem excesso', () => {
  let s = setup();
  s = run(s, 'order', {
    type: 'purchase',
    contact: 'Fornecedor',
    items: [{ productId: s.products[0].id, qty: 4, unit: 1200 }],
    date: '2026-09-10',
    due: '2026-09-10',
    installments: 1,
  });
  s = run(s, 'receive', {
    orderId: s.orders[0].id,
    items: [{ productId: s.products[0].id, qty: 2 }],
  });
  assert.equal(s.products[0].stock, 12);
  assert.equal(s.products[0].cost, 867);
  assert.equal(s.orders[0].status, 'partial');
  assert.throws(() =>
    run(s, 'receive', {
      orderId: s.orders[0].id,
      items: [{ productId: s.products[0].id, qty: 3 }],
    }),
  );
});
test('transferência preserva saldo consolidado', () => {
  let s = emptyState();
  s = run(s, 'account', { name: 'Banco', opening: 0 });
  s = run(s, 'transfer', {
    from: 'cash',
    to: s.accounts[1].id,
    amount: 1000,
    date: '2026-09-10',
  });
  assert.equal(
    s.accounts.reduce((t, a) => t + accountBalance(s, a.id), 0),
    0,
  );
});
test('comando repetido não duplica venda', () => {
  let s = setup();
  const c = {
    id: 'unique-operation-id',
    type: 'adjust',
    payload: { productId: s.products[0].id, delta: 2, reason: 'Contagem' },
  };
  s = applyCommand(s, c, owner);
  s = applyCommand(s, c, owner);
  assert.equal(s.products[0].stock, 12);
});
test('funcionário não pode alterar finanças, custo ou acessos', () => {
  const s = setup();
  assert.throws(
    () => run(s, 'account', { name: 'Banco', opening: 0 }, employee),
    /Permissão/,
  );
  assert.throws(
    () =>
      run(s, 'member', { email: 'bad@example.com', role: 'owner' }, employee),
    /Permissão/,
  );
  assert.throws(
    () => run(s, 'product', { ...s.products[0], cost: 1 }, employee),
    /Permissão/,
  );
});
test('CSV interpreta campos entre aspas e exportação reimportável', () => {
  assert.deepEqual(parseCSV('nome;sku\n"Incenso; especial";INC'), [
    ['nome', 'sku'],
    ['Incenso; especial', 'INC'],
  ]);
});
test('importação é atômica e rejeita SKUs repetidos', () => {
  const s = emptyState();
  assert.throws(() =>
    run(s, 'import', {
      rows: [
        { name: 'A', sku: 'A', stock: 1, price: 100, cost: 50, min: 0 },
        { name: 'B', sku: 'A', stock: 1, price: 100, cost: 50, min: 0 },
      ],
    }),
  );
  assert.equal(s.products.length, 0);
});
test('pagamento além do saldo devedor e datas inválidas são rejeitados', () => {
  let s = emptyState();
  s = run(s, 'bill', {
    description: 'Aluguel',
    type: 'expense',
    amount: 10000,
    due: '2026-09-10',
    category: 'Ocupação',
  });
  assert.throws(() =>
    run(s, 'settle', {
      billId: s.bills[0].id,
      accountId: 'cash',
      amount: 10001,
      fee: 0,
      date: '2026-09-10',
    }),
  );
  assert.throws(() =>
    run(s, 'bill', {
      description: 'Teste',
      type: 'income',
      amount: 100,
      due: '2026-02-31',
      category: 'Outras',
    }),
  );
});

test('saldo inicial não é receita e só pode mudar antes de movimentações', () => {
  let s = emptyState();
  s = run(s, 'account', { id: 'cash', name: 'Caixa da loja', opening: 50000 });
  assert.equal(accountBalance(s, 'cash'), 50000);
  assert.equal(s.entries.length, 0);
  s = run(s, 'bill', {
    description: 'Teste',
    type: 'expense',
    amount: 100,
    due: '2026-09-10',
    category: 'Outras',
  });
  s = run(s, 'settle', {
    billId: s.bills[0].id,
    accountId: 'cash',
    amount: 100,
    date: '2026-09-10',
  });
  assert.throws(
    () => run(s, 'account', { id: 'cash', name: 'Caixa da loja', opening: 10 }),
    /primeira movimentação/,
  );
});
test('funcionário registra a venda mas não pode quitar o recebível', () => {
  const s = setup();
  assert.throws(
    () =>
      run(
        s,
        'order',
        {
          type: 'sale',
          items: [{ productId: s.products[0].id, qty: 1, unit: 2000 }],
          date: '2026-09-10',
          due: '2026-09-10',
          installments: 1,
          settleNow: true,
          accountId: 'cash',
        },
        employee,
      ),
    /Permissão/,
  );
});

test('retirada de lucro reduz apenas o caixa selecionado e não cria despesa operacional', () => {
  const s = setup();
  const id = s.accounts[0].id;
  const command = {
    id: crypto.randomUUID(),
    type: 'withdrawal',
    payload: {
      accountId: id,
      amount: 12345,
      date: '2026-09-14',
      recipient: 'Responsável',
      description: 'Retirada semanal',
    },
  };
  const next = applyCommand(s, command, owner);
  assert.equal(accountBalance(next, id), accountBalance(s, id) - 12345);
  assert.equal(next.entries.at(-1).kind, 'withdrawal');
  assert.match(next.entries.at(-1).description, /Responsável/);
  assert.deepEqual(next.bills, s.bills);
  assert.deepEqual(next.products, s.products);
  assert.equal(
    applyCommand(next, command, owner).entries.length,
    next.entries.length,
  );
  for (const patch of [
    { amount: 0 },
    { amount: -1 },
    { amount: 1.5 },
    { accountId: 'missing' },
    { recipient: '' },
  ]) {
    assert.throws(() => run(s, 'withdrawal', { ...command.payload, ...patch }));
  }
  assert.throws(() => run(s, 'withdrawal', command.payload, employee));
});
test('compras baixam o caixa quando pagas, imediatamente ou na quitação posterior', () => {
  const initial = setup(),
    accountId = initial.accounts[0].id;
  const purchase = {
    type: 'purchase',
    contact: 'Fornecedor',
    items: [{ productId: initial.products[0].id, qty: 2, unit: 1500 }],
    date: '2026-09-14',
    due: '2026-09-14',
    installments: 1,
    accountId,
  };
  const immediate = run(initial, 'order', { ...purchase, settleNow: true });
  assert.equal(
    accountBalance(immediate, accountId),
    accountBalance(initial, accountId) - 3000,
  );
  let later = run(initial, 'order', purchase);
  assert.equal(
    accountBalance(later, accountId),
    accountBalance(initial, accountId),
  );
  later = run(later, 'settle', {
    billId: later.bills.at(-1).id,
    accountId,
    amount: 3000,
    date: '2026-09-14',
  });
  assert.equal(
    accountBalance(later, accountId),
    accountBalance(immediate, accountId),
  );
});
