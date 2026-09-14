# OCA Águia Dourada

Aplicativo web responsivo para a gestão de uma loja: estoque por variação, compras, vendas gerenciais e financeiro. Interface em português, valores em reais e identidade visual baseada na logotipo oficial.

## Executar localmente

Requer Node.js 24 e npm. A aplicação está em `app/`.

```sh
npm run install:app
npm run db:local
npm run dev
```

Antes de iniciar, configure `ACCESS_CODE` (4 a 32 caracteres) e `ACCESS_SESSION_SECRET` (ao menos 32 caracteres aleatórios) em `app/.dev.vars`, arquivo ignorado pelo Git. Abra o endereço informado pelo servidor e entre com o código configurado. Os dados persistem em `app/.wrangler/` e nunca devem ser versionados. Não exponha o servidor de desenvolvimento à internet.

## Funcionalidades

- Produtos por SKU/variação, categoria, fornecedor, foto por URL HTTPS, custo, preço e mínimo.
- Histórico de estoque, ajustes com motivo e bloqueio de estoque negativo.
- Compras com múltiplos itens, parcelas, recebimentos parciais e custo médio ponderado.
- Serviços com descrição, quantidade e valor em compras e vendas, inclusive operações mistas, sem movimentação de estoque.
- Vendas com desconto, parcelas, forma de pagamento e baixa integrada de estoque.
- Cancelamento/devolução integral com reversão de estoque, pagamentos e taxas. Só confirme quando o reembolso e a devolução física estiverem concluídos.
- Contas a pagar e receber, baixas parciais, taxas, contas de caixa/banco e transferências.
- Retirada de caixa como lucro, com valor, data, conta e recebedor; baixa imediata e histórico no extrato.
- Painel de caixa, alertas, relatórios por período e exportações CSV.
- Clientes/fornecedores, acesso completo compartilhado por código, auditoria e exportação JSON.
- Importação CSV de até 500 produtos novos por arquivo, validada atomicamente.

## Autenticação e publicação

A entrada usa um código compartilhado, validado exclusivamente no servidor. Configure `ACCESS_CODE` e `ACCESS_SESSION_SECRET` como segredos no ambiente Sites. Todas as pessoas com o código têm acesso completo, inclusive ao financeiro, administração e exportações. Não há cadastro ou filtro por e-mail.

A sessão dura 12 horas e usa um cookie HttpOnly, Secure em produção e SameSite=Strict. O banco guarda apenas o hash do token. Sair revoga a sessão; alterar o código ou o segredo invalida as sessões existentes. Há um limite de cinco tentativas por endereço IP a cada 15 minutos. O nome informado na entrada é opcional e autodeclarado: identifica os registros, mas não comprova identidade individual.

Para permitir visitantes sem conta ChatGPT, a audiência do Sites deve ser pública depois da publicação desta proteção. As APIs de dados continuam exigindo uma sessão válida. Nenhum código de acesso real deve ser versionado.

## Instalar como aplicativo

Na tela de entrada ou no cabeçalho, use **Instalar aplicativo** no Chrome ou Edge. A instalação cria um ícone e uma janela própria, mantendo o mesmo endereço publicado. Quando a instalação direta não estiver disponível, o botão apresenta as instruções do navegador. No iPhone, use Compartilhar → Adicionar à Tela de Início.

A operação exige internet. O service worker guarda somente a página de indisponibilidade e os ícones; dados financeiros, estoque e respostas da API não são armazenados no cache offline.

A configuração de hospedagem está em `app/.openai/hosting.json`, e as migrações em `app/drizzle/`. O build gera um Worker Cloudflare e assets. O banco D1 é provisionado pela plataforma na publicação; nenhum dado da loja é armazenado no repositório.

## Consistência dos dados

Valores monetários são inteiros em centavos. Cada comando possui identificador de idempotência e versão do estado. O banco armazena um registro por entidade. Uma transação D1 atualiza a versão e todos os registros afetados; uma versão concorrente causa rollback integral e resposta HTTP 409.

Estoque de entrada usa custo médio. O custo de uma venda fica registrado em seus itens. Transferências e saldos iniciais não são receitas. As parcelas ainda não pagas não aumentam o saldo disponível. Estornos mantêm os registros originais.

## Validação

```sh
npm test
npm run typecheck
npm run build
```

Os testes cobrem regras de negócio, importação, permissões, sessões, limite de tentativas, instalação, persistência SQLite e conflitos de concorrência. O GitHub Actions executa testes, tipos e build a cada push/PR.

## Limites desta versão

Uma unidade, operação online, quantidades inteiras e devoluções integrais. Fotos usam URLs HTTPS; não há upload de imagens, emissão fiscal, integração bancária, e-commerce, funcionamento offline ou devolução parcial.

O relatório de margem usa vendas ativas e custo registrado por item. As movimentações realizadas são mostradas separadamente. Relatórios gerenciais não substituem escrituração contábil.

A aplicação carrega o conjunto de registros da loja para compor os painéis. Antes de operar com um histórico muito grande, será necessário paginar consultas e agregar relatórios no servidor. O snapshot JSON exportado permite arquivamento; restauração deve ser feita por procedimento técnico validado.

A ferramenta opcional WebMCP de consulta de estoque é registrada por detecção de suporte. Não houve validação em navegador com WebMCP disponível.


Serviços comprados compõem as despesas operacionais pela data da operação; seu pagamento segue as contas a pagar. Itens antigos sem tipo continuam sendo produtos. O recebimento de mercadorias ignora serviços.
