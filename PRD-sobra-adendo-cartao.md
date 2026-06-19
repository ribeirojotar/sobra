# Adendo ao PRD — Módulo Cartão de Crédito (v1.1)

Extensão do `PRD-sobra.md`. Mantém todas as convenções do §4 (mesmos tipos, RLS `own`, RPCs `security definer` com checagem de `auth.uid()`, saldos só mudam via RPC). Este adendo **substitui** o comportamento atual de "despesa no crédito" e **atualiza** a fórmula do número-herói do painel (§5) e a projeção.

> **Motivação:** ~80% dos gastos do dono são no cartão de crédito. Logo o cartão não é exceção — é a espinha dorsal do fluxo de caixa. O modelo atual (toda despesa debita uma caixinha na hora) está errado para esse uso, porque o cartão tem **descompasso de tempo**: gasta agora, o dinheiro só sai na fatura.

> **Princípio (atualiza o §5):** o "disponível pra gastar" deixa de ser só o saldo da caixinha `Livre` e passa a ser **`Livre − faturas comprometidas`**. Assim cada compra no crédito **encolhe o número na hora**, sem o usuário precisar mover dinheiro entre caixinhas a cada compra.

---

## 1. Modelo escolhido: pragmático (sem reserva por compra)

- Compra no crédito **NÃO debita caixinha** no ato. Ela vira **parcela(s)** dentro de uma **fatura**.
- O caixa só se move **ao pagar a fatura** (um único lançamento de despesa que debita a caixinha).
- O painel desconta as **faturas comprometidas** do "disponível", então a honestidade comportamental vem do número-herói, não de fricção por compra.
- **Cartão pago em dia = fluxo de caixa. Cartão estourado (rotativo) = dívida** — e o rotativo cai no módulo de Dívidas/Avalanche/Simulador/Desenrola que já existe (§4–§7 do PRD). O app modela o ciclo inteiro e mostra a fronteira onde um vira o outro.

Descartado: o modelo "rígido" estilo YNAB (reservar dinheiro de verdade da `Livre` para uma caixinha "Fatura" a cada compra). Com 80% das compras no crédito, isso seria fricção demais.

---

## 2. Conceitos

- **Cartão** — conta com limite e vencimento. O usuário cadastra os dele.
- **Compra no crédito** — à vista (1x) ou parcelada (Nx). Vive em `card_purchases`; **não toca saldo**.
- **Parcela (`card_installment`)** — cada fração mensal de uma compra, com **competência** (mês de vencimento) e status (`em_aberto`/`paga`). À vista = 1 parcela.
- **Fatura** — conjunto de parcelas de uma mesma competência num cartão. Não é tabela: é uma **consulta agregada** sobre `card_installments`.
  - **Fatura comprometida** (a que pesa no "disponível") = parcelas `em_aberto` com competência **até o próximo vencimento** (ver §5).
  - **Faturas futuras (agendadas)** = parcelas com competência mais à frente → aparecem na **projeção**, não no "disponível".
- **Pagar fatura** — evento de caixa: debita uma caixinha, marca as parcelas como pagas. Pagamento parcial → o restante vira **dívida (rotativo)**.

---

## 3. Modelo de dados (segue convenções do §4)

