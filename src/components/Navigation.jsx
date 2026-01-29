import { useState } from 'react';
import { Home, LogOut, User, FileText, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Link, useLocation } from 'react-router-dom';

export const Navigation = () => {
  const { user, profile, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const openLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openSignUp = () => {
    setAuthMode('account-type');
    setShowAuthModal(true);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Home className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Mortgage Purchasing Power Calculator</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/calculator"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname === '/calculator' || location.pathname === '/'
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span className="hidden md:inline">Calculator</span>
              </Link>
              {user && (
                <Link
                  to="/loans"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                    location.pathname.startsWith('/loans')
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden md:inline">My Loans</span>
                </Link>
              )}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {!user ? (
                <>
                  <button
                    onClick={openLogin}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={openSignUp}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {profile?.full_name || user.email}
                    </span>
                    {profile?.account_type === 'broker' && (
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Broker
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Log Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </>
  );
};
