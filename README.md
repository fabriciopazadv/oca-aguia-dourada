# OCA Águia Dourada

Aplicativo web responsivo para a gestão de uma loja: estoque por variação, compras, vendas gerenciais e financeiro. Interface em português, valores em reais e identidade visual baseada na logotipo oficial.

## Executar localmente

Requer Node.js 24 e npm. A aplicação está em `app/`.

```sh
npm run install:app
npm run db:local
npm run dev
```

Abra o endereço informado pelo servidor e clique em **Entrar com ChatGPT**. O plugin Sites usa uma identidade simulada **somente no desenvolvimento local** (`seedy@sites.test`). Os dados persistem em `app/.wrangler/` e nunca devem ser versionados. Não exponha o servidor de desenvolvimento à internet.

## Funcionalidades

- Produtos por SKU/variação, categoria, fornecedor, foto por URL HTTPS, custo, preço e mínimo.
- Histórico de estoque, ajustes com motivo e bloqueio de estoque negativo.
- Compras com múltiplos itens, parcelas, recebimentos parciais e custo médio ponderado.
- Vendas com desconto, parcelas, forma de pagamento e baixa integrada de estoque.
- Cancelamento/devolução integral com reversão de estoque, pagamentos e taxas. Só confirme quando o reembolso e a devolução física estiverem concluídos.
- Contas a pagar e receber, baixas parciais, taxas, contas de caixa/banco e transferências.
- Painel de caixa, alertas, relatórios por período e exportações CSV.
- Clientes/fornecedores, perfis de proprietário e funcionário, auditoria e exportação JSON.
- Importação CSV de até 500 produtos novos por arquivo, validada atomicamente.

## Autenticação e publicação

A aplicação usa autenticação da plataforma Sites/ChatGPT. Em produção, configure `OWNER_EMAIL` no ambiente de hospedagem com o e-mail do proprietário. A variável não é salva no Git. Sem essa configuração, nenhum visitante recebe automaticamente acesso de proprietário.

A API valida a identidade encaminhada pelo gateway confiável e uma lista de membros no banco. **Não hospede este Worker diretamente atrás de um proxy que aceite cabeçalhos de identidade enviados pelo visitante.** Fora do Sites, será necessária uma integração de autenticação confiável equivalente.

A liberação de funcionários requer tanto o compartilhamento do aplicativo na hospedagem quanto o cadastro do mesmo e-mail em Administração. O perfil funcionário não recebe custos, compras, contas, pagamentos ou relatórios financeiros na resposta da API.

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

Os testes cobrem regras de negócio, importação, permissões, persistência SQLite e conflitos de concorrência. O GitHub Actions executa testes, tipos e build a cada push/PR.

## Limites desta versão

Uma unidade, operação online, quantidades inteiras e devoluções integrais. Fotos usam URLs HTTPS; não há upload de imagens, emissão fiscal, integração bancária, e-commerce, funcionamento offline ou devolução parcial.

O relatório de margem usa vendas ativas e custo registrado por item. As movimentações realizadas são mostradas separadamente. Relatórios gerenciais não substituem escrituração contábil.

A aplicação carrega o conjunto de registros da loja para compor os painéis. Antes de operar com um histórico muito grande, será necessário paginar consultas e agregar relatórios no servidor. O snapshot JSON exportado permite arquivamento; restauração deve ser feita por procedimento técnico validado.

A ferramenta opcional WebMCP de consulta de estoque é registrada por detecção de suporte. Não houve validação em navegador com WebMCP disponível.

