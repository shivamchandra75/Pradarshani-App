import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userRole: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  isSuperAdmin: false,
  userRole: null,
  loading: true,
  logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (mounted) {
        setCurrentUser(user);
        if (user) {
          checkAdminStatus(user.id);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserRole(null);
          setLoading(false);
        }
      }
    };

    const checkAdminStatus = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        
        if (mounted) {
          const role = data?.role || null;
          setUserRole(role);
          setIsAdmin(role === 'admin' || role === 'super_admin');
          setIsSuperAdmin(role === 'super_admin');
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (mounted) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (mounted) {
        setCurrentUser(user);
        if (user) {
          checkAdminStatus(user.id);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setUserRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, isSuperAdmin, userRole, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
