import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if the user has an active session
    // The link from the email will implicitly log them in and create a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If there's no session, the link is invalid or expired
        setError('Your password reset link is invalid or has expired. Please request a new one.');
      }
    });

    // Also listen for auth state changes just in case the initial fetch missed it
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is here from a recovery link
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setError('');
    setLoading(true);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) throw updateError;
      
      toast.success('Password successfully updated!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight">
            Praman Hai
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Enter your new password below
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors rounded-full hover:bg-gray-100"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors rounded-full hover:bg-gray-100"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || !!error.includes('expired')}
              isLoading={loading}
              className="w-full text-base py-3 shadow-md"
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
