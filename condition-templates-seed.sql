-- =====================================================
-- System Condition Templates - Seed Data
-- Run this AFTER conditions-management-schema.sql
-- =====================================================

INSERT INTO public.condition_templates (
  title,
  description,
  category,
  loan_types,
  is_common,
  is_system_template,
  is_active,
  expected_document_types
) VALUES

-- ASSET VERIFICATION
(
  'Bank Statements - 2 Months',
  'Provide your most recent 2 months of bank statements showing all pages (including blank pages). All accounts must be included.',
  'asset-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['bank_statement']
),
(
  'Deposit Explanation',
  'Provide a written explanation and documentation for the large deposit on your bank statement. Include source of funds and any supporting documentation.',
  'asset-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['credit_explanation_letter', 'bank_statement']
),
(
  'Proof of Funds',
  'Provide documentation showing proof of available funds for down payment and closing costs.',
  'asset-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['bank_statement', 'proof_of_funds']
),

-- INCOME VERIFICATION
(
  'Pay Stubs - Recent',
  'Provide your 2 most recent pay stubs showing year-to-date earnings.',
  'income-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['pay_stub']
),
(
  'W2 Forms - 2 Years',
  'Provide W2 forms for the most recent 2 years.',
  'income-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['w2']
),
(
  'Tax Returns - 2 Years',
  'Provide complete signed federal tax returns (all schedules and pages) for the most recent 2 years.',
  'income-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['tax_return']
),
(
  '1099 Forms',
  'Provide all 1099 forms received for the most recent 2 years.',
  'income-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['1099']
),

-- EMPLOYMENT VERIFICATION
(
  'Employment Verification Letter',
  'Obtain a letter from your employer on company letterhead confirming your employment, position, salary, and start date.',
  'employment-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['employment_letter']
),
(
  'Employment Gap Explanation',
  'Provide a written explanation for the gap in employment shown on your application.',
  'employment-verification',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['credit_explanation_letter']
),

-- CREDIT EXPLANATION
(
  'Credit Inquiry Explanation',
  'Provide a written explanation for the credit inquiry shown on your credit report. Include the name of the creditor and reason for the inquiry.',
  'credit-explanation',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['credit_explanation_letter']
),
(
  'Bankruptcy Explanation',
  'Provide a written explanation of the bankruptcy including discharge date and circumstances. Include the bankruptcy discharge papers.',
  'credit-explanation',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['credit_explanation_letter', 'other']
),
(
  'Collections Account Explanation',
  'Provide a written explanation for the collections account shown on your credit report. Include current status and payment arrangements if applicable.',
  'credit-explanation',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['credit_explanation_letter']
),
(
  'Late Payment Explanation',
  'Provide a written explanation for the late payments shown on your credit report.',
  'credit-explanation',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['credit_explanation_letter']
),

-- PROPERTY DOCUMENTS
(
  'Purchase Agreement',
  'Provide a fully executed copy of the purchase agreement signed by all parties.',
  'property-documents',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['purchase_agreement']
),
(
  'Homeowners Insurance Quote',
  'Provide a quote for homeowners insurance showing adequate coverage for the property. The quote must include dwelling coverage amount, effective date, and insurance company contact information.',
  'property-documents',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['insurance_quote']
),

-- APPRAISAL
(
  'Appraisal Ordered',
  'Appraisal has been ordered and is scheduled to be completed. Once received, it will be reviewed for acceptability.',
  'appraisal',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['appraisal']
),
(
  'Appraisal Review Required',
  'The appraisal has been received and is under review. Additional documentation or clarification may be required.',
  'appraisal',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['appraisal']
),

-- HOA/CONDO DOCUMENTS
(
  'HOA Documents',
  'Provide HOA documents including: HOA contact information, monthly dues amount, master insurance policy information, and any special assessments.',
  'hoa-condo',
  ARRAY['conventional', 'fha', 'va'],
  true,
  true,
  true,
  ARRAY['hoa_documents']
),
(
  'Condo Certification',
  'Provide condominium certification from the HOA including budget, reserve study, and master insurance policy.',
  'hoa-condo',
  ARRAY['conventional', 'fha', 'va'],
  false,
  true,
  true,
  ARRAY['hoa_documents']
),

-- GIFT FUNDS
(
  'Gift Letter',
  'Provide a signed gift letter from the donor stating the gift amount, source of funds, relationship to you, and confirmation that no repayment is expected.',
  'gift-funds',
  ARRAY['conventional', 'fha', 'va'],
  true,
  true,
  true,
  ARRAY['gift_letter']
),
(
  'Proof of Gift Funds Transfer',
  'Provide documentation showing the gift funds have been transferred from the donor''s account to your account. Include bank statements from both parties showing the withdrawal and deposit.',
  'gift-funds',
  ARRAY['conventional', 'fha', 'va'],
  true,
  true,
  true,
  ARRAY['bank_statement', 'proof_of_funds']
),
(
  'Donor Bank Statements',
  'Provide the donor''s bank statements showing the availability of gift funds prior to transfer (most recent 2 months).',
  'gift-funds',
  ARRAY['conventional', 'fha', 'va'],
  false,
  true,
  true,
  ARRAY['bank_statement']
),

-- TITLE INSURANCE
(
  'Title Work Ordered',
  'Title work has been ordered and is in process. Once received, it will be reviewed for any title issues.',
  'title-insurance',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['other']
),
(
  'Title Issues Resolution',
  'Title issues have been identified and must be resolved prior to closing. Please work with the title company to address the following issues.',
  'title-insurance',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['other']
),

-- OTHER COMMON CONDITIONS
(
  'Photo Identification',
  'Provide a clear copy of a valid government-issued photo ID (driver''s license, passport, or state ID).',
  'other',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  true,
  true,
  true,
  ARRAY['photo_id']
),
(
  'Social Security Card',
  'Provide a copy of your Social Security card.',
  'other',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['photo_id']
),
(
  'Divorce Decree',
  'Provide a copy of the complete divorce decree showing the settlement of assets and liabilities.',
  'other',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['other']
),
(
  'Child Support Documentation',
  'Provide documentation of child support or alimony payments including court order and proof of payment history.',
  'other',
  ARRAY['conventional', 'fha', 'va', 'usda', 'jumbo'],
  false,
  true,
  true,
  ARRAY['other']
)

ON CONFLICT DO NOTHING;
