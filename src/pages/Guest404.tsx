import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { LogOut } from 'lucide-react';

const Guest404: React.FC = () => {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-9xl font-extrabold text-gray-200">404</h1>
        <h2 className="text-3xl font-bold text-gray-900">Page Not Found</h2>
        <p className="text-gray-600">
          Your account is currently pending approval. Please wait until an administrator assigns you the "user" role to access the application.
        </p>
        <div className="pt-4">
          <Button onClick={logout} className="inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Guest404;
