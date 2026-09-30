-- ==============================================================================
-- DHRUV GORI BUDGET TRACKER - SUPABASE DATABASE SCHEMA (IMPROVISED)
-- Execute this entire file in Supabase -> SQL Editor -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Bank', 'Credit Card', 'Cash', 'Loan')),
    credit_limit NUMERIC(12,2) DEFAULT 0.00,
    opening_balance NUMERIC(12,2) DEFAULT 0.00,
    current_reconciled_balance NUMERIC(12,2) DEFAULT 0.00,
    billing_cycle_day INTEGER DEFAULT 1,
    color TEXT DEFAULT '#4f46e5',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Debt', 'Savings', 'Transfer')),
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#4f46e5',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE (With Inter-Account Transfer Support)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Income', 'Expense', 'Debt', 'Savings', 'Transfer')),
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    description TEXT DEFAULT '',
    account TEXT NOT NULL, -- Source account (or main account)
    to_account TEXT DEFAULT NULL, -- Destination account (if Internal Transfer)
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending_review', 'rejected')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gmail', 'csv_import', 'excel_import', 'gemini_ai')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions (account);

-- 5. EMI & DEBT SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS public.emi_schedule (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    original_amount NUMERIC(12,2) NOT NULL,
    monthly_emi NUMERIC(12,2) NOT NULL,
    total_tenure INTEGER NOT NULL,
    months_remaining INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    account TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MONTHLY BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id SERIAL PRIMARY KEY,
    month TEXT NOT NULL, -- Format: YYYY-MM
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Debt', 'Savings')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (month, category)
);

