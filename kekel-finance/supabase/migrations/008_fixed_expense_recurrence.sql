-- Migration: 008_fixed_expense_recurrence
-- Adds weekly recurrence fields to fixed_expenses
ALTER TABLE fixed_expenses
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('weekdays', 'specific')),
  ADD COLUMN IF NOT EXISTS recurrence_weekdays INTEGER[],
  ADD COLUMN IF NOT EXISTS recurrence_dates TEXT[];
