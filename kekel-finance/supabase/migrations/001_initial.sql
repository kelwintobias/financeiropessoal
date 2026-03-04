-- ============================================
-- Kekel Finance — Supabase Migration
-- ============================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,           -- 'YYYY-MM'
  limit_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, month)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Insert default categories
INSERT INTO categories (id, name, color, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alimentação', '#22c55e', true),
  ('00000000-0000-0000-0000-000000000002', 'Transporte',  '#3b82f6', true),
  ('00000000-0000-0000-0000-000000000003', 'Moradia',     '#f59e0b', true),
  ('00000000-0000-0000-0000-000000000004', 'Saúde',       '#ef4444', true),
  ('00000000-0000-0000-0000-000000000005', 'Lazer',       '#8b5cf6', true),
  ('00000000-0000-0000-0000-000000000006', 'Educação',    '#06b6d4', true),
  ('00000000-0000-0000-0000-000000000007', 'Outros',      '#6b7280', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) — open access for now (anon key)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals      ENABLE ROW LEVEL SECURITY;

-- Policies: allow full access for anon (single-user app for now)
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses"   ON expenses   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budgets"    ON budgets    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on goals"      ON goals      FOR ALL USING (true) WITH CHECK (true);
