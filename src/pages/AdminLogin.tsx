import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect based on role
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        navigate('/admin/uploads');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, isAdmin, navigate]);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setError('');
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight">
            Praman Hai
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Sign in to access your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <Input
              id="email-address"
              name="email"
              type="email"
              className='py-4'
              required
              placeholder="Email address"
              value={email}
              error={emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              leftIcon={<Mail className="w-5 h-5" />}
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className='py-4'
              placeholder="Password"
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
            <div className="flex justify-end pt-1">
              <Link to="/forgot-password" state={{ email }} className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full text-base py-3 shadow-md"
            >
              Sign In
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="text-base py-3 font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
              onClick={handleGoogleSignIn}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
              }
            >
              Google
            </Button>
          </div>
          
          <div className="text-sm text-center text-gray-600 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
              Sign up here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
