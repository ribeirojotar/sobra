# Adendo ao PRD — Status do Lançamento e Visão do Mês (v1.2)

Extensão do `PRD-sobra.md` + `PRD-sobra-adendo-cartao.md`. Mantém convenções: tipos do §4, RLS `own`, RPCs `security definer` com `auth.uid()`, **saldos só mudam via RPC**, BRL no front, datas locais.

> **Motivação:** o Sobra hoje só registra o que **já aconteceu**. Mas pra responder à pergunta real do usuário — *"esse mês fecha? posso assumir uma dívida no mês que vem?"* — o app precisa entender lançamentos **futuros previstos** (boletos que vão vencer, salário que vai cair). Este adendo introduz **status (pendente/efetivada)** e **data de vencimento**, e em cima disso constrói a **visão do mês** que o usuário vê no Painel (saldos Inicial/Atual/Previsto + 4 baldes de discriminação).

> **Princípio (atualiza o §5):** existem dois "saldos do mês". **Atual** = só o que efetivou de verdade (regime de caixa). **Previsto** = atual + receitas pendentes − despesas pendentes do mês (regime de competência). Os dois aparecem lado a lado no Painel; o usuário aprende a olhar pro Previsto antes de gastar.

---

## 1. Conceitos

- **Status do lançamento:**
  - `efetivada` — já entrou/saiu de verdade. Mexe em saldo. É o que o Sobra já faz hoje.
  - `pendente` — programado, ainda não aconteceu. **Não** mexe em saldo. Conta na **projeção do Previsto**.
- **Data de vencimento (`data_vencimento`)** — a data prometida. Para `pendente`, alimenta os baldes ("vencidas", "próximo do vencimento"). Para `efetivada`, é a data em que de fato ocorreu (na prática, o app preenche junto com `data`).
- **Quitar pendência** — ação que converte `pendente` → `efetivada`. É o momento em que o dinheiro de fato mexe (entra/sai da caixinha).
- **4 baldes de discriminação do mês** (no Painel):
  - **Efetivadas** — `status='efetivada'` no mês.
  - **Próximo do vencimento** — `pendente` com vencimento entre **hoje** e **hoje + 7 dias**.
  - **Vencidas** — `pendente` com vencimento **antes de hoje**.
  - **Distantes** — `pendente` com vencimento **depois de hoje + 7 dias**, ainda no mês.

> Nota sobre cartão: as **parcelas em fatura** (`card_installments`) já têm "vencimento" implícito (a `competencia`). Tratá-las como `pendente` global criaria dupla contagem — então o **fatura/Pagar Fatura continua sendo o caminho** delas. Os baldes acima são só sobre `transactions`.

---

## 2. Modelo de dados (alteração mínima em `transactions`)

```sql
alter table transactions
  add column status text not null default 'efetivada'
    check (status in ('efetivada','pendente')),
  add column data_vencimento date;

-- defaults p/ não quebrar dados antigos
update transactions set data_vencimento = data where data_vencimento is null;

create index on transactions (user_id, status, data_vencimento);
```

Repara: **default `efetivada`** garante que tudo que existe hoje continua igual (regime de caixa, mexendo em saldo).

---

## 3. RPCs

### 3.1 `registrar_lancamento` — atualizar
Aceitar novos parâmetros `p_status` e `p_data_vencimento`. Regra:
- **`status='efetivada'`** → comportamento atual (insere transação + debita/credita caixinha como hoje, opcionalmente via distribuição).
- **`status='pendente'`** → insere a transação **sem** mexer em saldo de caixinha nem em distribuição. `data_vencimento` é obrigatório.

### 3.2 `quitar_pendencia` — nova
```
quitar_pendencia(
  p_transaction_id uuid,
  p_envelope_id uuid,          -- caixinha de onde sai/entra (default = envelope da transação)
  p_data_efetiva date          -- default = hoje
) returns void
```
Comportamento:
- Valida posse e que `status='pendente'`.
- Atualiza `status='efetivada'`, `data = p_data_efetiva`, `envelope_id = p_envelope_id` (permite escolher caixinha diferente no momento da quitação).
- **Mexe no saldo** da caixinha (debita despesa / credita receita) — mesmo efeito do `registrar_lancamento` efetivado.
- Se `debt_id` não-nulo (era pagamento de dívida pendente): abate a dívida na hora da quitação, não antes.

### 3.3 `cancelar_lancamento` — ajustar
Hoje já reverte saldo e apaga. Estender: se a transação for `pendente`, **só apaga** (não há saldo a reverter). Sem efeito colateral.

---

## 4. Fórmulas do Painel (§5 atualizado)

Para o **mês atual** (`mes_inicio`/`mes_fim`):
```
Inicial   = saldo total das caixinhas em mes_inicio
            (= saldo_atual − (receitas_efetivadas_no_mes − despesas_efetivadas_no_mes))
Atual     = saldo total das caixinhas hoje
Previsto  = Atual + receitas_pendentes_do_mes − despesas_pendentes_do_mes
```

> "Saldo total das caixinhas" = `sum(envelopes.saldo where ativo=true and tipo != 'negocio')`. O Negócio fica de fora pra não inflar o fluxo pessoal.

