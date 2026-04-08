import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User, UserRole } from '../types';
import { renderToStaticMarkup } from 'react-dom/server';
import { DefaultAvatar } from '../components/ui/Brand';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check for mock session first
    const mockUser = localStorage.getItem('simplystocked_mock_user');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
      setIsAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. Try to fetch user data from Firestore by UID
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // 2. If not found by UID, try to find by email
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found an existing user with this email
            const existingUserData = querySnapshot.docs[0].data() as User;
            
            // Update the user data with the new Firebase UID
            const updatedUser: User = {
              ...existingUserData,
              id: firebaseUser.uid,
              avatarUrl: firebaseUser.photoURL || existingUserData.avatarUrl,
              name: firebaseUser.displayName || existingUserData.name,
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), updatedUser);
            setUser(updatedUser);
          } else {
            // 3. ACCESS DENIED: User is not in the system
            // We sign them out immediately
            await signOut(auth);
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Special override for the admin account as requested by the user
      // This bypasses Firebase Auth if the provider isn't enabled in the console
      if (email === 'admin@simplystocked.com' && password === 'password') {
        const defaultAvatarSvg = renderToStaticMarkup(<DefaultAvatar />);
        const defaultAvatarDataUrl = `data:image/svg+xml;base64,${btoa(defaultAvatarSvg)}`;
        
        const adminUser: User = {
          id: 'admin-mock-id',
          name: 'System Admin',
          email: 'admin@simplystocked.com',
          role: 'admin',
          avatarUrl: defaultAvatarDataUrl,
        };
        
        setUser(adminUser);
        localStorage.setItem('simplystocked_mock_user', JSON.stringify(adminUser));
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Perform a quick check to see if the user is in the system
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          await signOut(auth);
          throw new Error('Your email is not registered in the system. Please contact an administrator.');
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('simplystocked_mock_user');
    await signOut(auth);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    await setDoc(doc(db, 'users', user.id), updatedUser, { merge: true });
    setUser(updatedUser);
  };

  const changePassword = async (newPassword: string) => {
    // Firebase Auth handles password change differently
    console.log('Password change requested:', newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, updateProfile, changePassword, isAuthenticated: !!user, isAuthReady }}>
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
