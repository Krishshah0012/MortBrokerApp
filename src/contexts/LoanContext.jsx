import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const LoanContext = createContext({});

export const useLoan = () => {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error('useLoan must be used within LoanProvider');
  }
  return context;
};

export const LoanProvider = ({ children }) => {
  const [currentLoan, setCurrentLoan] = useState(null);
  const [loans, setLoans] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all loans for current user (broker or borrower)
  const fetchLoans = useCallback(async (userId, userProfile) => {
    setLoading(true);
    try {
      let query = supabase
        .from('loans')
        .select(`
          *,
          borrower:profiles!borrower_id(id, full_name, email),
          broker:profiles!broker_id(id, full_name, email, company_name)
        `)
        .order('created_at', { ascending: false });

      // Filter based on account type
      if (userProfile?.account_type === 'broker') {
        query = query.eq('broker_id', userId);
      } else {
        query = query.eq('borrower_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLoans(data || []);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching loans:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single loan with full details
  const fetchLoan = useCallback(async (loanId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:profiles!borrower_id(id, full_name, email, phone),
          broker:profiles!broker_id(id, full_name, email, company_name, phone)
        `)
        .eq('id', loanId)
        .single();

      if (error) throw error;
      setCurrentLoan(data);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching loan:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new loan
  const createLoan = useCallback(async (loanData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .insert([loanData])
        .select(`
          *,
          borrower:profiles!borrower_id(id, full_name, email),
          broker:profiles!broker_id(id, full_name, email, company_name)
        `)
        .single();

      if (error) throw error;

      // Add to loans list
      setLoans(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating loan:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update loan
  const updateLoan = useCallback(async (loanId, updates) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .update(updates)
        .eq('id', loanId)
        .select()
        .single();

      if (error) throw error;

      // Update in current loan if it's the same
      if (currentLoan?.id === loanId) {
        setCurrentLoan(data);
      }

      // Update in loans list
      setLoans(prev => prev.map(loan => loan.id === loanId ? data : loan));

      return { data, error: null };
    } catch (error) {
      console.error('Error updating loan:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [currentLoan]);

  // Fetch conditions for a loan
  const fetchConditions = useCallback(async (loanId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conditions')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConditions(data || []);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching conditions:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create condition
  const createCondition = useCallback(async (conditionData) => {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .insert([conditionData])
        .select()
        .single();

      if (error) throw error;

      // Add to conditions list
      setConditions(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating condition:', error);
      return { data: null, error };
    }
  }, []);

  // Update condition
  const updateCondition = useCallback(async (conditionId, updates) => {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .update(updates)
        .eq('id', conditionId)
        .select()
        .single();

      if (error) throw error;

      // Update in conditions list
      setConditions(prev => prev.map(cond => cond.id === conditionId ? data : cond));

      return { data, error: null };
    } catch (error) {
      console.error('Error updating condition:', error);
      return { data: null, error };
    }
  }, []);

  // Fetch documents for a condition
  const fetchDocuments = useCallback(async (conditionId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          uploaded_by_profile:profiles!uploaded_by(id, full_name, email)
        `)
        .eq('condition_id', conditionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { data: null, error };
    }
  }, []);

  const value = {
    currentLoan,
    loans,
    conditions,
    documents,
    loading,
    setCurrentLoan,
    fetchLoans,
    fetchLoan,
    createLoan,
    updateLoan,
    fetchConditions,
    createCondition,
    updateCondition,
    fetchDocuments,
  };

  return <LoanContext.Provider value={value}>{children}</LoanContext.Provider>;
};
