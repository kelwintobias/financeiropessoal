-- Meta de saldo mensal no user_settings
alter table user_settings
  add column monthly_goal numeric(12,2) not null default 0;

-- Gastos previstos
create table planned_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  date date not null,
  payment_method text not null default 'card',
  created_at timestamptz default now()
);
