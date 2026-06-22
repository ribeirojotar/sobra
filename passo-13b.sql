-- ================================================================
-- PASSO 13b — Atualizar RPCs para status pendente/efetivada
-- Colar no SQL Editor do Supabase (dashboard → SQL Editor → New query)
-- ================================================================

-- 1. Atualizar registrar_lancamento: aceitar p_status e p_data_vencimento
CREATE OR REPLACE FUNCTION registrar_lancamento(
  p_tipo            text,
  p_valor           numeric,
  p_envelope_id     uuid,
  p_category_id     uuid    default null,
  p_data            date    default current_date,
  p_descricao       text    default null,
  p_forma_pgto      text    default null,
  p_debt_id         uuid    default null,
  p_status          text    default 'efetivada',
  p_data_vencimento date    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if p_status not in ('efetivada', 'pendente') then
    raise exception 'status inválido: %', p_status;
  end if;

  if p_status = 'pendente' and p_data_vencimento is null then
    raise exception 'data_vencimento obrigatório para status pendente';
  end if;

  if not exists (
    select 1 from envelopes where id = p_envelope_id and user_id = v_user
  ) then
    raise exception 'caixinha não encontrada';
  end if;

  insert into transactions (
    user_id, tipo, valor, envelope_id, category_id,
    data, descricao, forma_pgto, debt_id, status, data_vencimento
  ) values (
    v_user, p_tipo, p_valor, p_envelope_id, p_category_id,
    p_data, p_descricao, p_forma_pgto, p_debt_id, p_status, p_data_vencimento
  );

  -- Só movimenta saldo quando efetivada
  if p_status = 'efetivada' then
    if p_tipo = 'despesa' then
      update envelopes
        set saldo = saldo - p_valor
        where id = p_envelope_id and user_id = v_user;

      if p_debt_id is not null then
        update debts
          set valor_atual = greatest(0, valor_atual - p_valor)
          where id = p_debt_id and user_id = v_user;
      end if;

    elsif p_tipo = 'receita' then
      update envelopes
        set saldo = saldo + p_valor
        where id = p_envelope_id and user_id = v_user;
    end if;
  end if;
  -- pendente: nenhuma movimentação de saldo
end;
$$;

-- ----------------------------------------------------------------
-- 2. Nova RPC quitar_pendencia
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION quitar_pendencia(
  p_transaction_id uuid,
  p_envelope_id    uuid,
  p_data_efetiva   date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tx   transactions%rowtype;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_tx
    from transactions
    where id = p_transaction_id and user_id = v_user;

  if not found then raise exception 'transação não encontrada'; end if;
  if v_tx.status <> 'pendente' then raise exception 'transação não está pendente'; end if;

  if not exists (
    select 1 from envelopes where id = p_envelope_id and user_id = v_user
  ) then
    raise exception 'caixinha não encontrada';
  end if;

  -- Efetiva a transação
  update transactions
    set status      = 'efetivada',
        data        = p_data_efetiva,
        envelope_id = p_envelope_id
    where id = p_transaction_id;

  -- Movimenta saldo
  if v_tx.tipo = 'despesa' then
    update envelopes
      set saldo = saldo - v_tx.valor
      where id = p_envelope_id and user_id = v_user;

    if v_tx.debt_id is not null then
      update debts
        set valor_atual = greatest(0, valor_atual - v_tx.valor)
        where id = v_tx.debt_id and user_id = v_user;
    end if;

  elsif v_tx.tipo = 'receita' then
    update envelopes
      set saldo = saldo + v_tx.valor
      where id = p_envelope_id and user_id = v_user;
  end if;
end;
$$;

-- ----------------------------------------------------------------
-- 3. Ajustar cancelar_lancamento: pendentes só apagam (sem reverter saldo)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancelar_lancamento(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tx   transactions%rowtype;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_tx
    from transactions
    where id = p_transaction_id and user_id = v_user;

  if not found then raise exception 'transação não encontrada'; end if;

  -- Só reverte saldo se era efetivada
  if v_tx.status = 'efetivada' then
    if v_tx.tipo = 'despesa' then
      update envelopes
        set saldo = saldo + v_tx.valor
        where id = v_tx.envelope_id and user_id = v_user;

      if v_tx.debt_id is not null then
        update debts
          set valor_atual = valor_atual + v_tx.valor
          where id = v_tx.debt_id and user_id = v_user;
      end if;

    elsif v_tx.tipo = 'receita' then
      update envelopes
        set saldo = saldo - v_tx.valor
        where id = v_tx.envelope_id and user_id = v_user;
    end if;
  end if;
  -- pendente: apenas apaga, sem reverter saldo

  delete from transactions where id = p_transaction_id;
end;
$$;
