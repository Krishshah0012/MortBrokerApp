-- =====================================================
-- Conditions Management Platform - Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- 1. LOANS TABLE
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  calculator_session_id UUID REFERENCES public.calculator_sessions(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,

  -- Loan Details
  loan_number TEXT UNIQUE,
  property_address TEXT,
  loan_amount DECIMAL(12, 2) NOT NULL,
  loan_type TEXT CHECK (loan_type IN ('conventional', 'fha', 'va', 'usda', 'jumbo')) NOT NULL,
  purpose TEXT CHECK (purpose IN ('purchase', 'refinance', 'cash-out')) NOT NULL,

  -- Status & Timeline
  status TEXT CHECK (status IN (
    'pre-approval',
    'approval-received',
    'conditions-active',
    'clear-to-close',
    'closed',
    'cancelled',
    'denied'
  )) DEFAULT 'approval-received' NOT NULL,

  -- Critical Dates
  approval_date DATE,
  rate_lock_date DATE,
  rate_lock_expiration DATE NOT NULL,
  estimated_closing_date DATE,
  actual_closing_date DATE,

  -- Progress Tracking
  total_conditions INTEGER DEFAULT 0,
  completed_conditions INTEGER DEFAULT 0,
  pending_conditions INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for loans table
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_broker ON public.loans(broker_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_rate_lock_exp ON public.loans(rate_lock_expiration);


-- 2. CONDITION TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.condition_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Template Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'income-verification',
    'asset-verification',
    'credit-explanation',
    'property-documents',
    'employment-verification',
    'title-insurance',
    'appraisal',
    'hoa-condo',
    'gift-funds',
    'other'
  )) NOT NULL,

  -- Template Applicability
  loan_types TEXT[],
  is_common BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,

  -- Ownership
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_system_template BOOLEAN DEFAULT false,

  -- Expected Documents
  expected_document_types TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for condition_templates table
CREATE INDEX IF NOT EXISTS idx_condition_templates_category ON public.condition_templates(category);
CREATE INDEX IF NOT EXISTS idx_condition_templates_broker ON public.condition_templates(broker_id);


-- 3. CONDITIONS TABLE
CREATE TABLE IF NOT EXISTS public.conditions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.condition_templates(id) ON DELETE SET NULL,

  -- Condition Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,

  -- Status & Priority
  status TEXT CHECK (status IN (
    'pending',
    'in_progress',
    'submitted',
    'under_review',
    'needs_revision',
    'approved',
    'waived'
  )) DEFAULT 'pending' NOT NULL,

  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

  -- Deadlines
  due_date DATE,
  completed_date TIMESTAMP WITH TIME ZONE,

  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id),

  -- Tracking
  document_count INTEGER DEFAULT 0,
  approved_document_count INTEGER DEFAULT 0,

  -- Internal Notes (broker only)
  internal_notes TEXT,

  -- Borrower Instructions
  borrower_instructions TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure logical status flow
  CONSTRAINT valid_completion CHECK (
    (status != 'approved' AND completed_date IS NULL) OR
    (status = 'approved' AND completed_date IS NOT NULL)
  )
);

-- Indexes for conditions table
CREATE INDEX IF NOT EXISTS idx_conditions_loan ON public.conditions(loan_id);
CREATE INDEX IF NOT EXISTS idx_conditions_status ON public.conditions(status);
CREATE INDEX IF NOT EXISTS idx_conditions_assigned ON public.conditions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conditions_due_date ON public.conditions(due_date);


-- 4. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  condition_id UUID REFERENCES public.conditions(id) ON DELETE CASCADE NOT NULL,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,

  -- File Information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,

  -- Document Classification
  document_type TEXT CHECK (document_type IN (
    'bank_statement',
    'pay_stub',
    'w2',
    'tax_return',
    '1099',
    'employment_letter',
    'credit_explanation_letter',
    'appraisal',
    'purchase_agreement',
    'hoa_documents',
    'gift_letter',
    'proof_of_funds',
    'insurance_quote',
    'photo_id',
    'other'
  )),

  -- Review Status
  status TEXT CHECK (status IN (
    'uploaded',
    'pending_review',
    'approved',
    'rejected',
    'superseded'
  )) DEFAULT 'uploaded' NOT NULL,

  -- Review Details
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Version Control
  version INTEGER DEFAULT 1,
  replaces_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_condition ON public.documents(condition_id);
