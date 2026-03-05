-- Migration 004: Manual balances
-- Fatura manual salva junto ao cartão
alter table credit_card_config
  add column current_bill numeric(12,2) not null default 0;

-- Saldo da conta (linha única)
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  account_balance numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);
