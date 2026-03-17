-- Add received_at column to incomes table
-- NULL = not yet marked as received in current billing cycle
-- Non-null = timestamp when user marked it received; compared against current cycle range
ALTER TABLE incomes ADD COLUMN received_at TIMESTAMPTZ NULL;