CREATE INDEX IF NOT EXISTS idx_documents_loan ON public.documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);


-- 5. CONDITION COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.condition_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  condition_id UUID REFERENCES public.conditions(id) ON DELETE CASCADE NOT NULL,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Comment Content
  content TEXT NOT NULL,

  -- Comment Type
  is_internal BOOLEAN DEFAULT false,

  -- Mentions/Notifications
  mentioned_users UUID[],

  -- Attachments
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for condition_comments table
CREATE INDEX IF NOT EXISTS idx_condition_comments_condition ON public.condition_comments(condition_id);
CREATE INDEX IF NOT EXISTS idx_condition_comments_loan ON public.condition_comments(loan_id);
CREATE INDEX IF NOT EXISTS idx_condition_comments_author ON public.condition_comments(author_id);


-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Recipient
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Notification Details
  type TEXT CHECK (type IN (
    'condition_assigned',
    'condition_updated',
    'document_uploaded',
    'document_reviewed',
    'comment_mention',
    'deadline_approaching',
    'status_changed',
    'loan_created'
  )) NOT NULL,

  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related Entities
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES public.conditions(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.condition_comments(id) ON DELETE CASCADE,

  -- Action URL
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);


-- 7. ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Activity Details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Change Details
  description TEXT NOT NULL,
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for activity_log table
CREATE INDEX IF NOT EXISTS idx_activity_log_loan ON public.activity_log(loan_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);


-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;


-- LOANS TABLE POLICIES
CREATE POLICY "Borrowers can view own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = borrower_id);

CREATE POLICY "Brokers can view assigned loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create loans"
  ON public.loans FOR INSERT
  WITH CHECK (
    auth.uid() = broker_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_type = 'broker'
    )
  );

CREATE POLICY "Brokers can update assigned loans"
  ON public.loans FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete assigned loans"
  ON public.loans FOR DELETE
  USING (auth.uid() = broker_id);


-- CONDITION TEMPLATES POLICIES
CREATE POLICY "Users can view system templates"
  ON public.condition_templates FOR SELECT
  USING (is_system_template = true AND is_active = true);

CREATE POLICY "Brokers can view own templates"
  ON public.condition_templates FOR SELECT
  USING (broker_id = auth.uid());

CREATE POLICY "Brokers can create templates"
  ON public.condition_templates FOR INSERT
  WITH CHECK (
    broker_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_type = 'broker'
    )
  );

CREATE POLICY "Brokers can update own templates"
  ON public.condition_templates FOR UPDATE
  USING (broker_id = auth.uid());


-- CONDITIONS POLICIES
CREATE POLICY "Borrowers can view loan conditions"
  ON public.conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = conditions.loan_id
      AND loans.borrower_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can view assigned loan conditions"
  ON public.conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = conditions.loan_id
      AND loans.broker_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can insert conditions"
  ON public.conditions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = conditions.loan_id
      AND loans.broker_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can update conditions"
  ON public.conditions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = conditions.loan_id
      AND loans.broker_id = auth.uid()
    )
  );

CREATE POLICY "Borrowers can update assigned conditions"
  ON public.conditions FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = conditions.loan_id
      AND loans.borrower_id = auth.uid()
    )
  );


-- DOCUMENTS POLICIES
CREATE POLICY "Users can view loan documents"
  ON public.documents FOR SELECT
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = documents.loan_id
      AND (loans.borrower_id = auth.uid() OR loans.broker_id = auth.uid())
    )
  );

CREATE POLICY "Borrowers can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = documents.loan_id
      AND loans.borrower_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = documents.loan_id
      AND loans.broker_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can update document status"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = documents.loan_id
      AND loans.broker_id = auth.uid()
    )
  );


