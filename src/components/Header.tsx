import React, { useState } from 'react';
import { ArrowLeft,  LogOut  } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isHome = location.pathname === '/';


  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };


  const getRouteHeaderText = () => {
    if (location.pathname.startsWith('/admin/uploads')) return "Upload Images";
    return 'Praman';
  };

  return (
    <>
      <header className="bg-white py-4 px-4 relative z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 h-10">

          {!isHome && (
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 bg-gray-100 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <h1 className="flex-1 text-[24px] md:text-3xl font-extrabold text-gray-900 tracking-tight">
            { getRouteHeaderText() }
          </h1>

          <button
            onClick={() => {
              setShowLogoutConfirm(true);
            }}
            className="text-left pl-4 pr-1 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>

        </div>
      </header>

      {showLogoutConfirm && (
        <ConfirmModal
          title="Confirm Logout"
          message="Are you sure you want to log out of your admin account?"
          confirmLabel="Logout"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </>
  );
};
