-- Seed: categoria "Cartão" para gastos automáticos da fatura
INSERT INTO categories (name, color, is_default)
SELECT 'Cartão', '#6366f1', true
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Cartão'
);
