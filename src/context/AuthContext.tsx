import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  auth,
  googleProvider,
  isTokenServiceDisabledError,
  TOKEN_SERVICE_ENABLE_URL,
} from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  isAuthReady: boolean;
  authError: string | null;
  tokenServiceDisabled: boolean;
  tokenServiceUrl: string;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenServiceDisabled, setTokenServiceDisabled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setUser(null);
          setIsAuthReady(true);
          return;
        }

        // Verify that Firebase Token Service API (securetoken.googleapis.com) can issue/refresh a valid ID token
        // before attaching Firestore listeners, preventing Firestore WebChannel crash loops.
        try {
          await currentUser.getIdToken();
          setTokenServiceDisabled(false);
          setAuthError(null);
          setUser(currentUser);
        } catch (err: unknown) {
          if (isTokenServiceDisabledError(err)) {
            setTokenServiceDisabled(true);
            setAuthError(
              `Google Cloud Token Service API (securetoken.googleapis.com) is currently disabled in GCP Project 145646064453 (ringed-caldron-j5xj8). Enable it at ${TOKEN_SERVICE_ENABLE_URL} and wait 1–2 minutes, then sign in again.`
            );
            // Clear the broken cached auth state so Firestore does not repeatedly fail token fetches
            try {
              await signOut(auth);
            } catch {
              // ignore signOut cleanup error
            }
            setUser(null);
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : 'Failed to verify authentication token.';
            setAuthError(msg);
            setUser(null);
          }
        } finally {
          setIsAuthReady(true);
        }
      },
      (err) => {
        console.warn('Auth state observer warning:', err);
        setAuthError(err.message);
        setIsAuthReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setTokenServiceDisabled(false);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await cred.user.getIdToken();
      setUser(cred.user);
    } catch (err: unknown) {
      if (isTokenServiceDisabledError(err)) {
        setTokenServiceDisabled(true);
        setAuthError(
          `Google Cloud Token Service API (securetoken.googleapis.com) is disabled in GCP Project 145646064453 (ringed-caldron-j5xj8). Please enable it at ${TOKEN_SERVICE_ENABLE_URL}, wait 1–2 minutes for propagation, and click Sign In again.`
        );
        try {
          await signOut(auth);
        } catch {
          // ignore
        }
        setUser(null);
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please try again.';
      setAuthError(msg);
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign out.';
      setAuthError(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthReady,
        authError,
        tokenServiceDisabled,
        tokenServiceUrl: TOKEN_SERVICE_ENABLE_URL,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
