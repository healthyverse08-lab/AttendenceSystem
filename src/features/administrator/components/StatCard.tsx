import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  delay?: number;
}

const ACCENTS: Record<NonNullable<StatCardProps['accent']>, string> = {
  sky: 'from-sky-500/10 to-sky-500/5 text-sky-600',
  emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600',
  amber: 'from-amber-500/10 to-amber-500/5 text-amber-600',
  rose: 'from-rose-500/10 to-rose-500/5 text-rose-600',
  violet: 'from-violet-500/10 to-violet-500/5 text-violet-600',
  slate: 'from-slate-500/10 to-slate-500/5 text-slate-600',
};

export function StatCard({ label, value, icon: Icon, accent = 'sky', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', ACCENTS[accent])}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
}
