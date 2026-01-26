-- MortBrokerApp Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  account_type TEXT CHECK (account_type IN ('buyer', 'broker', 'admin')) DEFAULT 'buyer',

  -- Broker-specific fields
  company_name TEXT,
  nmls_number TEXT,
  license_states TEXT[],
  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Calculator Sessions table
CREATE TABLE IF NOT EXISTS public.calculator_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Property Basics
  zip_code TEXT,
  state TEXT,
  county TEXT,
  occupancy TEXT,
  property_type TEXT,
  purchase_intent TEXT,
  target_purchase_price DECIMAL(12, 2),
  purchase_timeline TEXT,
  has_property_identified BOOLEAN DEFAULT false,
  under_contract BOOLEAN DEFAULT false,

  -- Income
  annual_income DECIMAL(12, 2),
  other_monthly_income DECIMAL(12, 2),
  employment_type TEXT,
  years_in_field DECIMAL(4, 1),
  employment_years DECIMAL(4, 1),
  self_employed_years TEXT,
  income_needs_averaging BOOLEAN DEFAULT false,
  employment_gaps BOOLEAN DEFAULT false,

  -- Co-Borrower
  co_borrower BOOLEAN DEFAULT false,
  co_borrower_annual_income DECIMAL(12, 2),
  co_borrower_credit_score TEXT,
  co_borrower_monthly_debts DECIMAL(10, 2),

  -- Debts
  monthly_debts DECIMAL(10, 2),
  student_loans_included BOOLEAN DEFAULT false,
  student_loan_payment DECIMAL(10, 2),
  child_support_alimony DECIMAL(10, 2),

  -- Credit
  credit_score TEXT,
  bankruptcy BOOLEAN DEFAULT false,
  late_payments BOOLEAN DEFAULT false,
  collections BOOLEAN DEFAULT false,

  -- Borrower Profile
  citizenship_status TEXT,
  first_time_homebuyer BOOLEAN DEFAULT false,
  veteran_eligible BOOLEAN DEFAULT false,
  currently_own_home BOOLEAN DEFAULT false,
  current_mortgage_balance DECIMAL(12, 2),
  current_mortgage_payment DECIMAL(10, 2),
  current_home_disposition TEXT,

  -- Real Estate Owned
  investment_properties_owned INTEGER DEFAULT 0,
  rental_income DECIMAL(10, 2),
  rental_mortgages DECIMAL(10, 2),

  -- Down Payment & Assets
  down_payment DECIMAL(12, 2),
  down_payment_type TEXT,
  down_payment_source TEXT,
  gift_donor_relationship TEXT,
  gift_amount DECIMAL(12, 2),
  gift_letter_obtained BOOLEAN DEFAULT false,
  closing_costs DECIMAL(12, 2),
  reserves_months DECIMAL(4, 1),
  retirement_funds BOOLEAN DEFAULT false,

  -- Loan Assumptions
  interest_rate DECIMAL(5, 3),
  loan_term_years INTEGER DEFAULT 30,
  property_tax_rate DECIMAL(5, 3),
  insurance_rate DECIMAL(5, 3),
  hoa_monthly DECIMAL(10, 2),

  -- Results
  pp_score INTEGER,
  max_purchase_price_safe DECIMAL(12, 2),
  max_purchase_price_target DECIMAL(12, 2),
  max_purchase_price_stretch DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Applications table (for pre-approval submissions - Phase 2)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.calculator_sessions(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  status TEXT CHECK (status IN ('new', 'in_review', 'approved', 'denied', 'closed')) DEFAULT 'new',
  pp_score INTEGER,

  -- SSN (encrypted in production!)
  ssn_encrypted TEXT,

  -- Employment details
  employer_name TEXT,
  employer_address TEXT,
  employer_phone TEXT,

  -- Asset details
  bank_name TEXT,
  account_balance DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Calculator sessions policies
CREATE POLICY "Users can view own calculator sessions"
  ON public.calculator_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculator sessions"
  ON public.calculator_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calculator sessions"
  ON public.calculator_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculator sessions"
  ON public.calculator_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Applications policies
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Brokers can view assigned applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calculator_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
