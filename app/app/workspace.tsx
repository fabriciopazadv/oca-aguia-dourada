'use client';
import AccessGate from './access-gate';
import InstallApp from './install-app';
import { useEffect, useState, type ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  Download,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Check,
  Users,
  ArrowLeftRight,
  Trash2,
  LogOut,
  Leaf,
  History,
  Bell,
  LoaderCircle,
} from 'lucide-react';
import {
  emptyState,
  money,
  today,
  accountBalance,
  remaining,
  parseCSV,
  exportCSV,
  type State,
  type Actor,
  type Order,
} from '@/lib/domain';
const nav = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'stock', label: 'Estoque', icon: Package },
  { id: 'sales', label: 'Vendas', icon: ShoppingBag },
  { id: 'purchases', label: 'Compras', icon: ShoppingCart, owner: true },
  { id: 'finance', label: 'Financeiro', icon: Wallet, owner: true },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: ChartNoAxesCombined,
    owner: true,
  },
  { id: 'contacts', label: 'Clientes e fornecedores', icon: Users },
  { id: 'admin', label: 'Administração', icon: Settings, owner: true },
];
const captions: Record<string, string> = {
  overview: 'Acompanhe o que movimenta a sua loja.',
  stock: 'Cada produto no lugar certo. Cada movimento registrado.',
  sales: 'Suas vendas, conectadas ao estoque e aos recebimentos.',
  purchases: 'Da compra ao recebimento, sem perder nenhum detalhe.',
  finance: 'Clareza sobre o que entrou, saiu e está por vir.',
  reports: 'Transforme seus registros em decisões.',
  contacts: 'As pessoas e parcerias que fazem parte da loja.',
  admin: 'Organize os acessos e acompanhe o histórico.',
};
const dateLabel = (s: string) =>
  s
    ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString(
        'pt-BR',
      )
    : '—';
const cents = (v: any) =>
  Math.round(Number(String(v || 0).replace(',', '.')) * 100);
