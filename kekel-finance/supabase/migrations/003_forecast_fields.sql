-- Migration 003: Forecast fields for Kekel Finance redesign
-- Run this in Supabase Dashboard > SQL Editor

-- Cartão de crédito (única linha por usuário)
create table credit_card_config (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meu Cartão',
  closing_day int not null check (closing_day between 1 and 28),
  payment_day int not null check (payment_day between 1 and 28),
  credit_limit numeric(12,2),
  created_at timestamptz default now()
);

-- Incomes: dia de recebimento + recorrência
alter table incomes
  add column payment_day int check (payment_day between 1 and 31),
  add column is_recurring boolean not null default false;

-- Expenses: forma de pagamento
alter table expenses
  add column payment_method text not null default 'card'
  check (payment_method in ('card', 'cash'));

-- Fixed expenses: forma de pagamento
alter table fixed_expenses
  add column payment_method text not null default 'card'
  check (payment_method in ('card', 'cash'));
