import { motion } from 'framer-motion';
import { ShieldCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';

export function LoginPage() {
  const { signIn, status } = useAuth();
  const loading = status === 'loading';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/30"
            >
              <GraduationCap className="h-10 w-10 text-white" strokeWidth={1.5} />
            </motion.div>
            <h1 className="text-3xl font-semibold tracking-tight">Techspire Smart Attendance</h1>
            <p className="mt-2 text-sm text-slate-400">
              Secure, rotating-QR attendance for Techspire College.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur"
          >
            <button
              onClick={signIn}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon className="h-5 w-5" />
              {loading ? 'Connecting…' : 'Continue with Techspire Google'}
            </button>
            <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Only @techspire.edu.np accounts are accepted.
            </p>
          </motion.div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Techspire College · Internal System
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