const val = (n: number) => String(n / 100);
function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value || null} onValueChange={(v) => onChange(v || '')}>
        <SelectTrigger className="picker">
          <SelectValue>
            {options.find((o) => o.value === value)?.label || 'Selecione'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function Grid({
  heads,
  rows,
  empty = 'Nenhum registro encontrado.',
}: {
  heads: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  const [page, setPage] = useState(0);
  const max = Math.max(0, Math.ceil(rows.length / 12) - 1);
  const current = Math.min(page, max);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {heads.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(current * 12, current * 12 + 12).map((row, i) => (
            <TableRow key={current * 12 + i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length && (
        <div className="empty">
          <Package size={30} />
          <p>{empty}</p>
        </div>
      )}
      <div className="table-bottom">
        <small>{rows.length} registro(s)</small>
        {rows.length > 12 && (
          <Pagination className="pagination">
            <PaginationContent>
              <PaginationItem>
                <button
                  className="text-button"
                  disabled={!current}
                  onClick={() => setPage(current - 1)}
                >
                  Anterior
                </button>
              </PaginationItem>
              <PaginationItem>
                <span>
                  {current + 1} / {max + 1}
                </span>
              </PaginationItem>
              <PaginationItem>
                <button
                  className="text-button"
                  disabled={current === max}
                  onClick={() => setPage(current + 1)}
                >
                  Próxima
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
}
function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={'badge ' + tone}>{children}</span>;
}
function download(name: string, data: string, type = 'text/csv;charset=utf-8') {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}
export default function Workspace() {
  const [s, setS] = useState<State>(emptyState),
    [actor, setActor] = useState<Actor | null>(null),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [auth, setAuth] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [view, setView] = useState('overview'),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [tab, setTab] = useState('bills');
  const [modal, setModal] = useState(''),
    [f, setF] = useState<Record<string, any>>({}),
    [formError, setFormError] = useState(''),
    [operationId, setOperationId] = useState('');
  const [start, setStart] = useState(today().slice(0, 7) + '-01'),
    [end, setEnd] = useState(today());
  const isOwner = actor?.role === 'owner';
  async function refresh() {
    setError('');
    try {
      const r = await fetch('/api/store', { cache: 'no-store' });
      const d = (await r.json()) as {
        state: State;
        actor: Actor;
        version: number;
        error?: string;
        auth?: boolean;
      };
      if (!r.ok) {
        setAuth(!!d.auth);
        if (d.auth) {
          setS(emptyState());
          setActor(null);
          setModal('');
        }
        throw new Error(d.error);
      }
      setS(d.state);
      setActor(d.actor);
      setVersion(d.version);
      setAuth(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível carregar os dados.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function go(id: string) {
    setView(id);
    setQuery('');
    setFilter('all');
  }
  function open(type: string, data: Record<string, any> = {}) {
    setFormError('');
    setOperationId(crypto.randomUUID());
    setF({
      date: today(),
      due: today(),
      installments: 1,
      discount: '0',
      fee: '0',
      stock: 0,
      min: 2,
      price: '',
      cost: '0',
      opening: '0',
      amount: '',
      category: 'Outras',
      type: 'income',
      method: 'Pix',
      accountId: s.accounts[0]?.id,
      items: [{ productId: '', qty: 1, unit: '' }],
      ...data,
    });
    setModal(type);
  }
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'oca_search_stock',
          description: 'Consulta produtos e quantidades no estoque da loja.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: any) {
            if (typeof input?.query !== 'string')
              throw new Error('Informe query como texto.');
            return s.products
              .filter((p) =>
                (p.name + ' ' + p.sku + ' ' + p.variation)
                  .toLowerCase()
                  .includes(input.query.toLowerCase()),
              )
              .map((p) => ({
                sku: p.sku,
                name: p.name,
                variation: p.variation,
                stock: p.stock,
                price: p.price,
              }));
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [s.products]);
  const set = (key: string, value: any) =>
    setF((prev) => ({ ...prev, [key]: value }));
  function field(key: string, label: string, type = 'text', required = true) {
    return (
      <label className="field">
        <span>{label}</span>
        <input
          type={type}
          list={key === 'contact' ? 'contacts' : undefined}
          value={f[key] ?? ''}
          required={required}
          step={type === 'number' ? 'any' : undefined}
          maxLength={type === 'text' ? 200 : undefined}
          onChange={(e) => set(key, e.target.value)}
        />
      </label>
    );
  }
  const accountOptions = s.accounts.map((a) => ({
    value: a.id,
    label: a.name,
  }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      let type = modal,
        p: any = { ...f };
      if (modal === 'product') {
        p.price = cents(f.price);
        if (isOwner) p.cost = cents(f.cost);
        else delete p.cost;
      }
      if (modal === 'sale' || modal === 'purchase') {
        type = 'order';
        p.type = modal === 'sale' ? 'sale' : 'purchase';
        p.discount = cents(f.discount);
        p.fee = cents(f.fee);
        p.items = f.items.map((i: any) => ({ ...i, unit: cents(i.unit) }));
      }
      if (['bill', 'settle', 'transfer', 'withdrawal'].includes(modal)) {
        p.amount = cents(f.amount);
        p.fee = cents(f.fee);
      }
      if (modal === 'account') p.opening = cents(f.opening);
      if (modal === 'import') {
        const parsed = parseCSV(f.csv || '');
        const headers = parsed.shift();
        const expected = [
          'nome',
          'sku',
          'categoria',
          'variacao',
          'fornecedor',
          'custo',
          'preco',
          'estoque',
          'minimo',
        ];
        if (
          !headers ||
          expected.some((h, i) => headers[i]?.trim().toLowerCase() !== h)
        )
          throw new Error('Use as colunas do modelo, na mesma ordem.');
        p = {
          rows: parsed.map((r) => ({
            name: r[0],
            sku: r[1],
            category: r[2],
            variation: r[3],
            supplier: r[4],
            cost: cents(r[5]),
            price: cents(r[6]),
            stock: Number(r[7]),
            min: Number(r[8]),
          })),
        };
      }
      const response = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: operationId, version, type, payload: p }),
      });
      const d = (await response.json()) as {
        state: State;
        actor: Actor;
        version: number;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 409) await refresh();
        if (response.status === 401) {
          setS(emptyState());
          setActor(null);
          setModal('');
          setAuth(true);
          setError('Sua sessão expirou. Informe o código novamente.');
          return;
        }
        throw new Error(d.error || 'Não foi possível salvar.');
      }
      setS(d.state);
      setVersion(d.version);
      setActor(d.actor);
      setModal('');
      setNotice('Operação registrada com sucesso.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  const matches = (...v: any[]) =>
    v.join(' ').toLowerCase().includes(query.toLowerCase());
  const low = s.products.filter((p) => p.active && p.stock <= p.min);
  const sales = s.orders.filter(
    (o) => o.type === 'sale' && o.status !== 'cancelled',
  );
  const monthSales = sales
    .filter((o) => o.date.startsWith(today().slice(0, 7)))
    .reduce((t, o) => t + o.total, 0);
  const dueBills = s.bills
    .filter((b) => remaining(s, b) > 0)
    .sort((a, b) => a.due.localeCompare(b.due));
  const totalBalance = s.accounts.reduce(
    (t, a) => t + accountBalance(s, a.id),
    0,
  );
  const status = (o: Order) =>
    o.status === 'cancelled' ? (
      <Badge tone="red">Cancelada</Badge>
    ) : o.status === 'received' ? (
      <Badge tone="green">Recebida</Badge>
    ) : o.status === 'partial' ? (
      <Badge tone="gold">Recebimento parcial</Badge>
    ) : (
      <Badge tone={o.type === 'sale' ? 'green' : 'gold'}>
        {o.type === 'sale' ? 'Confirmada' : 'A receber'}
      </Badge>
    );
  function stockExport() {
    download(
      'estoque-oca.csv',
      exportCSV([
        [
          'nome',
          'sku',
          'categoria',
          'variacao',
          'fornecedor',
          ...(isOwner ? ['custo'] : []),
          'preco',
          'estoque',
          'minimo',
        ],
        ...s.products.map((p) => [
          p.name,
          p.sku,
          p.category,
          p.variation,
          p.supplier,
          ...(isOwner ? [val(p.cost)] : []),
          val(p.price),
          p.stock,
          p.min,
        ]),
      ]),
    );
  }
  const actions: Record<string, () => void> = {
    overview: () => open('sale'),
    stock: () => open('product', { category: '' }),
    sales: () => open('sale'),
    purchases: () => open('purchase', { discount: '0' }),
    finance: () => open('bill'),
    contacts: () => open('contact', { type: 'customer' }),
  };
  const actionLabels: Record<string, string> = {
    overview: 'Registrar venda',
    stock: 'Novo produto',
    sales: 'Registrar venda',
    purchases: 'Nova compra',
    finance: 'Novo lançamento',
    contacts: 'Novo contato',
  };
  const selection = s.products
    .filter((p) => p.active)
    .map((p) => ({
      value: p.id,
      label: p.name + ' · ' + (p.variation || p.sku) + ' (' + p.stock + ' un.)',
    }));
  function orderRows(type: 'sale' | 'purchase') {
    return s.orders
      .filter(
        (o) =>
          o.type === type &&
          matches(o.number, o.contact) &&
          (filter === 'all' ||
            (filter === 'cancelled'
              ? o.status === 'cancelled'
              : o.status !== 'cancelled')),
      )
      .slice()
      .reverse()
      .map((o) => [
        <strong>{o.number}</strong>,
        dateLabel(o.date),
        o.contact,
        o.items.reduce((t, i) => t + i.qty, 0) + ' un.',
        money(o.total),
        status(o),
        <button
          className="text-button"
          onClick={() => open('detail', { orderId: o.id })}
        >
          Ver detalhes <ArrowRight size={14} />
        </button>,
      ]);
  }
  const reportSales = sales.filter((o) => o.date >= start && o.date <= end),
    revenue = reportSales.reduce((t, o) => t + o.total, 0),
    cogs = reportSales.reduce(
      (t, o) => t + o.items.reduce((v, i) => v + i.qty * i.cost, 0),
      0,
    );
  const reportEntries = s.entries.filter(
    (e) => e.date >= start && e.date <= end && e.kind !== 'transfer',
  );
  const operationalExpenses =
    s.bills
      .filter(
        (b) =>
          !b.orderId &&
          !b.cancelled &&
          b.type === 'expense' &&
          b.due >= start &&
          b.due <= end,
      )
      .reduce((t, b) => t + b.amount, 0) +
    s.entries
      .filter(
        (e) =>
          e.kind === 'fee' &&
          e.date >= start &&
          e.date <= end &&
          !s.entries.some((r) => r.reverses === e.id),
      )
      .reduce((t, e) => t - e.amount, 0);
  function reportExport() {
    download(
      'relatorio-oca.csv',
      exportCSV([
        ['Indicador', 'Valor em R$'],
        ['Início', start],
        ['Fim', end],
        ['Vendas confirmadas', val(revenue)],
        ['Custo dos produtos vendidos', val(cogs)],
        ['Margem bruta', val(revenue - cogs)],
        ['Despesas operacionais e taxas', val(operationalExpenses)],
        [
          'Resultado operacional gerencial',
          val(revenue - cogs - operationalExpenses),
        ],
        [
          'Entradas realizadas',
          val(
            reportEntries
              .filter((e) => e.amount > 0)
              .reduce((t, e) => t + e.amount, 0),
          ),
        ],
        [
          'Saídas realizadas',
          val(
            reportEntries
              .filter((e) => e.amount < 0)
              .reduce((t, e) => t - e.amount, 0),
          ),
        ],
      ]),
    );
  }
  const titles: Record<string, string> = {
    product: f.id ? 'Editar produto' : 'Novo produto',
    adjust: 'Ajustar estoque',
    sale: 'Registrar venda',
    purchase: 'Nova compra',
    bill: 'Novo lançamento',
    settle: 'Registrar pagamento',
    account: 'Nova conta',
    withdrawal: 'Retirada de caixa',
    transfer: 'Transferir entre contas',
    contact: 'Cliente ou fornecedor',
    receive: 'Receber mercadorias',
    cancel: 'Cancelar e estornar operação',
    cancelBill: 'Cancelar e estornar lançamento',
    import: 'Importar produtos',
    detail: 'Detalhes da operação',
  };
  const detail = s.orders.find((o) => o.id === f.orderId);
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="brand">
            <img src="/logo-oficial.png" alt="Logotipo OCA Águia Dourada" />
            <strong>
              OCA<span>ÁGUIA DOURADA</span>
            </strong>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <small className="nav-label">GESTÃO DA LOJA</small>
          {nav
            .filter((n) => !n.owner || isOwner)
            .map((n) => (
              <button
                className={'nav-item ' + (view === n.id ? 'active' : '')}
                key={n.id}
                onClick={() => go(n.id)}
              >
                <n.icon size={19} />
                {n.label}
              </button>
            ))}
          <div className="sidebar-note">
            <Leaf size={19} />
            <p>
              Organização para
              <br />a sua loja prosperar.
            </p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="profile">
            <span className="avatar">
              {actor?.email[0]?.toUpperCase() || 'O'}
            </span>
            <div className="profile-name">
              {actor?.email || 'OCA Águia Dourada'}
              <small>
                {actor
                  ? isOwner
                    ? 'Acesso completo'
                    : 'Equipe'
                  : 'Gestão integrada'}
              </small>
            </div>
            {actor && (
              <button
                aria-label="Sair"
                className="logout"
                onClick={async () => {
                  try {
                    const r = await fetch('/api/access', { method: 'DELETE' });
                    if (!r.ok)
                      throw new Error(
                        'Não foi possível sair. Tente novamente.',
                      );
                    setS(emptyState());
                    setActor(null);
                    setModal('');
                    setAuth(true);
                    setError('Informe o código para entrar.');
                  } catch (e) {
                    setNotice(
                      e instanceof Error ? e.message : 'Não foi possível sair.',
                    );
                  }
                }}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <SidebarTrigger />
          <span>
            Minha loja{' '}
            <span className="muted">
              / {nav.find((n) => n.id === view)?.label}
            </span>
          </span>
          <span className="store-chip">● Unidade principal</span>
          <InstallApp />
          <button
            className="icon-button"
            aria-label="Atualizar dados"
            onClick={() => void refresh()}
          >
            <RefreshCw size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Ver alertas de estoque"
            onClick={() => {
              go('stock');
              setFilter('low');
            }}
          >
            <Bell size={18} />
            {low.length > 0 && <i />}
          </button>
        </header>
        <main>
          {notice && (
            <div className="toast" role="status">
              <Check size={18} />
              {notice}
            </div>
          )}
          {loading ? (
            <div className="empty loading">
              <LoaderCircle className="spin" size={30} />
              <h2>Carregando sua loja…</h2>
            </div>
          ) : auth ? (
            <AccessGate onSuccess={refresh} />
          ) : error ? (
            <section className="access panel">
              <img src="/logo-oficial.png" alt="OCA Águia Dourada" />
              <h1>
                {auth ? 'Bem-vindo à OCA' : 'Não foi possível abrir a loja'}
              </h1>
              <p role="alert">{error}</p>
              <button className="primary" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SEU NEGÓCIO, EM EQUILÍBRIO</p>
                  <h1>{nav.find((n) => n.id === view)?.label}</h1>
                  <p>{captions[view]}</p>
                </div>
                <div className="heading-actions">
                  {view === 'reports' ? (
                    <button className="secondary" onClick={reportExport}>
                      <Download size={17} />
                      Exportar
                    </button>
                  ) : (
                    actions[view] && (
                      <button className="primary" onClick={actions[view]}>
                        <Plus size={18} />
                        {actionLabels[view]}
                      </button>
                    )
                  )}
                </div>
              </div>
              {view === 'overview' && (
                <>
                  <section className="stats">
                    {(isOwner
                      ? [
                          [
                            Wallet,
                            'Saldo disponível',
                            money(totalBalance),
                            'Caixa e contas bancárias',
                          ],
                          [
                            ShoppingBag,
                            'Vendas do mês',
                            money(monthSales),
                            sales.filter((o) =>
                              o.date.startsWith(today().slice(0, 7)),
                            ).length + ' vendas confirmadas',
                          ],
                          [
                            ArrowUpRight,
                            'A receber',
                            money(
                              dueBills
                                .filter((b) => b.type === 'income')
                                .reduce((t, b) => t + remaining(s, b), 0),
                            ),
                            'Valores ainda não recebidos',
                          ],
                          [
                            Package,
                            'Estoque a repor',
                            String(low.length),
                            'Variações no mínimo ou abaixo',
                          ],
                        ]
                      : [
                          [
                            ShoppingBag,
                            'Vendas do mês',
                            money(monthSales),
                            'Vendas confirmadas',
                          ],
                          [
                            Package,
                            'Estoque a repor',
                            String(low.length),
                            'Variações no mínimo ou abaixo',
                          ],
                        ]
                    ).map(([Icon, label, value, sub]: any, i) => (
                      <article
                        className={'stat ' + (!i ? 'featured' : '')}
                        key={label}
                      >
                        <p>
                          {label}
                          <Icon size={19} />
                        </p>
                        <h2>{value}</h2>
                        <small>{sub}</small>
                      </article>
                    ))}
                  </section>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>{isOwner ? 'Fluxo de caixa' : 'Últimas vendas'}</h2>
                        <span className="muted">Últimos 7 dias</span>
                      </div>
                      {isOwner ? (
                        <>
                          <div className="legend">
                            <span>
                              <i className="income-dot" />
                              Entradas
                            </span>
                            <span>
                              <i className="expense-dot" />
                              Saídas
                            </span>
                          </div>
                          <div className="cash-chart">
                            {Array.from({ length: 7 }, (_, i) => {
                              const d = new Date(today() + 'T12:00:00Z');
                              d.setUTCDate(d.getUTCDate() - 6 + i);
                              const key = d.toISOString().slice(0, 10);
                              const entries = s.entries.filter(
                                (e) => e.date === key && e.kind !== 'transfer',
                              );
                              const income = entries
                                  .filter((e) => e.amount > 0)
                                  .reduce((t, e) => t + e.amount, 0),
                                expense = entries
                                  .filter((e) => e.amount < 0)
                                  .reduce((t, e) => t - e.amount, 0);
                              const max = Math.max(
                                100,
                                ...Object.values(
                                  s.entries
                                    .filter((e) => e.kind !== 'transfer')
                                    .reduce(
                                      (acc: Record<string, number>, e) => {
                                        const k =
                                          e.date + (e.amount >= 0 ? '+' : '-');
                                        acc[k] =
                                          (acc[k] || 0) + Math.abs(e.amount);
                                        return acc;
                                      },
                                      {},
                                    ),
                                ),
                              );
                              return (
                                <div className="chart-day" key={key}>
                                  <div className="bars">
                                    <div
                                      title={'Entradas ' + money(income)}
                                      className="bar income"
                                      style={{
                                        height: Math.max(
                                          2,
                                          (income / max) * 160,
                                        ),
                                      }}
                                    />
                                    <div
                                      title={'Saídas ' + money(expense)}
                                      className="bar expense"
                                      style={{
                                        height: Math.max(
                                          2,
                                          (expense / max) * 160,
                                        ),
                                      }}
                                    />
                                  </div>
                                  <span>{dateLabel(key).slice(0, 5)}</span>
                                  <small>{money(income - expense)}</small>
                                </div>
                              );
                            })}
                          </div>
                          <p className="chart-caption">
                            {s.entries.length
                              ? 'Valores efetivamente movimentados. Transferências não compõem receitas ou despesas.'
                              : 'Seu fluxo aparecerá aqui quando os primeiros pagamentos forem registrados.'}
                          </p>
                        </>
                      ) : (
                        <Grid
                          heads={['Venda', 'Cliente', 'Total']}
                          rows={sales
                            .slice(-5)
                            .reverse()
                            .map((o) => [o.number, o.contact, money(o.total)])}
                        />
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Atenção ao estoque</h2>
                        <Badge tone="gold">{low.length} itens</Badge>
                      </div>
                      {low.length ? (
                        low.slice(0, 4).map((p) => (
                          <div className="stock-alert" key={p.id}>
                            <span className="product-icon">
                              <Package size={19} />
                            </span>
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.variation || p.sku}</small>
                            </div>
                            <b>
                              {p.stock}
                              <small>unidades</small>
                            </b>
                          </div>
                        ))
                      ) : (
                        <div className="empty">
                          <Check size={30} />
                          <p>
                            {s.products.length
                              ? 'Estoque dentro dos limites definidos.'
                              : 'Cadastre os produtos para acompanhar a reposição.'}
                          </p>
                        </div>
                      )}
                      <button
                        className="text-button wide-link"
                        onClick={() => go('stock')}
                      >
                        Ver estoque completo <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                  <div className="panel lower-panel">
                    <div className="panel-heading">
                      <h2>
                        {isOwner
                          ? 'Próximos vencimentos'
                          : 'Movimentações recentes'}
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => go(isOwner ? 'finance' : 'stock')}
                      >
                        Ver todos <ArrowRight size={15} />
                      </button>
                    </div>
                    {isOwner ? (
                      <Grid
                        heads={[
                          'Descrição',
                          'Vencimento',
                          'Tipo',
                          'Em aberto',
                          'Situação',
                        ]}
                        rows={dueBills
                          .slice(0, 5)
                          .map((b) => [
                            b.description,
                            dateLabel(b.due),
                            b.type === 'income' ? 'A receber' : 'A pagar',
                            money(remaining(s, b)),
                            <Badge tone={b.due < today() ? 'red' : 'gold'}>
                              {b.due < today() ? 'Vencida' : 'Em aberto'}
                            </Badge>,
                          ])}
                      />
                    ) : (
                      <Grid
                        heads={['Produto', 'Quantidade', 'Motivo']}
                        rows={s.movements
                          .slice(-5)
                          .reverse()
                          .map((m) => [
                            s.products.find((p) => p.id === m.productId)?.name,
                            m.delta,
                            m.reason,
                          ])}
                      />
                    )}
                  </div>
                  {!s.products.length && (
                    <div className="welcome-strip">
                      <Leaf size={25} />
                      <div>
                        <strong>Comece pelo seu catálogo</strong>
                        <p>
                          Cadastre o primeiro produto com sua variação e
                          quantidade inicial.
                        </p>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => open('product', { category: '' })}
                      >
                        Cadastrar produto <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view !== 'overview' && view !== 'reports' && (
                <div className="toolbar">
                  <label className="search">
                    <Search size={18} />
                    <input
                      aria-label="Buscar registros"
                      placeholder={
                        view === 'stock'
                          ? 'Buscar produto, variação ou SKU…'
                          : 'Buscar registros…'
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  {['stock', 'sales', 'purchases', 'finance'].includes(
                    view,
                  ) && (
                    <Picker
                      label="Filtrar"
                      value={filter}
                      onChange={setFilter}
                      options={
                        view === 'stock'
                          ? [
                              { value: 'all', label: 'Todos os produtos' },
                              { value: 'low', label: 'Reposição necessária' },
                              { value: 'inactive', label: 'Inativos' },
                            ]
                          : view === 'finance'
                            ? [
                                { value: 'all', label: 'Todas as contas' },
                                { value: 'income', label: 'A receber' },
                                { value: 'expense', label: 'A pagar' },
                                { value: 'overdue', label: 'Vencidas' },
                                { value: 'paid', label: 'Quitadas' },
                              ]
                            : [
                                { value: 'all', label: 'Todas as operações' },
                                { value: 'active', label: 'Ativas' },
                                { value: 'cancelled', label: 'Canceladas' },
                              ]
                      }
                    />
                  )}
                  {view === 'stock' && (
                    <>
                      <button className="secondary" onClick={stockExport}>
                        <Download size={16} />
                        Exportar
                      </button>
                      {isOwner && (
                        <button
                          className="secondary"
                          onClick={() => open('import')}
                        >
                          Importar CSV
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {view === 'stock' && (
                <>
                  <div className="panel table-panel">
                    <Grid
                      heads={[
                        'Produto / variação',
                        'SKU',
                        'Categoria',
                        'Preço',
                        'Disponível',
                        'Situação',
                        'Ações',
                      ]}
                      rows={s.products
                        .filter(
                          (p) =>
                            matches(p.name, p.sku, p.variation, p.category) &&
                            (filter === 'all' ||
                              (filter === 'low' &&
                                p.stock <= p.min &&
                                p.active) ||
                              (filter === 'inactive' && !p.active)),
                        )
                        .map((p) => [
                          <div className="product-cell">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="product-icon">
                                <Package size={20} />
                              </span>
                            )}
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.variation || 'Sem variação'}</small>
                            </div>
                          </div>,
                          <code>{p.sku}</code>,
                          p.category || '—',
                          money(p.price),
                          <strong>
                            {p.stock} <small>un.</small>
                          </strong>,
                          <Badge
                            tone={
                              !p.active
                                ? 'neutral'
                                : p.stock <= p.min
                                  ? 'gold'
                                  : 'green'
                            }
                          >
                            {!p.active
                              ? 'Inativo'
                              : p.stock <= p.min
                                ? 'Repor estoque'
                                : 'Disponível'}
                          </Badge>,
                          <div className="row-actions">
                            <button
                              className="text-button"
                              onClick={() =>
                                open('product', {
                                  ...p,
                                  price: val(p.price),
                                  cost: val(p.cost),
                                })
                              }
                            >
                              Editar
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                open('adjust', {
                                  productId: p.id,
                                  delta: '',
                                  reason: '',
                                })
                              }
                            >
                              Ajustar
                            </button>
                          </div>,
                        ])}
                    />
                  </div>
                  <section className="panel lower-panel">
                    <h2>Histórico de movimentações</h2>
                    <Grid
                      heads={[
                        'Data',
                        'Produto',
                        'Quantidade',
                        'Motivo',
                        'Responsável',
                      ]}
                      rows={s.movements
                        .filter((m) =>
                          matches(
                            m.reason,
                            s.products.find((p) => p.id === m.productId)?.name,
                          ),
                        )
                        .slice()
                        .reverse()
                        .map((m) => [
                          dateLabel(m.date),
                          s.products.find((p) => p.id === m.productId)?.name,
                          <span
                            className={m.delta > 0 ? 'positive' : 'negative'}
                          >
                            {m.delta > 0 ? '+' : ''}
                            {m.delta}
                          </span>,
                          m.reason,
                          m.actor,
                        ])}
                    />
                  </section>
                </>
              )}
              {(view === 'sales' || view === 'purchases') && (
                <div className="panel table-panel">
                  <Grid
                    heads={[
                      'Operação',
                      'Data',
                      view === 'sales' ? 'Cliente' : 'Fornecedor',
                      'Itens',
                      'Total',
                      'Situação',
                      '',
                    ]}
                    rows={orderRows(view === 'sales' ? 'sale' : 'purchase')}
                  />
                </div>
              )}
              {view === 'finance' && (
                <>
                  <section className="account-grid">
                    {s.accounts.map((a) => (
                      <article className="account-card" key={a.id}>
                        <Wallet size={18} />
                        <p>{a.name}</p>
                        <h2>{money(accountBalance(s, a.id))}</h2>
                        {!s.entries.some((e) => e.accountId === a.id) && (
                          <button
                            className="text-button"
                            onClick={() =>
                              open('account', { ...a, opening: val(a.opening) })
                            }
                          >
                            Definir saldo inicial
                          </button>
                        )}
                      </article>
                    ))}
                    <button
                      className="account-add"
                      onClick={() => open('account')}
                    >
                      <Plus size={21} />
                      Adicionar conta
                    </button>
                  </section>
                  <div className="finance-tabs">
                    <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
                      <TabsList>
                        <TabsTrigger value="bills">
                          Contas a pagar e receber
                        </TabsTrigger>
                        <TabsTrigger value="ledger">Extrato</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <button
                      className="secondary"
                      onClick={() => open('withdrawal')}
                    >
                      <Wallet size={16} /> Retirada de caixa
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        open('transfer', {
                          from: s.accounts[0]?.id,
                          to: s.accounts[1]?.id,
                        })
                      }
                    >
                      <ArrowLeftRight size={16} />
                      Transferir
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        download(
                          tab === 'ledger'
                            ? 'extrato-oca.csv'
                            : 'financeiro-oca.csv',
                          exportCSV(
                            tab === 'ledger'
                              ? [
                                  [
                                    'Data',
                                    'Descrição',
                                    'Conta',
                                    'Movimento',
                                    'Valor',
                                  ],
                                  ...s.entries.map((e) => [
                                    dateLabel(e.date),
                                    e.description,
                                    s.accounts.find((a) => a.id === e.accountId)
                                      ?.name || '',
                                    e.kind === 'withdrawal'
                                      ? 'Retirada de lucro'
                                      : e.kind,
                                    val(e.amount),
                                  ]),
                                ]
                              : [
                                  [
                                    'Descrição',
                                    'Tipo',
                                    'Vencimento',
                                    'Valor',
                                    'Em aberto',
                                    'Cancelada',
                                  ],
                                  ...s.bills.map((b) => [
                                    b.description,
                                    b.type,
                                    dateLabel(b.due),
                                    val(b.amount),
                                    val(remaining(s, b)),
                                    b.cancelled ? 'Sim' : 'Não',
                                  ]),
                                ],
                          ),
                        )
                      }
                    >
                      <Download size={16} />
                      Exportar
                    </button>
                  </div>
                  <div className="panel table-panel">
                    {tab === 'bills' ? (
                      <Grid
                        heads={[
                          'Descrição',
                          'Categoria',
                          'Vencimento',
                          'Tipo',
                          'Em aberto',
                          'Situação',
                          '',
                        ]}
                        rows={s.bills
                          .filter(
                            (b) =>
                              matches(b.description, b.category) &&
                              (filter === 'all' ||
                                filter === b.type ||
                                (filter === 'overdue' &&
                                  b.due < today() &&
                                  remaining(s, b) > 0) ||
                                (filter === 'paid' &&
                                  !b.cancelled &&
                                  !remaining(s, b))),
                          )
                          .slice()
                          .sort((a, b) => a.due.localeCompare(b.due))
                          .map((b) => [
                            b.description,
                            b.category,
                            dateLabel(b.due),
                            <span
                              className={
                                b.type === 'income' ? 'positive' : 'negative'
                              }
                            >
                              {b.type === 'income' ? 'Receber' : 'Pagar'}
                            </span>,
                            money(remaining(s, b)),
                            <Badge
                              tone={
                                b.cancelled
                                  ? 'neutral'
                                  : !remaining(s, b)
                                    ? 'green'
                                    : b.due < today()
                                      ? 'red'
                                      : 'gold'
                              }
                            >
                              {b.cancelled
                                ? 'Cancelada'
                                : !remaining(s, b)
                                  ? 'Quitada'
                                  : b.due < today()
                                    ? 'Vencida'
                                    : 'Em aberto'}
                            </Badge>,
                            <div className="row-actions">
                              {remaining(s, b) > 0 && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    open('settle', {
                                      billId: b.id,
                                      amount: val(remaining(s, b)),
                                    })
                                  }
                                >
                                  Registrar{' '}
                                  {b.type === 'income'
                                    ? 'recebimento'
                                    : 'pagamento'}
                                </button>
                              )}
                              {!b.orderId && !b.cancelled && (
                                <button
                                  className="text-button negative"
                                  onClick={() =>
                                    open('cancelBill', {
                                      billId: b.id,
                                      reason: '',
                                    })
                                  }
                                >
                                  Estornar
                                </button>
                              )}
                            </div>,
                          ])}
                      />
                    ) : (
                      <Grid
                        heads={[
                          'Data',
                          'Descrição',
                          'Conta',
                          'Movimento',
                          'Valor',
                        ]}
                        rows={s.entries
                          .filter((e) =>
                            matches(
                              e.description,
                              s.accounts.find((a) => a.id === e.accountId)
                                ?.name,
                            ),
                          )
                          .slice()
                          .reverse()
                          .map((e) => [
                            dateLabel(e.date),
                            e.description,
                            s.accounts.find((a) => a.id === e.accountId)?.name,
                            e.kind === 'withdrawal'
                              ? 'Retirada de lucro'
                              : e.kind === 'transfer'
                                ? 'Transferência'
                                : e.kind === 'reversal'
                                  ? 'Estorno'
                                  : e.kind === 'fee'
                                    ? 'Taxa'
                                    : 'Pagamento',
                            <strong
                              className={
                                e.amount >= 0 ? 'positive' : 'negative'
                              }
                            >
                              {money(e.amount)}
                            </strong>,
                          ])}
                      />
                    )}
                  </div>
                </>
              )}
              {view === 'reports' && (
                <>
                  <div className="report-dates">
                    <label className="field">
                      De
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Até
                      <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </label>
                  </div>
                  {start > end && (
                    <p className="form-error">
                      A data inicial deve ser anterior à final.
                    </p>
                  )}
                  <section className="stats">
                    {[
                      ['Vendas confirmadas', revenue],
                      ['Custo dos produtos vendidos', cogs],
                      ['Margem bruta', revenue - cogs],
                      [
                        'Estoque a custo',
                        s.products.reduce((t, p) => t + p.stock * p.cost, 0),
                      ],
                    ].map(([name, value], i) => (
                      <article
                        className={'stat ' + (!i ? 'featured' : '')}
                        key={String(name)}
                      >
                        <p>{name}</p>
                        <h2>{money(Number(value))}</h2>
                        <small>
                          {i === 3
                            ? 'Posição atual'
                            : dateLabel(start) + ' a ' + dateLabel(end)}
                        </small>
                      </article>
                    ))}
                  </section>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <h2>Resultado gerencial</h2>
                      <div className="metric-row">
                        <span>Receita das vendas ativas</span>
                        <strong>{money(revenue)}</strong>
                      </div>
                      <div className="metric-row">
                        <span>Custo dos itens vendidos</span>
                        <strong>{money(-cogs)}</strong>
                      </div>
                      <div className="metric-row total">
                        <span>Margem bruta</span>
                        <strong>{money(revenue - cogs)}</strong>
                      </div>
                      <p className="chart-caption">
                        Calculada pela data da venda e pelo custo registrado em
                        cada item. Vendas integralmente estornadas são
                        excluídas.
                      </p>
                      <div className="metric-row">
                        <span>Despesas operacionais e taxas</span>
                        <strong>{money(operationalExpenses)}</strong>
                      </div>
                      <div className="metric-row total">
                        <span>Resultado operacional gerencial</span>
                        <strong>
                          {money(revenue - cogs - operationalExpenses)}
                        </strong>
                      </div>
                      <p className="chart-caption">
                        Despesas manuais pela data de vencimento e taxas
                        efetivas no período. Resultado gerencial, sem apuração
                        de tributos.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>Caixa realizado e previsto</h2>
                      {[
                        [
                          'Entradas realizadas',
                          reportEntries
                            .filter((e) => e.amount > 0)
                            .reduce((t, e) => t + e.amount, 0),
                        ],
                        [
                          'Saídas realizadas',
                          reportEntries
                            .filter((e) => e.amount < 0)
                            .reduce((t, e) => t - e.amount, 0),
                        ],
                        [
                          'A receber no período',
                          dueBills
                            .filter(
                              (b) =>
                                b.type === 'income' &&
                                b.due >= start &&
                                b.due <= end,
                            )
                            .reduce((t, b) => t + remaining(s, b), 0),
                        ],
                        [
                          'A pagar no período',
                          dueBills
                            .filter(
                              (b) =>
                                b.type === 'expense' &&
                                b.due >= start &&
                                b.due <= end,
                            )
                            .reduce((t, b) => t + remaining(s, b), 0),
                        ],
                      ].map(([label, value]) => (
                        <div className="metric-row" key={String(label)}>
                          <span>{label}</span>
                          <strong>{money(Number(value))}</strong>
                        </div>
                      ))}
                    </section>
                  </div>
                  <section className="panel lower-panel">
                    <h2>Desempenho por produto</h2>
                    <Grid
                      heads={[
                        'Produto',
                        'Unidades vendidas',
                        'Venda bruta de itens',
                        'Custo',
                        'Estoque atual',
                      ]}
                      rows={s.products.map((p) => {
                        const items = reportSales
                          .flatMap((o) => o.items)
                          .filter((i) => i.productId === p.id);
                        return [
                          p.name + ' · ' + p.variation,
                          items.reduce((t, i) => t + i.qty, 0),
                          money(items.reduce((t, i) => t + i.qty * i.unit, 0)),
                          money(items.reduce((t, i) => t + i.qty * i.cost, 0)),
                          p.stock,
                        ];
                      })}
                    />
                    <p className="chart-caption">
                      Venda bruta por item, antes do desconto global da venda.
                    </p>
                  </section>
                </>
              )}
              {view === 'contacts' && (
                <div className="panel table-panel">
                  <Grid
                    heads={['Nome', 'Tipo', 'Telefone', 'E-mail', '']}
                    rows={s.contacts
                      .filter((c) => matches(c.name, c.phone, c.email))
                      .map((c) => [
                        <strong>{c.name}</strong>,
                        c.type === 'customer' ? 'Cliente' : 'Fornecedor',
                        c.phone || '—',
                        c.email || '—',
                        <button
                          className="text-button"
                          onClick={() => open('contact', c)}
                        >
                          Editar
                        </button>,
                      ])}
                  />
                </div>
              )}
              {view === 'admin' && (
                <>
                  <div className="panel">
                    <div className="panel-heading">
                      <h2>Acesso compartilhado</h2>
                      <Badge tone="green">Acesso completo</Badge>
                    </div>
                    <p className="chart-caption">
                      O código fornecido pelo responsável libera todos os
                      módulos. Não é necessário cadastrar e-mail. Cada sessão
                      dura até 12 horas.
                    </p>
                    <p className="chart-caption">
                      O nome no histórico é informado pela própria pessoa ao
                      entrar. Como o código é compartilhado, ele não comprova a
                      identidade individual.
                    </p>
                  </div>
                  <section className="panel lower-panel">
                    <div className="panel-heading">
                      <h2>Histórico de operações</h2>
                      <button
                        className="secondary"
                        onClick={() =>
                          download(
                            'backup-oca-' + today() + '.json',
                            JSON.stringify(s, null, 2),
                            'application/json',
                          )
                        }
                      >
                        <Download size={16} />
                        Exportar dados completos
                      </button>
                    </div>
                    <Grid
                      heads={['Data', 'Ação', 'Descrição', 'Responsável']}
                      rows={s.audit
                        .filter((a) => matches(a.summary, a.actor))
                        .slice()
                        .reverse()
                        .map((a) => [
                          dateLabel(a.date),
                          (
                            {
                              product: 'Produto',
                              adjust: 'Ajuste',
                              order: 'Operação',
                              receive: 'Recebimento',
                              cancel: 'Estorno',
                              settle: 'Pagamento',
                              bill: 'Lançamento',
                              withdrawal: 'Retirada de caixa',
                              transfer: 'Transferência',
                              member: 'Acesso',
                              contact: 'Contato',
                              account: 'Conta',
                              import: 'Importação',
                            } as Record<string, string>
                          )[a.type] || a.type,
                          a.summary,
                          a.actor,
                        ])}
                    />
                  </section>
                </>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>OCA ÁGUIA DOURADA</span>
            <span>Estoque e financeiro em harmonia</span>
          </footer>
        </main>
      </SidebarInset>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v && !busy) setModal('');
        }}
      >
        <DialogContent className="oca-dialog" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{titles[modal]}</DialogTitle>
            <DialogDescription>
              {modal === 'cancel' || modal === 'cancelBill'
                ? 'Confirme apenas quando a devolução e os reembolsos estiverem efetivados. Os pagamentos e taxas serão estornados nas contas de origem.'
                : modal === 'detail'
                  ? 'Itens, valores e andamento da operação.'
                  : 'Preencha os dados para registrar a operação na loja.'}
            </DialogDescription>
          </DialogHeader>
          {modal === 'detail' && detail ? (
            <div className="detail-content">
              <div className="detail-summary">
                <h2>{detail.number}</h2>
                {status(detail)}
                <strong>{money(detail.total)}</strong>
              </div>
              <p>
                {detail.contact} · {dateLabel(detail.date)} · {detail.method}
              </p>
              <Grid
                heads={[
                  'Produto',
                  'Quantidade',
                  'Unitário',
                  ...(detail.type === 'purchase' ? ['Recebido'] : []),
                ]}
                rows={detail.items.map((i) => [
                  i.name,
                  i.qty,
                  money(i.unit),
                  ...(detail.type === 'purchase' ? [i.received] : []),
                ])}
              />
              <div className="metric-row">
                <span>Desconto</span>
                <strong>{money(detail.discount)}</strong>
              </div>
              <div className="row-actions">
                {isOwner &&
                  detail.type === 'purchase' &&
                  !['cancelled', 'received'].includes(detail.status) && (
                    <button
                      className="primary"
                      onClick={() =>
                        open('receive', {
                          orderId: detail.id,
                          items: detail.items.map((i) => ({
                            productId: i.productId,
                            qty: i.qty - i.received,
                          })),
                        })
                      }
                    >
                      Receber itens
                    </button>
                  )}
                {isOwner && detail.status !== 'cancelled' && (
                  <button
                    className="danger"
                    onClick={() =>
                      open('cancel', { orderId: detail.id, reason: '' })
                    }
                  >
                    Cancelar / devolver integralmente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="operation-form">
              {modal === 'product' && (
                <>
                  <div className="form-grid">
                    {field('name', 'Nome do produto')}
                    {field('sku', 'SKU / código interno')}
                    {field('category', 'Categoria', 'text', false)}
                    {field(
                      'variation',
                      'Variação (cor, tamanho, aroma…)',
                      'text',
                      false,
                    )}
                    {field('supplier', 'Fornecedor', 'text', false)}
                    {field('price', 'Preço de venda (R$)', 'number')}
                    {isOwner && field('cost', 'Custo unitário (R$)', 'number')}
                    {!f.id && field('stock', 'Quantidade inicial', 'number')}
                    {field('min', 'Estoque mínimo', 'number')}
                  </div>
                  {field('photo', 'URL HTTPS da foto', 'url', false)}
                  {f.id && (
                    <label className="check-field">
                      <Checkbox
                        checked={f.active !== false}
                        onCheckedChange={(v) => set('active', v === true)}
                      />
                      Produto ativo
                    </label>
                  )}
                </>
              )}
              {modal === 'adjust' && (
                <>
                  <Picker
                    label="Produto"
                    value={f.productId}
                    onChange={(v) => set('productId', v)}
                    options={selection}
                  />
                  <p className="hint">
                    Use valor positivo para entrada ou negativo para saída.
                    Saldo atual:{' '}
                    {s.products.find((p) => p.id === f.productId)?.stock ?? 0}{' '}
                    unidades.
                  </p>
                  {field('delta', 'Diferença de quantidade', 'number')}
                  {field('reason', 'Motivo do ajuste')}
                </>
              )}
              {(modal === 'sale' || modal === 'purchase') && (
                <>
                  <div className="form-grid">
                    {field(
                      'contact',
                      modal === 'sale' ? 'Cliente (opcional)' : 'Fornecedor',
                      'text',
                      modal === 'purchase',
                    )}
                    {field('date', 'Data da operação', 'date')}
                  </div>
                  <datalist id="contacts">
                    {s.contacts.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  <div className="order-items">
                    {f.items?.map((item: any, index: number) => (
                      <div className="order-item" key={index}>
                        <Picker
                          label="Produto / variação"
                          value={item.productId}
                          options={selection}
                          onChange={(v) => {
                            const p = s.products.find((p) => p.id === v);
                            set(
                              'items',
                              f.items.map((x: any, j: number) =>
                                j === index
                                  ? {
                                      ...x,
                                      productId: v,
                                      unit: val(
                                        modal === 'sale'
                                          ? p?.price || 0
                                          : p?.cost || 0,
                                      ),
                                    }
                                  : x,
                              ),
                            );
                          }}
                        />
                        <label className="field">
                          <span>Unidades</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={item.qty}
                            onChange={(e) =>
                              set(
                                'items',
                                f.items.map((x: any, j: number) =>
                                  j === index
                                    ? { ...x, qty: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Unitário (R$)</span>
                          <input
                            type="number"
                            min="0.01"
                            step=".01"
                            required
                            value={item.unit}
                            onChange={(e) =>
                              set(
                                'items',
                                f.items.map((x: any, j: number) =>
                                  j === index
                                    ? { ...x, unit: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Remover item"
                          disabled={f.items.length === 1}
                          onClick={() =>
                            set(
                              'items',
                              f.items.filter(
                                (_: any, j: number) => j !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      set('items', [
                        ...f.items,
                        { productId: '', qty: 1, unit: '' },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Adicionar item
                  </button>
                  <div className="form-grid">
                    {modal === 'sale' &&
                      field('discount', 'Desconto total (R$)', 'number')}
                    {field('installments', 'Número de parcelas', 'number')}
                    {field('due', 'Primeiro vencimento', 'date')}
                    <Picker
                      label="Forma de pagamento"
                      value={f.method}
                      onChange={(v) => set('method', v)}
                      options={[
                        'Pix',
                        'Dinheiro',
                        'Cartão de crédito',
                        'Cartão de débito',
                        'Boleto',
                        'Transferência',
                      ].map((v) => ({ value: v, label: v }))}
                    />
                  </div>
                  {isOwner && (
                    <label className="check-field">
                      <Checkbox
                        checked={!!f.settleNow}
                        onCheckedChange={(v) => set('settleNow', v === true)}
                      />
                      Registrar pagamento integral agora
                    </label>
                  )}
                  {f.settleNow && (
                    <div className="form-grid">
                      <Picker
                        label="Conta de movimentação"
                        value={f.accountId}
                        onChange={(v) => set('accountId', v)}
                        options={accountOptions}
                      />
                      {field('fee', 'Taxa total (R$)', 'number')}
                    </div>
                  )}
                  <div className="order-total">
                    <span>Total da operação</span>
                    <strong>
                      {money(
                        (f.items || []).reduce(
                          (t: number, i: any) =>
                            t + Number(i.qty || 0) * cents(i.unit),
                          0,
                        ) - cents(f.discount),
                      )}
                    </strong>
                  </div>
                </>
              )}
              {modal === 'receive' && (
                <>
                  {detail?.items.map((item, index) => (
                    <label className="field" key={item.productId}>
                      <span>
                        {item.name} · faltam {item.qty - item.received} un.
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={item.qty - item.received}
                        step="1"
                        value={f.items[index]?.qty ?? 0}
                        onChange={(e) =>
                          set(
                            'items',
                            f.items.map((x: any, j: number) =>
                              j === index ? { ...x, qty: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </>
              )}
              {(modal === 'cancel' || modal === 'cancelBill') && (
                <>
                  {field('reason', 'Motivo do cancelamento / devolução')}
                  <p className="hint">
                    Esta ação mantém o histórico. Nas compras, é necessário
                    haver estoque disponível para devolver os itens recebidos.
                  </p>
                </>
              )}
              {modal === 'bill' && (
                <>
                  <Picker
                    label="Tipo"
                    value={f.type}
                    onChange={(v) => set('type', v)}
                    options={[
                      { value: 'income', label: 'Receita / a receber' },
                      { value: 'expense', label: 'Despesa / a pagar' },
                    ]}
                  />
                  {field('description', 'Descrição')}
                  <div className="form-grid">
                    {field('amount', 'Valor (R$)', 'number')}
                    {field('due', 'Vencimento', 'date')}
                    {field('category', 'Categoria')}
                  </div>
                </>
              )}
              {modal === 'settle' && (
                <>
                  <p className="hint">
                    {s.bills.find((b) => b.id === f.billId)?.description}
                  </p>
                  <div className="form-grid">
                    {field('amount', 'Valor pago / recebido (R$)', 'number')}
                    {field('fee', 'Taxa paga (R$)', 'number')}
                    {field('date', 'Data do pagamento', 'date')}
                    <Picker
                      label="Conta"
                      value={f.accountId}
                      onChange={(v) => set('accountId', v)}
                      options={accountOptions}
                    />
                  </div>
                  <p className="hint">
                    O valor pode ser parcial. A taxa é registrada como uma saída
                    adicional.
                  </p>
                </>
              )}
              {modal === 'account' && (
                <>
                  {field('name', 'Nome da conta')}
                  {field('opening', 'Saldo inicial (R$)', 'number')}
                  <p className="hint">
                    O saldo inicial compõe o disponível sem ser contado como
                    receita.
                  </p>
                </>
              )}
              {modal === 'withdrawal' && (
                <>
                  <div className="form-grid">
                    <Picker
                      label="Conta de origem"
                      value={f.accountId}
                      onChange={(v) => set('accountId', v)}
                      options={accountOptions}
                    />
                    {field('amount', 'Valor retirado (R$)', 'number')}
                    {field('date', 'Data da retirada', 'date')}
                    {field('recipient', 'Quem recebeu')}
                  </div>
                  {field('description', 'Observação', 'text', false)}
                  <p className="hint">
                    Registre somente valores já retirados. A retirada será
                    descontada imediatamente da conta e aparecerá no extrato
                    como retirada de lucro.
                  </p>
                </>
              )}
              {modal === 'transfer' && (
                <>
                  <div className="form-grid">
                    <Picker
                      label="Da conta"
                      value={f.from}
                      onChange={(v) => set('from', v)}
                      options={accountOptions}
                    />
                    <Picker
                      label="Para a conta"
                      value={f.to}
                      onChange={(v) => set('to', v)}
                      options={accountOptions}
                    />
                    {field('amount', 'Valor (R$)', 'number')}
                    {field('date', 'Data', 'date')}
                  </div>
                </>
              )}
              {modal === 'contact' && (
                <>
                  <Picker
                    label="Tipo de contato"
                    value={f.type}
                    onChange={(v) => set('type', v)}
                    options={[
                      { value: 'customer', label: 'Cliente' },
                      { value: 'supplier', label: 'Fornecedor' },
                    ]}
                  />
                  {field('name', 'Nome')}
                  <div className="form-grid">
                    {field('phone', 'Telefone', 'tel', false)}
                    {field('email', 'E-mail', 'email', false)}
                  </div>
                </>
              )}
              {modal === 'import' && (
                <>
                  <p className="hint">
                    Até 500 novos produtos por arquivo. A importação é validada
                    por completo antes de salvar.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      download(
                        'modelo-produtos-oca.csv',
                        exportCSV([
                          [
                            'nome',
                            'sku',
                            'categoria',
                            'variacao',
                            'fornecedor',
                            'custo',
                            'preco',
                            'estoque',
                            'minimo',
                          ],
                          [
                            'Incenso natural',
                            'INC-001',
                            'Incensos',
                            'Sândalo',
                            '',
                            '8.50',
                            '20.00',
                            '10',
                            '3',
                          ],
                        ]),
                      )
                    }
                  >
                    <Download size={16} />
                    Baixar modelo
                  </button>
                  <label className="field">
                    <span>Arquivo CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      required
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1000000) {
                            setFormError('O arquivo deve ter até 1 MB.');
                            return;
                          }
                          set('csv', await file.text());
                        }
                      }}
                    />
                  </label>
                  {f.csv && (
                    <p className="hint">
                      Arquivo carregado. Os dados serão validados ao salvar.
                    </p>
                  )}
                </>
              )}
              {formError && (
                <p className="form-error" role="alert">
                  <AlertTriangle size={17} />
                  {formError}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setModal('')}
                >
                  Voltar
                </button>
                <button
                  className={modal.startsWith('cancel') ? 'danger' : 'primary'}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="spin" />
                      Salvando…
                    </>
                  ) : modal.startsWith('cancel') ? (
                    'Confirmar estorno'
                  ) : (
                    'Salvar operação'
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
