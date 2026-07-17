import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { fetchAuthSession, signInWithGoogle, signOut } from './authService';
import { supabase } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'denied';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  profile: unknown | null;
  status: AuthStatus;
  deniedEmail: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<unknown | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session) {
        const { data: authData } = await supabase.auth.getUser();
        const email = authData.user?.email ?? null;
        if (email && !email.endsWith('@techspire.edu.np')) {
          setDeniedEmail(email);
          setStatus('denied');
        } else {
          setStatus('unauthenticated');
        }
        setUser(null);
        setRole(null);
        setProfile(null);
        return;
      }
      setUser(session.user);
      setRole(session.role);
      setProfile(session.profile);
      setStatus('authenticated');
      setDeniedEmail(null);
    } catch {
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      (async () => {
        await refresh();
      })();
    });
    refresh().finally(() => {
      if (mounted && status === 'loading') setStatus('unauthenticated');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      profile,
      status,
      deniedEmail,
      signIn: signInWithGoogle,
      signOut: async () => {
        await signOut();
        setUser(null);
        setRole(null);
        setProfile(null);
        setStatus('unauthenticated');
        setDeniedEmail(null);
      },
      refresh,
    }),
    [user, role, profile, status, deniedEmail, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
