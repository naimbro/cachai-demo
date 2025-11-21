import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext();

// Whitelist of authorized email addresses
const ALLOWED_EMAILS = [
  'mitchellbosley@gmail.com',
  'andabek@gmail.com',
  'naim.bro@gmail.com',
  'sytoro@gmail.com',
  'lunapuljak@gmail.com',
  'donrafa@gmail.com',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && ALLOWED_EMAILS.includes(firebaseUser.email)) {
        setUser(firebaseUser);
        setError(null);
      } else if (firebaseUser) {
        // User authenticated but not in whitelist
        await signOut(auth);
        setUser(null);
        setError('Acceso denegado. Tu email no esta autorizado.');
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      if (!ALLOWED_EMAILS.includes(result.user.email)) {
        await signOut(auth);
        throw new Error('Acceso denegado. Tu email no esta autorizado.');
      }
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
