import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check local storage for "Remember Me"
    const savedUser = localStorage.getItem('simplystocked_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsAuthReady(true);
  }, []);

  const login = async (email: string, role: UserRole) => {
    // Mock login
    const mockUser: User = {
      id: '1',
      name: email.split('@')[0],
      email,
      role,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    };
    setUser(mockUser);
    localStorage.setItem('simplystocked_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('simplystocked_user');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('simplystocked_user', JSON.stringify(updatedUser));
  };

  const changePassword = async (newPassword: string) => {
    // Mock password change logic
    console.log('Password changed to:', newPassword);
    // In a real app, this would be an API call
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, changePassword, isAuthenticated: !!user, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