**Discriminação do mês** (4 baldes; sobre `transactions` do mês, despesa e receita separados):
```
Efetivadas    = Σ status='efetivada'
Próx. venc.   = Σ status='pendente' E data_vencimento ENTRE hoje E hoje+7
Vencidas      = Σ status='pendente' E data_vencimento < hoje E ainda no mês
Distantes     = Σ status='pendente' E data_vencimento > hoje+7 E ainda no mês
Total mês     = soma dos quatro
```

---

## 5. Telas e fluxos

### 5.1 Lançar (atualização)
- Novo toggle visível: **"Efetivada"** (default ON) / **"Pendente"** (OFF).
- Quando **Pendente**, revela campo **"Data de vencimento"** (obrigatório).
- Quando **Efetivada**, esconde o campo (a `data` já é a do evento).
- Crédito (cartão): continua no fluxo da fatura, **sem** esse toggle (a fatura já é a "pendência" do cartão).

### 5.2 Histórico de lançamentos
- Lançamento `pendente` aparece com **badge "Pendente"** e cor neutra (cinza/âmbar), antes dos efetivados.
- Em cada pendente, ações: **Quitar agora** (abre sheet com escolha de caixinha e data, chama `quitar_pendencia`) e **Editar/Excluir**.

### 5.3 Painel (Hero novo, substitui o herói atual)
```
┌──────────────────────────────────────────┐
│  Inicial      Atual        Previsto      │
│  R$ X         R$ Y         R$ Z          │
└──────────────────────────────────────────┘
```
**Previsto** com cor: verde se positivo, vermelho se negativo. Toque no Previsto expande a quebra (Atual + receitas pendentes − despesas pendentes).

> Mantemos o "Disponível pra gastar = Livre − faturas comprometidas" como **card abaixo** (não substitui — ele responde à pergunta diferente "quanto posso torrar HOJE sem comprometer o mês"). São números complementares: o trio em cima é o macro do mês; o disponível embaixo é o tático do dia.

### 5.4 Painel — card "Discriminação do mês"
Quatro linhas com bolinha colorida + nome + % do total + valor:
```
🟢  Efetivadas              R$ X        clique → lista
🟡  Próximo do vencimento   R$ Y
🔴  Vencidas                R$ Z
⚪  Distantes               R$ W
```
Cada linha clicável → filtra o histórico naquele estado. Cores: verde / âmbar / vermelho / cinza.

### 5.5 Alertas novos no Painel
- "Você tem R$ X em contas **vencidas** — quite ou negocie."
- "Próximos 7 dias: R$ Y a pagar. Caixa atual: R$ Z." Se Z < Y → vermelho.

---

## 6. Integração com Despesas Fixas / Rendas (semente automática)

Hoje, **Despesas Fixas** e **Rendas** são regras que só alimentam a projeção do Plano. Com este passo, elas ganham um botão "**Gerar pendências do mês**":
- Para cada renda/fixa ativa, cria uma `transaction` **pendente** com `data_vencimento` no `dia_recebimento`/`dia_vencimento` do mês atual, se ainda não existir uma equivalente (chave: origem + mês).
- Idempotente — pode ser disparado várias vezes, não duplica.
- Quando chega o dia do salário, o usuário **quita a pendência** e ela vira efetivada. Mesma coisa pra luz/aluguel.

> Isso resolve o **"quero que a conta recorrente já apareça nos meses seguintes"** da motivação inicial — só que sem materializar 12 meses por adiantado. Gera **só o mês corrente**, e renova a cada virada de mês (gatilho leve no carregamento do Painel).

---

## 7. Fora de escopo (v1.2)

- Recorrência **dentro** da transação (item de transação tipo "esta despesa repete N vezes"). Fica pro próximo passo (14), que vai unificar Despesas Fixas/Rendas com transações recorrentes.
- Projeção de 12 meses + simulador "posso me endividar?" — passo 15.
- Múltiplas contas (Carteira/Conta Corrente/Investimentos) — fase 2.
- Notificações push de vencimento — fase 2.

---

## 8. Ordem de construção

1. **SQL**: `alter table transactions` (status + data_vencimento) + índice.
2. **RPCs**: atualizar `registrar_lancamento` (aceitar status/vencimento), criar `quitar_pendencia`, ajustar `cancelar_lancamento`.
3. **Tela Lançar**: toggle Efetivada/Pendente + campo data_vencimento condicional.
4. **Histórico**: badge "Pendente", ação "Quitar agora" (sheet).
5. **Painel — Hero novo**: Inicial / Atual / Previsto (substitui herói atual; mantém "Disponível" como card abaixo).
6. **Painel — Discriminação do mês**: os 4 baldes com cores.
7. **Painel — Alertas**: vencidas e cobertura dos próximos 7 dias.
8. **Semente automática** (Despesas Fixas/Rendas → pendências do mês), com botão manual + auto na virada de mês.

> Um passo por vez, testando no SQL Editor antes da UI, no ritmo de sempre.

---

## 9. Regras de qualidade

- Default `efetivada` em transações antigas (não quebra nada).
- `pendente` **nunca** mexe em saldo de caixinha.
- `quitar_pendencia` é a **única** porta de entrada da pendente pro saldo (atomicidade).
- Idempotência da semente (não duplicar fixas/rendas no mesmo mês).
- Cartão fica fora deste fluxo (sua "pendência" é a fatura, já modelada).
