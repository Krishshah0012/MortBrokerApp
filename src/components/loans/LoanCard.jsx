import { useNavigate } from 'react-router-dom';
import { Home, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export const LoanCard = ({ loan }) => {
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilExpiration = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const expiration = new Date(dateString);
    const diffTime = expiration - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pre-approval': 'bg-gray-100 text-gray-700',
      'approval-received': 'bg-blue-100 text-blue-700',
      'conditions-active': 'bg-yellow-100 text-yellow-700',
      'clear-to-close': 'bg-green-100 text-green-700',
      'closed': 'bg-green-600 text-white',
      'cancelled': 'bg-red-100 text-red-700',
      'denied': 'bg-red-600 text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pre-approval': 'Pre-Approval',
      'approval-received': 'Approval Received',
      'conditions-active': 'Conditions Active',
      'clear-to-close': 'Clear to Close',
      'closed': 'Closed',
      'cancelled': 'Cancelled',
      'denied': 'Denied',
    };
    return labels[status] || status;
  };

  const daysUntilExpiration = getDaysUntilExpiration(loan.rate_lock_expiration);
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <div
      onClick={() => navigate(`/loans/${loan.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {loan.property_address || 'No address provided'}
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            Loan #{loan.loan_number || loan.id.slice(0, 8)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
          {getStatusLabel(loan.status)}
        </span>
      </div>

      {/* Loan Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Loan Amount</p>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(loan.loan_amount)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Loan Type</p>
          <p className="text-sm font-medium text-gray-900 uppercase">{loan.loan_type}</p>
        </div>
      </div>

      {/* Borrower/Broker Info */}
      <div className="border-t border-gray-100 pt-4 mb-4">
        <p className="text-sm text-gray-500">Borrower</p>
        <p className="text-sm font-medium text-gray-900">
          {loan.borrower?.full_name || loan.borrower?.email || 'Unknown'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-indigo-600">{loan.progress_percentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${loan.progress_percentage || 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{loan.completed_conditions || 0} of {loan.total_conditions || 0} conditions complete</span>
        </div>
      </div>

      {/* Rate Lock Expiration */}
      {loan.rate_lock_expiration && (
        <div className={`flex items-center gap-2 text-sm ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-600'}`}>
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {isExpired ? (
              `Rate lock expired ${Math.abs(daysUntilExpiration)} days ago`
            ) : (
              `${daysUntilExpiration} days until rate lock expires`
            )}
          </span>
        </div>
      )}
    </div>
  );
};
