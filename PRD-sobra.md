# PRD — "Sobra" (nome provisório, renomeável)

App pessoal de **recuperação financeira + fluxo de caixa honesto**. Não é um app que só registra gastos: ele **orienta** o usuário a (1) saber quanto deve, (2) quitar dívidas e (3) construir reserva. Objetivo do dono: sair das dívidas e começar a guardar, com renda variável.

> Princípio central: o número que importa não é o saldo do banco, é o **disponível real** — o dinheiro que ainda não tem destino.

---

## 1. Decisões travadas

- **Stack:** Next.js (App Router, TypeScript) + Tailwind + Supabase (Postgres + Auth + RLS). Deploy na Vercel. **PWA instalável** ("Adicionar à tela inicial").
- **Dados:** nuvem própria no Supabase do projeto. Multi-usuário com isolamento por RLS (`auth.uid()`).
- **Coração:** modelo de **caixinhas (envelopes) com regras automáticas**.
- **Simulador:** com **juros por dívida** (mais realista).
- **Sem dados pessoais embutidos.** App nasce vazio (seeds só de defaults neutros). Titulares e descrições são genéricos e definidos pelo usuário → dá pra emprestar o app sem expor débitos.

---

## 2. Modelo mental: caixinhas com regras automáticas

O saldo é **uma conta só, dividida em caixinhas virtuais**. A soma das caixinhas = saldo total.

Caixinhas padrão (seed): `Fixas`, `Dívidas`, `Reserva`, `Livre`. O usuário pode criar outras (`Lazer`, `Imposto`, `Negócio`...).

- **Entrou dinheiro** → distribuído entre caixinhas por uma **regra** (ex.: salário: Fixas/ Dívidas/ Livre; receita variável: 50% Dívidas, 20% Reserva, 30% Livre). A regra é automática, mas o usuário pode ajustar a distribuição no ato.
- **Saiu dinheiro** → sai de uma caixinha. Cada categoria tem uma **caixinha padrão** (mercado → Livre; luz → Fixas; pagamento de dívida → Dívidas), então na prática o usuário só confirma.
- **Número-herói do painel = saldo da caixinha `Livre`** ("pode gastar isso sem comprometer nada").

Por que isso (e não "saldo − comprometido"): com renda variável, as caixinhas **capturam o dinheiro extra para dívida/reserva no momento em que ele entra**, em vez de inflar o "disponível" e virar gasto.

---

## 3. Caixinha "Negócio" (reinvestimento) — já previsto no schema, painel construído depois

Caixinha do tipo `negocio` é **auto-financiada e isolada**:
- Vendas de infoproduto entram nela (receita com `envelope` = Negócio).
- Anúncios saem dela (despesa com `envelope` = Negócio).
- **Não entra** no cálculo de "disponível pra gastar" nem nas regras de distribuição pessoal.
- "Dar um up nos anúncios" = **aporte** (transferência caixinha pessoal → Negócio), registrado em `transfers` com `tipo = 'aporte'`.
- Métrica (v2): **ROI/lucro** = vendas − anúncios − aportes, no período.

No v1, basta o tipo de caixinha existir e as transferências funcionarem. O painel de ROI fica para depois.

---

## 4. Modelo de dados (Supabase / Postgres)

Convenções: toda tabela tem `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `created_at timestamptz default now()`. RLS ligado em todas, política `auth.uid() = user_id` para `all`.

```sql
-- ENUM-likes via CHECK (mais fácil de evoluir que enum nativo)

create table titulares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,            -- genérico: "Cartão A", "Familiar 1", o que o usuário quiser
  descricao text,
  created_at timestamptz default now()
);

create table envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'custom'
    check (tipo in ('fixas','dividas','reserva','livre','negocio','custom')),
  saldo numeric(14,2) not null default 0,
  meta numeric(14,2),            -- usado pela reserva e por metas de caixinha
  cor text,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  emoji text,
  tipo text not null check (tipo in ('receita','despesa')),
  envelope_padrao_id uuid references envelopes(id) on delete set null,
  created_at timestamptz default now()
);

create table distribution_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  alocacoes jsonb not null,      -- [{ "envelope_id": "...", "pct": 50 }, ...] soma = 100
  created_at timestamptz default now()
);

