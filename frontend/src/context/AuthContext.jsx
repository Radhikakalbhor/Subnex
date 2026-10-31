import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('subnex_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Probe current user identity on mount
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data.user);
        setError(null);
      } catch (err) {
        console.warn('Failed to verify token, clearing session:', err.message);
        localStorage.removeItem('subnex_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data.data;
      localStorage.setItem('subnex_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async ({ email, password, full_name, company_name }) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        full_name,
        company_name,
      });
      const { token: receivedToken, user: receivedUser } = res.data.data;
      localStorage.setItem('subnex_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('subnex_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  // Demo helper: quick switch between admin and demo roles for pairing & verification
  const quickLoginAs = async (role = 'admin') => {
    if (role === 'admin') {
      return login('admin@subnex.io', 'Admin@Subnex2026!');
    }
    if (role === 'staff') {
      return login('staff@subnex.io', 'Staff@Subnex2026!');
    }
    if (role === 'customer') {
      const res = await login('customer@subnex.io', 'Customer@Subnex2026!');
      if (res.success) return res;
      // If customer doesn't exist yet, auto-register demo customer
      return register({
        email: 'customer@subnex.io',
        password: 'Customer@Subnex2026!',
        full_name: 'Acme Corp (Demo Customer)',
        company_name: 'Acme Corporation',
      });
    }
    return { success: false, error: 'Unknown role' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        quickLoginAs,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isCustomer: user?.role === 'customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
