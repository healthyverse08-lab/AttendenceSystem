import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AccessDeniedPage() {
  const { deniedEmail, signOut } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-red-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30"
          >
            <ShieldAlert className="h-10 w-10 text-red-400" strokeWidth={1.5} />
          </motion.div>

          <h1 className="text-3xl font-semibold tracking-tight">Access Denied</h1>
          <p className="mt-3 text-sm text-slate-400">
            Please sign in using your official Techspire College Google Account.
          </p>

          {deniedEmail && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-300">
              {deniedEmail} is not an authorized Techspire account.
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out and try again
            </button>
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-400">
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