create table income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('fixa','variavel')),
  valor_estimado numeric(14,2) default 0,
  dia_recebimento int,           -- null para variável
  distribution_rule_id uuid references distribution_rules(id) on delete set null,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  valor numeric(14,2) not null,
  dia_vencimento int,
  category_id uuid references categories(id) on delete set null,
  envelope_id uuid references envelopes(id) on delete set null,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titular_id uuid references titulares(id) on delete set null,  -- "de quem é" (genérico)
  credor text not null,          -- ex.: "Banco X", "Cartão Y"
  descricao text,                -- o que é a dívida
  valor_original numeric(14,2) not null default 0,
  valor_atual numeric(14,2) not null default 0,
  valor_acordado numeric(14,2),  -- preenchido quando negocia
  juros_mensal numeric(6,4) not null default 0,   -- % a.m. (ex.: 1.99). Default 0 se desconhecido.
  parcela_min numeric(14,2) not null default 0,   -- parcela mínima obrigatória/mês
  status text not null default 'a_negociar'
    check (status in ('a_negociar','negociado','acordo_em_dia','atrasado','acumulando','quitada')),
  desconta_em_folha boolean default false,        -- abate automático do salário
  elegivel_desenrola boolean default false,
  contratada_em date,
  atraso_dias int,
  quitada boolean default false,
  ordem int default 0,
  created_at timestamptz default now()
);

create table debt_negotiations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  data date not null default current_date,
  valor_ofertado numeric(14,2),
  valor_acordado numeric(14,2),
  desconto_pct numeric(6,2),
  canal text,
  obs text,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null default current_date,
  tipo text not null check (tipo in ('receita','despesa')),
  valor numeric(14,2) not null,
  category_id uuid references categories(id) on delete set null,
  envelope_id uuid references envelopes(id) on delete set null,  -- de/para qual caixinha
  debt_id uuid references debts(id) on delete set null,          -- se for pagamento de dívida
  income_source_id uuid references income_sources(id) on delete set null,
  descricao text,
  forma_pgto text,               -- Dinheiro / Pix / Débito / Crédito
  created_at timestamptz default now()
);