-- 7. SETTINGS TABLE (Rollovers, Preferences, Balances)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREDIT CARD BILLS & STATEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.card_bills (
    id SERIAL PRIMARY KEY,
    card_name TEXT NOT NULL,
    statement_date DATE,
    due_date DATE NOT NULL,
    total_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_due NUMERIC(12,2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT false,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (card_name, due_date)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write emi_schedule" ON public.emi_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write monthly_budgets" ON public.monthly_budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write card_bills" ON public.card_bills FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for Transactions (Instant updates when Gmail script or Gemini inserts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- ==============================================================================
-- DEFAULT SEED DATA (HDFC, Kotak, Cards, Dynamic Categories, EMIs)
-- ==============================================================================

INSERT INTO public.accounts (name, type, credit_limit, opening_balance, current_reconciled_balance, billing_cycle_day, color) VALUES
('HDFC Bank Account', 'Bank', 0, 26270.24, 26270.24, 1, '#004c8f'),
('Kotak Bank Account', 'Bank', 0, 10000.00, 10000.00, 1, '#ed1c24'),
('Cash', 'Cash', 0, 0, 0, 1, '#10b981'),
('American Express Credit Card', 'Credit Card', 360000.00, 1216.00, 0, 8, '#006fcf'),
('ICICI - Amazon Pay Credit Card', 'Credit Card', 120000.00, 36059.98, 0, 23, '#f59e0b'),
('ICICI - Coral Credit Card', 'Credit Card', 100000.00, 22970.60, 0, 21, '#ea580c'),
('Roar CC Rupay', 'Credit Card', 150000.00, 0.00, 0, 20, '#8b5cf6'),
('HDFC - Money Back Plus Credit Card', 'Credit Card', 69000.00, 0.00, 0, 16, '#1e40af'),
('HDFC - Pixel Play Credit Card', 'Credit Card', 15000.00, 199.00, 0, 16, '#3b82f6')
ON CONFLICT (name) DO UPDATE SET 
  opening_balance = EXCLUDED.opening_balance,
  credit_limit = EXCLUDED.credit_limit;

INSERT INTO public.emi_schedule (name, original_amount, monthly_emi, total_tenure, months_remaining, status, account) VALUES
('Watch EMI', 8418.07, 2894.67, 3, 0, 'Closed in Aug 2026', 'ICICI - Amazon Pay Credit Card'),
('Scooter Loan (L&T Finance)', 45000.00, 8265.00, 6, 0, 'Closed in July 2026', 'HDFC Bank Account'),
('iPhone 17 Pro EMI', 135000.00, 11250.00, 12, 12, 'Active (Starts Oct 2026)', 'ICICI - Coral Credit Card')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, type, icon, color) VALUES
-- Income
('Paycheck (Bismarck Salary)', 'Income', 'briefcase', '#10b981'),
('Kotak - Stock Proceeds', 'Income', 'trending-up', '#059669'),
('Dad - Reimbursed', 'Income', 'refresh-cw', '#34d399'),
('Bismarck - Reimbursed', 'Income', 'repeat', '#6ee7b7'),
('Anant - Reimbursed', 'Income', 'user-check', '#38bdf8'),
('Fuel Surcharge', 'Income', 'percent', '#a7f3d0'),
('Other Income', 'Income', 'dollar-sign', '#047857'),

-- Expense
('Food & Dining', 'Expense', 'utensils', '#f97316'),
('Fuel', 'Expense', 'fuel', '#ea580c'),
('Groceries', 'Expense', 'shopping-cart', '#fb923c'),
('Shopping', 'Expense', 'shopping-bag', '#f43f5e'),
('Entertainment', 'Expense', 'film', '#ec4899'),
('Medical', 'Expense', 'heart-pulse', '#ef4444'),
('Transport', 'Expense', 'car', '#f59e0b'),
('Vehicle Maintenance', 'Expense', 'wrench', '#d97706'),
('Household Help / Local Vendors', 'Expense', 'users', '#84cc16'),
('Family Support (Mom)', 'Expense', 'heart', '#e11d48'),
('Internet', 'Expense', 'wifi', '#06b6d4'),
('Mobile Recharge (own 2 numbers)', 'Expense', 'smartphone', '#0ea5e9'),
('Electricity (Dad-reimbursed, not tracked)', 'Expense', 'zap', '#64748b'),
('Gas (Dad-reimbursed, not tracked)', 'Expense', 'flame', '#94a3b8'),
('Life Insurance', 'Expense', 'shield-check', '#3b82f6'),
('Health Insurance', 'Expense', 'shield', '#2563eb'),
('City Garbage', 'Expense', 'trash-2', '#78716c'),
('Bank Charges', 'Expense', 'credit-card', '#a8a29e'),
('Dad - Paid', 'Expense', 'user-check', '#8b5cf6'),
('Bismarck - Paid', 'Expense', 'building', '#6366f1'),
('Anant - Paid', 'Expense', 'user', '#38bdf8'),
('Other Expense', 'Expense', 'tag', '#6b7280'),

-- Debt
('Education Loan (Sem1 Fee)', 'Debt', 'graduation-cap', '#dc2626'),
('Scooter Loan (L&T Finance)', 'Debt', 'truck', '#b91c1c'),
('Watch EMI', 'Debt', 'watch', '#991b1b'),
('Lenskart EMI', 'Debt', 'glasses', '#7f1d1d'),
('Flipkart EMI', 'Debt', 'package', '#c2410c'),
('Bike EMI', 'Debt', 'bike', '#b45309'),
('iPhone 17 Pro EMI', 'Debt', 'smartphone', '#4338ca'),

-- Savings
('Semester 2 Fee Fund (due Nov)', 'Savings', 'book-open', '#0284c7'),
('Emergency Fund', 'Savings', 'life-buoy', '#0369a1'),
('Car Fund (long-term, post-wedding)', 'Savings', 'car', '#075985'),
('Stocks', 'Savings', 'line-chart', '#15803d'),
('Mutual Funds', 'Savings', 'pie-chart', '#166534'),
('Wedding Fund', 'Savings', 'gift', '#9333ea'),

-- Transfers / Inter-Account
('Internal Transfer (Between Accounts)', 'Transfer', 'arrow-right-left', '#6366f1'),
('Card Bill Payment - American Express', 'Transfer', 'credit-card', '#3b82f6'),
('Card Bill Payment - HDFC - Money Back Plus', 'Transfer', 'credit-card', '#1d4ed8'),
('Card Bill Payment - HDFC - Pixel Play', 'Transfer', 'credit-card', '#2563eb'),
('Card Bill Payment - ICICI - Amazon Pay', 'Transfer', 'credit-card', '#f97316'),
('Card Bill Payment - ICICI - Coral', 'Transfer', 'credit-card', '#ea580c'),
('Card Bill Payment - Unity - Roar', 'Transfer', 'credit-card', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Default rollover settings
INSERT INTO public.settings (key, value) VALUES
('rollovers', '{"2026-07": 26270.24, "2026-08": 7168.67, "2026-09": 7168.67, "2026-10": 10000.00}'::jsonb)
ON CONFLICT (key) DO NOTHING;
