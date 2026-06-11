<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sobra — contexto do projeto

App pessoal de finanças (recuperação de dívidas + caixinhas). Uso pessoal, mobile-first, PWA.

## Fonte da verdade
`PRD-sobra.md` na raiz é a especificação. Sempre siga ele. A "Ordem de construção" (seção 10) define os passos; construímos UM passo por vez, com meu ok entre eles.

## Stack
Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + RLS) · Tailwind · Vercel · PWA.

## Regras invioláveis
- `envelopes.saldo` SÓ muda via RPC (registrar_lancamento, distribuir_receita, transferir_entre_caixinhas, registrar_negociacao). NUNCA dar `update ... set saldo` direto.
- RLS isola tudo por `auth.uid()`; toda query roda como o usuário logado.
- Sem dados pessoais hardcoded — app nasce vazio; seeds neutros vêm do trigger no signup.
- Valores em `numeric`; formatação BRL no front via `lib/format.ts` (`brl()`).

## Já construído
- Auth: middleware (guard + refresh), /login, /auth/callback (PKCE).
- Shell app/(app)/ com BottomNav (Painel · Lançar · Dívidas · Plano).
- Caixinhas em /plano (lista/cria/edita; toggle ativo).
- Schema + RPCs + trigger de seed já rodados no Supabase.

## Convenções
- Server Components pra leitura; Server Actions pra mutação; 'use client' só onde há interação.
- revalidatePath após mutação. Mobile-first.
## Decisões de produto
- Recorrência (pensão, prestação, fixas): v1 é MANUAL — usuário registra/confirma cada pagamento; a projeção usa parcela_min (dívidas) e recurring_expenses (fixas) pra prever os meses futuros, sem criar lançamentos. "Contas do mês" com auto-sugestão fica pra depois do núcleo.