create table transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null default current_date,
  origem_envelope_id uuid references envelopes(id) on delete set null,
  destino_envelope_id uuid references envelopes(id) on delete set null,
  valor numeric(14,2) not null,
  tipo text not null default 'distribuicao'
    check (tipo in ('distribuicao','aporte','ajuste','sweep')),
  descricao text,
  created_at timestamptz default now()
);
```

**RLS (aplicar em todas as tabelas):**
```sql
alter table titulares enable row level security;
create policy own on titulares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repetir o par (enable + policy) para: envelopes, categories, distribution_rules,
-- income_sources, recurring_expenses, debts, debt_negotiations, transactions, transfers
```

### Integridade dos saldos (importante)
`envelopes.saldo` é a fonte de verdade. Para não dessincronizar, **toda alteração de saldo passa por RPC (função no Postgres)**, nunca por update solto no cliente:

- `registrar_lancamento(p_tipo, p_valor, p_envelope_id, p_category_id, p_data, p_descricao, p_forma_pgto, p_debt_id)`
  → cria `transaction`; receita: `saldo += valor`; despesa: `saldo -= valor`; se `p_debt_id`, abate `debts.valor_atual` e marca `quitada` se chegar a 0.
- `distribuir_receita(p_valor, p_rule_id, p_income_source_id, p_data, p_descricao)`
  → cria a receita e divide entre caixinhas conforme `alocacoes` (uma transaction por fatia, ou 1 transaction + N transfers). Net: saldo total += valor.
- `transferir_entre_caixinhas(p_origem, p_destino, p_valor, p_tipo, p_descricao)`
  → cria `transfer`; ajusta os dois saldos. Não muda o total.
- `registrar_negociacao(p_debt_id, p_valor_acordado, p_canal, p_obs)`
  → cria `debt_negotiation`, atualiza `debts.valor_acordado`/`valor_atual`/`status`, calcula `desconto_pct`.

Tudo dentro de transação (atomicidade). Implementar como funções `security definer` com checagem de `auth.uid()`.

---

## 5. Fórmulas e lógica

**Disponível pra gastar** = `saldo` da caixinha de `tipo = 'livre'`.

**Saldo total** = `sum(envelopes.saldo)` (excluindo `negocio` quando for "patrimônio pessoal"; incluir/excluir conforme a tela).

**Resumo de dívidas:**
- `divida_a_pagar` = `sum(valor_atual)` das dívidas com `quitada = false`.
- `pago_acumulado` = `sum(transactions.valor)` onde `tipo='despesa' and debt_id is not null`.
- `pct_quitacao` = `pago_acumulado / (pago_acumulado + divida_a_pagar)`.
- `economia_conquistada` = `sum(valor_original - coalesce(valor_acordado, valor_atual))` — métrica separada e comemorável (descontos de negociação/Desenrola).

**Simulador de quitação (com juros) — rodar no app (TypeScript), iterativo mês a mês:**
```ts
// metodo: 'avalanche' (maior juros 1º) | 'bola_de_neve' (menor saldo 1º)
function simular(dividas, aporteMensal, metodo, rendaExtra = 0) {
  let mes = 0;
  let saldos = dividas.map(d => ({ ...d }));
  const aporteTotal = aporteMensal + rendaExtra;
  while (saldos.some(d => d.valor_atual > 0) && mes < 600) {
    mes++;
    // 1) juros do mês incidem sobre cada saldo
    saldos.forEach(d => { d.valor_atual *= (1 + d.juros_mensal / 100); });
    // 2) paga parcelas mínimas de todas
    let caixa = aporteTotal;
    saldos.forEach(d => {
      const pg = Math.min(d.parcela_min, d.valor_atual);
      d.valor_atual -= pg; caixa -= pg;
    });
    // 3) joga o que sobrou na "dívida da vez"
    const fila = [...saldos].filter(d => d.valor_atual > 0).sort((a, b) =>
      metodo === 'avalanche' ? b.juros_mensal - a.juros_mensal
                             : a.valor_atual - b.valor_atual);
    for (const d of fila) {
      if (caixa <= 0) break;
      const pg = Math.min(caixa, d.valor_atual);
      d.valor_atual -= pg; caixa -= pg;
    }
  }
  return { meses: mes, dataPrevista: addMonths(hoje, mes) };
}
```
Cenário comparativo: rodar de novo com `rendaExtra` > 0 (ex.: +1 cliente de assessoria) e mostrar a diferença de meses.

**Projeção dos próximos N meses:** para cada mês futuro,
`entradas_previstas (fixas + média/estimativa das variáveis) − saídas_previstas (recurring_expenses + parcelas mínimas + aportes) = saldo_projetado`. Sinalizar meses negativos.

**Alertas (computados no painel):**
- Janela Desenrola aberta (ver §7) + nº de dívidas elegíveis.
- Mês futuro projetado negativo.
- Gasto variável do mês acima da média dos últimos 3 meses.
- Dívida `acumulando` (ex.: mensalidade não paga crescendo).

---

## 6. Telas do v1 (mobile-first, navegação inferior estilo app)

Abas: **Painel · Lançar · Dívidas · Plano**.

1. **Painel (home)** — herói "Disponível pra gastar" (caixinha Livre) grande, com a quebra (saldo total − fixas a pagar − dívida − reserva). Card "Missão: sair das dívidas" (dívida total, % quitação, anel de progresso, data prevista). Medidor de saúde financeira (mascote/humor, inspirado na capivara, mas original). Faixa de alertas.
2. **Lançar** — entrada em < 5s: valor + descrição + toggle Receita/Despesa; categoria adivinhada por palavra-chave; botões rápidos das categorias mais usadas. Receita variável dispara "distribuir nas caixinhas?". Lista dos lançamentos do mês (editar/excluir).
3. **Dívidas** — lista ordenável (Avalanche ⇄ Bola de neve); cada dívida com credor, titular, saldo, badge de status, selo Desenrola. Toque abre: registrar pagamento, registrar negociação, editar. No topo, o **simulador** (aporte → meses + cenário "renda +R$Y").
4. **Plano** — cadastro de rendas (fixas + variáveis), despesas fixas, caixinhas + regras de distribuição, meta da reserva, projeção dos próximos 3 meses, backup/exportar JSON.

**Microcopy:** voz ativa, sentence case, nomes pelo que o usuário controla. Erros explicam o que fazer. Tela vazia é convite à ação ("Cadastre sua primeira dívida pra ver o plano de quitação").

---

## 7. Camada Desenrola (tem prazo)

O Novo Desenrola Brasil foi relançado em 04/05/2026, com duração de 90 dias (janela ~até início de agosto/2026). Regras que o app deve refletir nos `debts` e no módulo de negociação:

- Renda até 5 salários mínimos (R$ 8.105). Descontos de 30% a 90% conforme tipo/tempo de atraso.
- Entram: cartão de crédito, cheque especial, crédito pessoal — contratados até 31/01/2026, atrasados entre 91 dias e 2 anos. → marcar `elegivel_desenrola = true` quando bater nesses critérios.
- **Não entram:** financiamento de veículo, imobiliário, energia/água/telefonia, tributos, consignado INSS.
- Juros do novo contrato: máx 1,99% a.m., até 48 meses, 1ª parcela em 35 dias, limite R$ 15 mil por pessoa/instituição.
- Renegociação direto no canal do banco (não há app do governo); o desconto exato aparece na negociação.
- Pode usar 20% do FGTS ou R$ 1.000 (o maior) para abater.

Módulo "Central de Negociação": lista dívidas `elegivel_desenrola`, mostra contagem regressiva da janela e registra oferta/acordo/desconto (alimenta `economia_conquistada`). Observação: dívida no nome de terceiro é negociada pelo CPF do titular e conta no limite dele.

> Não é aconselhamento financeiro: os números orientam; condição real e decisão saem na negociação com cada instituição.

---

## 8. Seeds (defaults neutros — nada pessoal)

- Caixinhas: `Fixas`, `Dívidas`, `Reserva`, `Livre` (+ deixar `Negócio` opcional).
- Categorias de despesa (com emoji): Mercado, Farmácia, Ifood, Uber/Transporte, Combustível, Lazer, Energia, Água, Internet/Telefone, Aluguel, Escola, Pagamento de dívida.
- Categorias de receita: Salário, Pró-labore, Renda Extra, Serviço/Assessoria, Vendas.
- 1 regra de distribuição padrão para receita variável: 50% Dívidas / 20% Reserva / 30% Livre.
- Formas de pgto: Dinheiro, Pix, Débito, Crédito.
- **Zero** dívidas, titulares ou valores. O usuário cadastra os dele.

---

## 9. Escopo

**v1 (entregar primeiro):** auth (magic link) · lançar receita/despesa rápido · caixinhas com distribuição (manual + regra) · CRUD de dívidas (status, titular, descrição, juros, pagamento que abate o saldo, progresso) · simulador com juros · painel (disponível + dívida total + % quitação + alertas, incl. janela Desenrola) · PWA instalável · seeds neutros · RLS.

**v2+:** painel de ROI da caixinha Negócio · regras de distribuição automáticas refinadas · projeção multi-mês detalhada · média móvel da renda variável · log completo de negociação com economia · lembretes de vencimento (Web Push/e-mail) · anexar comprovantes · relatórios/gráficos · importar extrato · multi-conta.

---

## 10. Ordem de construção (para o Claude Code)

1. `create-next-app` + Tailwind + estrutura de pastas; configurar Supabase client (`@supabase/ssr`) e variáveis de ambiente.
2. Rodar o SQL (§4) no Supabase: tabelas + CHECKs + RLS + RPCs + seeds neutros.
3. Auth (magic link) + proteção de rotas; criar seeds do usuário no primeiro login.
4. Caixinhas: listar/criar/editar; tela e lógica de saldo via RPC.
5. Lançar: receita/despesa rápido + distribuição de receita variável.
6. Dívidas: CRUD + pagamento (abate saldo) + status + ordenação.
7. Simulador (TS) + cenário de renda extra.
8. Painel: disponível, missão/quitação, medidor de saúde, alertas (incl. Desenrola).
9. Plano: rendas, despesas fixas, reserva, projeção 3 meses, exportar JSON.
10. PWA: manifest + service worker + ícones; testar "Adicionar à tela inicial".
11. Deploy na Vercel.

## 11. Regras de qualidade
- RLS em todas as tabelas; saldos só mudam via RPC.
- Nenhum dado pessoal hardcoded; app compartilhável.
- Responsivo até mobile, foco de teclado visível, `prefers-reduced-motion` respeitado.
- Valores em `numeric` (nunca float binário) e formatação BRL no front.
- Datas no fuso local; "mês atual" derivado da data do lançamento.