```sql
-- CARTÕES
create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,                              -- "Nubank", "Inter Black"
  limite numeric(14,2) not null default 0,
  dia_fechamento int,                              -- opcional no v1 (1-31)
  dia_vencimento int,                              -- opcional no v1 (1-31)
  juros_rotativo numeric(6,4) not null default 0,  -- % a.m. se não pagar a fatura toda
  cor text,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- COMPRAS NO CRÉDITO (não mexem em saldo; geram parcelas)
create table card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  descricao text,
  category_id uuid references categories(id) on delete set null,
  valor_total numeric(14,2) not null,
  parcelas int not null default 1 check (parcelas >= 1),
  data_compra date not null default current_date,
  created_at timestamptz default now()
);

-- PARCELAS (uma linha por parcela; é o que vira fatura e projeção)
create table card_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purchase_id uuid not null references card_purchases(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  numero int not null,                             -- 1..N
  valor numeric(14,2) not null,
  competencia date not null,                       -- 1º dia do mês de vencimento (ex.: 2026-07-01)
  status text not null default 'em_aberto'
    check (status in ('em_aberto','paga')),
  paga_em date,
  transaction_id uuid references transactions(id) on delete set null,  -- a transação do pagamento da fatura
  created_at timestamptz default now()
);

create index on card_installments (user_id, card_id, competencia, status);
create index on card_installments (user_id, status, competencia);

-- RLS (mesmo par enable+policy 'own' do §4, para as 3 tabelas)
alter table cards enable row level security;
create policy own on cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table card_purchases enable row level security;
create policy own on card_purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table card_installments enable row level security;
create policy own on card_installments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Nada de seed: cartões são 100% do usuário. A forma de pagamento `Crédito` já existe nos seeds (§8).

---

## 4. RPCs (atomicidade; `security definer`; `set search_path = public`; checar `auth.uid()`)

### 4.1 `registrar_compra_cartao`
Cria a compra e materializa as N parcelas. **Não toca saldo de caixinha.**

```
registrar_compra_cartao(
  p_card_id uuid,
  p_descricao text,
  p_category_id uuid,
  p_valor_total numeric,
  p_parcelas int,
  p_data_compra date,
  p_competencia_inicial date   -- 1º dia do mês da 1ª parcela
) returns uuid                 -- purchase_id
```

Comportamento:
- Valida posse do cartão (`auth.uid()`), `p_valor_total > 0`, `p_parcelas >= 1`.
- Insere `card_purchases`.
- Divide o valor em parcelas com **arredondamento honesto**: `base = round(valor_total/parcelas, 2)` para as parcelas 1..N-1 e a **última absorve a sobra** (`valor_total − base*(N-1)`), de modo que `Σ parcelas = valor_total` exato.
- Para `i` em `1..N`: insere `card_installment` com `numero=i`, `valor` correspondente, `competencia = p_competencia_inicial + (i-1) meses`, `status='em_aberto'`.
- Retorna `purchase_id`.

Esboço:
```sql
create or replace function registrar_compra_cartao(
  p_card_id uuid, p_descricao text, p_category_id uuid,
  p_valor_total numeric, p_parcelas int, p_data_compra date, p_competencia_inicial date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_purchase uuid;
  v_base numeric(14,2);
  v_acum numeric(14,2) := 0;
  v_val numeric(14,2);
  i int;
begin
  if v_uid is null then raise exception 'sem sessão'; end if;
  if not exists (select 1 from cards where id = p_card_id and user_id = v_uid) then
    raise exception 'cartão não encontrado';
  end if;
  if coalesce(p_valor_total,0) <= 0 or coalesce(p_parcelas,0) < 1 then
    raise exception 'valor/parcelas inválidos';
  end if;

  insert into card_purchases(user_id, card_id, descricao, category_id, valor_total, parcelas, data_compra)
  values (v_uid, p_card_id, p_descricao, p_category_id, p_valor_total, p_parcelas, coalesce(p_data_compra, current_date))
  returning id into v_purchase;

  v_base := round(p_valor_total / p_parcelas, 2);
  for i in 1..p_parcelas loop
    if i < p_parcelas then v_val := v_base; v_acum := v_acum + v_base;
    else v_val := p_valor_total - v_acum; end if;   -- última absorve a sobra
    insert into card_installments(user_id, purchase_id, card_id, numero, valor, competencia, status)
    values (v_uid, v_purchase, p_card_id, i, v_val,
            (date_trunc('month', p_competencia_inicial) + ((i-1) || ' months')::interval)::date, 'em_aberto');
  end loop;
  return v_purchase;
end $$;
```

### 4.2 `pagar_fatura`
Paga a fatura comprometida de um cartão. Cria **1 transação** de despesa que debita a caixinha; marca parcelas como pagas; pagamento parcial gera dívida (rotativo).

```
pagar_fatura(
  p_card_id uuid,
  p_competencia date,     -- paga parcelas em_aberto com competência <= este mês
  p_envelope_id uuid,     -- de qual caixinha sai (default na UI: Livre)
  p_valor_pago numeric,   -- default na UI = total da fatura
  p_data date
) returns jsonb           -- { total, pago, rotativo, debt_id }
```

Comportamento:
- Soma `total` das parcelas `em_aberto` do cartão com `competencia <= p_competencia`.
- Cria `transaction` (`tipo='despesa'`, `valor = min(p_valor_pago, total)`, `envelope_id = p_envelope_id`, `forma_pgto='Fatura'`, `descricao = 'Fatura ' || nome_cartão`), e **debita `envelopes.saldo`** dessa caixinha pelo valor pago (mesma regra de integridade do §4).
- Marca todas essas parcelas como `paga` (`paga_em=p_data`, `transaction_id=` a transação criada).
- Se `p_valor_pago < total`: cria um `debt` **rotativo** com `credor = 'Rotativo ' || nome_cartão`, `valor_original = valor_atual = total − p_valor_pago`, `juros_mensal = cards.juros_rotativo`, `status='atrasado'`, `elegivel_desenrola=false` (a regra do §7 reavalia depois). Retorna `debt_id`.
- Tudo numa transação. Idempotência: como filtra `status='em_aberto'`, repetir a chamada não debita de novo.

> Nota de modelagem: parcelas com competência **futura** (parceladas ainda por vencer) **não** entram nesta fatura — continuam `em_aberto` para seus meses. Só a fatura corrente rotativiza. Isso reflete a realidade: o parcelado segue, só o que venceu e não foi pago vira rotativo.

### 4.3 `cancelar_compra_cartao`
```
cancelar_compra_cartao(p_purchase_id uuid) returns void
```
- Só permite se **nenhuma** parcela da compra estiver `paga` (senão `raise exception 'compra já faturada — estorne pela fatura'`).
- Apaga a compra (cascata apaga as parcelas `em_aberto`).
- Editar compra no v1 = cancelar + relançar.

---

## 5. Fórmulas atualizadas (substituem/estendem o §5)

**Disponível pra gastar (NOVO):**
```
disponivel = saldo(Livre) − fatura_comprometida
fatura_comprometida = Σ card_installments.valor
                      onde status='em_aberto'
                      e competencia <= (date_trunc('month', current_date) + interval '1 month')
```
Ou seja, conta o que vai pesar **até o próximo vencimento** (mês atual + o próximo). Assim a compra de hoje (que cai na próxima fatura) **já reduz o número agora**; parcelas mais distantes ficam na projeção. O painel mostra a quebra de forma transparente: `R$ X na Livre − R$ Y em faturas = R$ Z disponível`.

> Alternativa, se preferir o herói = estritamente "vencido/vencendo": trocar o limite para `competencia <= date_trunc('month', current_date)`. Recomendo a versão com `+1 mês` pelo efeito comportamental (sentir o gasto na hora).

**Fatura aberta do cartão C** = `Σ installments(card=C, em_aberto, competencia <= mês atual)`.
**Próxima fatura do cartão C** = `Σ installments(card=C, em_aberto, competencia = próximo mês)` + data de vencimento.
**Limite disponível do cartão C** = `limite − Σ installments(card=C, em_aberto)` (todas as competências).

**Projeção dos próximos N meses (ATUALIZA o §5):** somar as parcelas de cartão por mês.
```
saldo_projetado(M) = entradas(M) − recurring_expenses(M) − parcelas_min_dívidas(M)
                     − Σ card_installments(competencia = M)
```

**Alertas novos (painel):**
- "Fatura do [Cartão] vence em N dias" (usa `dia_vencimento`).
- "Fatura sem caixa pra cobrir": quando `fatura_comprometida > saldo(Livre)` → vermelho.
- "Você está parcelando demais": quando `Σ parcelas futuras` ultrapassa um teto do "disponível" (limiar a definir).

---

## 6. Telas / fluxos

**Lançar (atualizado).** Ao escolher forma **Crédito**, revelar: seletor de **Cartão**, campo **Parcelas** (`1` = à vista) e **"1ª parcela em [mês]"** (default = próximo mês, ajustável). Salvar → `registrar_compra_cartao` (não mexe em caixinha). Confirmação: *"Lançado na fatura do Nubank · 3x de R$ 100"*. As formas Dinheiro/Pix/Débito continuam no fluxo atual (`registrar_lancamento`) sem mudança.

**Histórico.** Compra no crédito aparece marcada e distinta, **sem afetar saldo**: *"🟣 Crédito · Nubank · 1/3 · na fatura de jul"*. Cash (débito/pix/dinheiro) continua como hoje.

**Cartões (nova seção em Plano, ou aba própria).** Lista de cartões; cada um mostra **fatura aberta (R$)**, vencimento, **limite usado/disponível** e botão **"Pagar fatura"**. CRUD de cartões. Tocar no cartão → detalhe: parcelas da fatura corrente + **próximas faturas (agendadas)**.

**Pagar fatura (sheet).** Mostra total da fatura aberta; campo **"valor a pagar"** (default = total); seletor de **caixinha** (default Livre); data. Se `valor < total`: aviso educativo *"o restante (R$ Y) vira rotativo a X% a.m. e vai pro seu painel de dívidas"*. Confirmar → `pagar_fatura`.

**Painel (atualizado).** Herói "Disponível pra gastar" = `Livre − faturas comprometidas`, com a micro-linha de quebra. Novo card **"Faturas"**: total a pagar nos cartões + próximo vencimento. Alertas novos do §5.

---

## 7. Conexão com Dívidas / Desenrola

O rotativo gerado por pagamento parcial entra como `debts` comum → aparece no **simulador**, na ordenação **Avalanche/Bola-de-neve** e, se envelhecer para 91 dias–2 anos (regra §7 do PRD), pode virar `elegivel_desenrola`. Resultado: o app cobre o ciclo completo **compra no crédito → fatura → (se não pagar) rotativo → dívida → negociação**.

---

## 8. Backup / Export (atualiza §9 do PRD)

Incluir no JSON: `cards`, `card_purchases`, `card_installments` (além do que já era pra incluir: categorias, distribution_rules, debt_negotiations).

---

## 9. Fora de escopo (v1.1)

- Automação de data de fechamento (definir a competência automaticamente pela `data_compra` vs `dia_fechamento`). No v1 o usuário escolhe "1ª parcela em [mês]".
- Antecipar/quitar parcelado com desconto; estorno de compra já faturada (v1: cancelar só antes de pagar).
- IOF, anuidade automática, multi-moeda, cashback, import de fatura (OFX/PDF).

---

## 10. Ordem de construção (para o Claude Code)

1. **SQL**: tabelas `cards`, `card_purchases`, `card_installments` + CHECKs + índices + RLS `own`.
2. **RPCs**: `registrar_compra_cartao`, `pagar_fatura`, `cancelar_compra_cartao`.
3. **CRUD de Cartões** (seção em Plano): cadastrar/editar/inativar; mostrar fatura aberta, limite usado, vencimento.
4. **Lançar**: forma Crédito → seletor de cartão + parcelas + "1ª parcela em [mês]"; chama `registrar_compra_cartao`; marca a compra no histórico.
5. **Fatura**: detalhe do cartão (fatura corrente + próximas) + sheet **Pagar fatura** (com aviso de rotativo→dívida).
6. **Painel**: herói = `Livre − faturas comprometidas` + quebra; card "Faturas"; alertas de vencimento/cobertura.
7. **Projeção**: somar `card_installments` por mês na projeção do §5.
8. **Export**: incluir as 3 tabelas novas.

> Construir um passo por vez, testando cada RPC no SQL Editor antes da UI (como nos passos anteriores). `/clear` entre passos, contexto no AGENTS.md.

---

## 11. Regras de qualidade (reforço)

- **Saldos só mudam via RPC.** Compra no crédito **não** muda saldo; só `pagar_fatura` muda.
- `Σ parcelas = valor_total` exato (última parcela absorve a sobra).
- `pagar_fatura` idempotente (filtra `status='em_aberto'` dentro da transação; não debita duas vezes).
- RLS nas 3 tabelas novas. `numeric` sempre; BRL no front; datas no fuso local; competência = 1º dia do mês.
- Microcopy: compra no crédito é **"lançada na fatura"**, não "gasto"; aviso de rotativo é educativo, não punitivo.
