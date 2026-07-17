import { supabase } from '@/lib/supabase';
import type { AuthSession, User, UserRole } from '@/types';

export interface AuthSessionResponse {
  user: User;
  role: UserRole;
  profile: AuthSession['profile'] | null;
  bootstrap?: boolean;
}

const ALLOWED_DOMAIN = 'techspire.edu.np';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchAuthSession(): Promise<AuthSessionResponse | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  if (!isAllowedEmail(authUser.email)) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('auth-session');
  if (error) throw error;
  if (!data) return null;
  return data as AuthSessionResponse;
}