-- CONDITION COMMENTS POLICIES
CREATE POLICY "Users can view loan comments"
  ON public.condition_comments FOR SELECT
  USING (
    (is_internal = false OR author_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = condition_comments.loan_id
      AND (loans.borrower_id = auth.uid() OR loans.broker_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON public.condition_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = condition_comments.loan_id
      AND (loans.borrower_id = auth.uid() OR loans.broker_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.condition_comments FOR UPDATE
  USING (author_id = auth.uid());


-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());


-- ACTIVITY LOG POLICIES
CREATE POLICY "Users can view loan activity"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = activity_log.loan_id
      AND (loans.borrower_id = auth.uid() OR loans.broker_id = auth.uid())
    )
  );


-- =====================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to recalculate loan progress
CREATE OR REPLACE FUNCTION update_loan_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.loans
  SET
    total_conditions = (
      SELECT COUNT(*) FROM public.conditions WHERE loan_id = COALESCE(NEW.loan_id, OLD.loan_id)
    ),
    completed_conditions = (
      SELECT COUNT(*) FROM public.conditions
      WHERE loan_id = COALESCE(NEW.loan_id, OLD.loan_id) AND status = 'approved'
    ),
    pending_conditions = (
      SELECT COUNT(*) FROM public.conditions
      WHERE loan_id = COALESCE(NEW.loan_id, OLD.loan_id) AND status NOT IN ('approved', 'waived')
    ),
    progress_percentage = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE status IN ('approved', 'waived'))::DECIMAL /
          NULLIF(COUNT(*), 0) * 100)::NUMERIC, 0
        ), 0
      )
      FROM public.conditions WHERE loan_id = COALESCE(NEW.loan_id, OLD.loan_id)
    ),
    updated_at = timezone('utc'::text, now())
  WHERE id = COALESCE(NEW.loan_id, OLD.loan_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on condition changes
DROP TRIGGER IF EXISTS trigger_update_loan_progress ON public.conditions;
CREATE TRIGGER trigger_update_loan_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.conditions
  FOR EACH ROW EXECUTE FUNCTION update_loan_progress();


-- Function to update condition document counts
CREATE OR REPLACE FUNCTION update_condition_document_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conditions
  SET
    document_count = (
      SELECT COUNT(*) FROM public.documents
      WHERE condition_id = COALESCE(NEW.condition_id, OLD.condition_id)
      AND status != 'superseded'
    ),
    approved_document_count = (
      SELECT COUNT(*) FROM public.documents
      WHERE condition_id = COALESCE(NEW.condition_id, OLD.condition_id)
      AND status = 'approved'
    ),
    updated_at = timezone('utc'::text, now())
  WHERE id = COALESCE(NEW.condition_id, OLD.condition_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on document changes
DROP TRIGGER IF EXISTS trigger_update_condition_document_count ON public.documents;
CREATE TRIGGER trigger_update_condition_document_count
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_condition_document_count();


-- Function to log condition activity
CREATE OR REPLACE FUNCTION log_condition_activity()
RETURNS TRIGGER AS $$
DECLARE
  action_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_description := 'Condition created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    action_description := 'Condition status changed from ' || OLD.status || ' to ' || NEW.status;
  ELSIF TG_OP = 'DELETE' THEN
    action_description := 'Condition deleted: ' || OLD.title;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_log (
    loan_id, user_id, action, entity_type, entity_id, description
  ) VALUES (
    COALESCE(NEW.loan_id, OLD.loan_id),
    auth.uid(),
    LOWER(TG_OP || '_condition'),
    'condition',
    COALESCE(NEW.id, OLD.id),
    action_description
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for activity logging
DROP TRIGGER IF EXISTS trigger_log_condition_activity ON public.conditions;
CREATE TRIGGER trigger_log_condition_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.conditions
  FOR EACH ROW EXECUTE FUNCTION log_condition_activity();


-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_loan_id UUID DEFAULT NULL,
  p_condition_id UUID DEFAULT NULL,
  p_document_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, loan_id, condition_id, document_id, action_url
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_loan_id, p_condition_id, p_document_id, p_action_url
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS set_updated_at_loans ON public.loans;
CREATE TRIGGER set_updated_at_loans
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_condition_templates ON public.condition_templates;
CREATE TRIGGER set_updated_at_condition_templates
  BEFORE UPDATE ON public.condition_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_conditions ON public.conditions;
CREATE TRIGGER set_updated_at_conditions
  BEFORE UPDATE ON public.conditions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_documents ON public.documents;
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_condition_comments ON public.condition_comments;
CREATE TRIGGER set_updated_at_condition_comments
  BEFORE UPDATE ON public.condition_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =====================================================
-- SUPABASE STORAGE SETUP
-- (Run in Supabase SQL Editor)
-- =====================================================

-- Create storage bucket for loan documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for loan-documents bucket
CREATE POLICY "Users can upload loan documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'loan-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own loan documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'loan-documents' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.documents d
        JOIN public.loans l ON d.loan_id = l.id
        WHERE d.file_path = name
        AND (l.borrower_id = auth.uid() OR l.broker_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'loan-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'loan-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
