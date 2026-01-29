import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLoan } from '../../contexts/LoanContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const CreateLoanModal = ({ isOpen, onClose, calculatorSession = null }) => {
  const { user, profile } = useAuth();
  const { createLoan } = useLoan();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    borrowerEmail: calculatorSession?.email || '',
    loanNumber: '',
    propertyAddress: '',
    loanAmount: calculatorSession?.loan_amount || '',
    loanType: 'conventional',
    purpose: 'purchase',
    rateLockExpiration: '',
    estimatedClosingDate: '',
    notes: '',
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, find or create the borrower profile
      let borrowerId;

      const { data: borrowerData, error: borrowerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.borrowerEmail)
        .single();

      if (borrowerError && borrowerError.code !== 'PGRST116') {
        throw new Error('Error finding borrower');
      }

      if (borrowerData) {
        borrowerId = borrowerData.id;
      } else {
        // Borrower doesn't exist yet
        showError('Borrower must have an account first. Ask them to sign up.');
        setLoading(false);
        return;
      }

      // Create the loan
      const loanData = {
        borrower_id: borrowerId,
        broker_id: user.id,
        calculator_session_id: calculatorSession?.id || null,
        loan_number: formData.loanNumber || null,
        property_address: formData.propertyAddress,
        loan_amount: parseFloat(formData.loanAmount),
        loan_type: formData.loanType,
        purpose: formData.purpose,
        status: 'approval-received',
        approval_date: new Date().toISOString().split('T')[0],
        rate_lock_expiration: formData.rateLockExpiration,
        estimated_closing_date: formData.estimatedClosingDate || null,
        notes: formData.notes || null,
      };

      const { data: newLoan, error: loanError } = await createLoan(loanData);

      if (loanError) throw loanError;

      success('Loan created successfully!');
      onClose();
      navigate(`/loans/${newLoan.id}`);
    } catch (err) {
      console.error('Create loan error:', err);
      showError(err.message || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Loan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Borrower Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Borrower Email *
            </label>
            <input
              type="email"
              value={formData.borrowerEmail}
              onChange={(e) => updateField('borrowerEmail', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="borrower@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">Borrower must have an existing account</p>
          </div>

          {/* Loan Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Number (Optional)
            </label>
            <input
              type="text"
              value={formData.loanNumber}
              onChange={(e) => updateField('loanNumber', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., LN-2024-001"
            />
          </div>

          {/* Property Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Address *
            </label>
            <input
              type="text"
              value={formData.propertyAddress}
              onChange={(e) => updateField('propertyAddress', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="123 Main St, City, State ZIP"
            />
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => updateField('loanAmount', e.target.value)}
                required
                min="0"
                step="1000"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="500000"
              />
            </div>
          </div>

          {/* Loan Type & Purpose */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Type *
              </label>
              <select
                value={formData.loanType}
                onChange={(e) => updateField('loanType', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="conventional">Conventional</option>
                <option value="fha">FHA</option>
                <option value="va">VA</option>
                <option value="usda">USDA</option>
                <option value="jumbo">Jumbo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="purchase">Purchase</option>
                <option value="refinance">Refinance</option>
                <option value="cash-out">Cash-Out Refinance</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Lock Expiration *
              </label>
              <input
                type="date"
                value={formData.rateLockExpiration}
                onChange={(e) => updateField('rateLockExpiration', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Est. Closing Date
              </label>
              <input
                type="date"
                value={formData.estimatedClosingDate}
                onChange={(e) => updateField('estimatedClosingDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Any internal notes about this loan..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
