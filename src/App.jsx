import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoanProvider } from './contexts/LoanContext';
import { Navigation } from './components/Navigation';
import CalculatorPage from './pages/CalculatorPage';
import LoansPage from './pages/LoansPage';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Broker-only Route wrapper component
const BrokerRoute = ({ children }) => {
  // For now, we'll just render the children
  // TODO: Add broker role check when building broker features
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <LoanProvider>
            <Navigation />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<CalculatorPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />

              {/* Protected routes */}
              <Route path="/loans" element={<ProtectedRoute><LoansPage /></ProtectedRoute>} />
              {/* TODO: Add these as features are built
              <Route path="/loans/:loanId" element={<ProtectedRoute><LoanDetailsPage /></ProtectedRoute>} />
              <Route path="/loans/:loanId/conditions" element={<ProtectedRoute><ConditionsPage /></ProtectedRoute>} />
              <Route path="/loans/:loanId/conditions/:conditionId" element={<ProtectedRoute><ConditionDetailPage /></ProtectedRoute>} />
              <Route path="/templates" element={<BrokerRoute><TemplateLibrary /></BrokerRoute>} />
              */}

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LoanProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
