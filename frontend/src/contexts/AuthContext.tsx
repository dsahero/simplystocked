import React, { createContext, useContext, useState, useEffect } from 'react';
<<<<<<< HEAD
import { loginUser, loginWithGoogleApi, getAllUsers, createUser, updateUserRole, updatePassword as apiUpdatePassword, deleteUser, ApiUser } from '../api/auth';
import { clearToken } from '../api/client';
=======
import { loginUser, getAllUsers, createUser, updateUserRole, updatePassword as apiUpdatePassword, deleteUser, ApiUser } from '../api/auth';
>>>>>>> invoice
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
<<<<<<< HEAD
  loginWithGoogle: (credential: string) => Promise<void>;
=======
  loginWithGoogle: () => Promise<void>;
>>>>>>> invoice
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  // User management (admin)
  getAllUsers: () => Promise<ApiUser[]>;
<<<<<<< HEAD
  createUser: (username: string, password: string, email: string, role: string) => Promise<ApiUser>;
=======
  createUser: (username: string, password: string, role: string) => Promise<ApiUser>;
>>>>>>> invoice
  updateUserRole: (userId: number, role: string) => Promise<ApiUser>;
  deleteUser: (userId: number) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'simplystocked_session';

function apiUserToUser(u: ApiUser): User {
  return {
    id: String(u.UserId),
    name: u.Username,
<<<<<<< HEAD
    email: u.Email ?? '',
    role: u.Role as UserRole,
=======
    email: u.Username, // username is the email
    role: (u.Role === 'manager' ? 'user' : u.Role) as UserRole,
>>>>>>> invoice
    avatarUrl: '',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setIsAuthReady(true);
  }, []);

  const login = async (username: string, password: string) => {
    const apiUser = await loginUser(username, password);
    const appUser = apiUserToUser(apiUser);
    setUser(appUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
  };

<<<<<<< HEAD
  const loginWithGoogle = async (credential: string) => {
    const apiUser = await loginWithGoogleApi(credential);
    const appUser = apiUserToUser(apiUser);
    setUser(appUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
=======
  // Google login is not supported with the MySQL backend
  const loginWithGoogle = async () => {
    throw new Error('Google sign-in is not available. Please use your username and password.');
>>>>>>> invoice
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
<<<<<<< HEAD
    clearToken();
=======
>>>>>>> invoice
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    // If role changed, sync to backend
    if (updates.role && user.id) {
      const backendRole = updates.role === 'user' ? 'manager' : updates.role;
      await updateUserRole(Number(user.id), backendRole);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated');
    await apiUpdatePassword(Number(user.id), currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithGoogle,
      logout,
      updateProfile,
      changePassword,
      isAuthenticated: !!user,
      isAuthReady,
      getAllUsers,
      createUser,
      updateUserRole,
      deleteUser,
    }}>
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
