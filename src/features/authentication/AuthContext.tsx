import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { fetchAuthSession, signInWithGoogle, signOut } from './authService';
import { supabase } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'denied' | 'expired';

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

const SESSION_CHECK_INTERVAL = 60_000; // 1 minute

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<unknown | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('401') || message.includes('session') || message.includes('expired') || message.includes('JWT')) {
        setStatus('expired');
      } else {
        setStatus('unauthenticated');
      }
      setUser(null);
      setRole(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setProfile(null);
        setStatus('unauthenticated');
        setDeniedEmail(null);
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        (async () => { await refresh(); })();
        return;
      }
      (async () => { await refresh(); })();
    });
    refresh().finally(() => {
      if (mounted && status === 'loading') setStatus('unauthenticated');
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic session validity check — detects server-side session expiry
  useEffect(() => {
    if (status !== 'authenticated') {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      return;
    }
    sessionCheckRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus('expired');
        setUser(null);
        setRole(null);
        setProfile(null);
      }
    }, SESSION_CHECK_INTERVAL);
    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
  }, [status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      profile,
      status,
      deniedEmail,
      signIn: signInWithGoogle,
      signOut: async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            // Best-effort audit log via edge function pattern (supabase client insert)
            // The audit_logs table has INSERT policy for authenticated users
            await supabase.from('audit_logs').insert({
              actor_id: authData.user.id,
              action: 'user_logout',
              description: 'User signed out',
              entity_type: 'users',
              entity_id: authData.user.id,
              metadata: { email: authData.user.email },
            });
          }
        } catch { /* best-effort audit */ }
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
