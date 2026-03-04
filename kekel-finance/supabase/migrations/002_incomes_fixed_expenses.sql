-- ============================================
-- Kekel Finance — Migration 002: Incomes & Fixed Expenses
-- ============================================

-- Incomes table (receitas)
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'variable' CHECK (type IN ('fixed', 'variable')),
  month TEXT NOT NULL,           -- 'YYYY-MM'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fixed Expenses table (gastos fixos)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incomes_month ON incomes(month);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_active ON fixed_expenses(is_active);

-- Enable RLS
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for anon — single-user app)
CREATE POLICY "Allow all on incomes" ON incomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fixed_expenses" ON fixed_expenses FOR ALL USING (true) WITH CHECK (true);
