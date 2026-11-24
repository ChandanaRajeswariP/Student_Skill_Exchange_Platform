import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await api.get('/students/me');
    setUser(data.user);
    return data.user;
  };

  useEffect(() => {
    refreshUser().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    await api.post('/auth/login', { email, password });
    return refreshUser();
  };
  const register = async payload => {
    await api.post('/auth/register', payload);
    return refreshUser();
  };
  const logout = async () => {
    await api.post('/auth/logout', {});
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
