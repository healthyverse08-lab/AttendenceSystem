import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500"
      >
        <GraduationCap className="h-8 w-8 text-white" strokeWidth={1.5} />
      </motion.div>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-sm text-slate-400"
      >
        Loading…
      </motion.div>
    </div>
  );
}
