import { useEffect, useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoan } from '../contexts/LoanContext';
import { LoanCard } from '../components/loans/LoanCard';
import { CreateLoanModal } from '../components/loans/CreateLoanModal';

const LoansPage = () => {
  const { user, profile } = useAuth();
  const { loans, fetchLoans, loading } = useLoan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user && profile) {
      fetchLoans(user.id, profile);
    }
  }, [user, profile, fetchLoans]);

  const filteredLoans = loans.filter(loan => {
    // Search filter
    const matchesSearch = !searchQuery ||
      loan.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.loan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.borrower?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.borrower?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isBroker = profile?.account_type === 'broker';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isBroker ? 'My Loans' : 'My Loan Applications'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isBroker
                  ? 'Manage all your client loans and track their progress'
                  : 'View your loan applications and upload required documents'
                }
              </p>
            </div>
            {isBroker && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Loan
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address, loan number, or borrower..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="approval-received">Approval Received</option>
                <option value="conditions-active">Conditions Active</option>
                <option value="clear-to-close">Clear to Close</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        {loans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Active</p>
              <p className="text-2xl font-bold text-yellow-600">
                {loans.filter(l => l.status === 'conditions-active').length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Clear to Close</p>
              <p className="text-2xl font-bold text-green-600">
                {loans.filter(l => l.status === 'clear-to-close').length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Closed</p>
              <p className="text-2xl font-bold text-gray-600">
                {loans.filter(l => l.status === 'closed').length}
              </p>
            </div>
          </div>
        )}

        {/* Loans List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">Loading loans...</div>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No loans match your filters'
                : isBroker
                  ? 'No loans yet. Create your first loan to get started.'
                  : 'No loan applications yet. Complete the calculator and get pre-approved to see your loans here.'
              }
            </p>
            {isBroker && !searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Loan
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLoans.map(loan => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </div>

      {/* Create Loan Modal */}
      <CreateLoanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default LoansPage;
