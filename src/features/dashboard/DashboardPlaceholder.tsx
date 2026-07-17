import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, Users, Settings } from 'lucide-react';
import type { UserRole } from '@/types';

const ROLE_META: Record<UserRole, { title: string; subtitle: string; icon: typeof ShieldCheck }> = {
  super_admin: { title: 'Super Administrator', subtitle: 'Full system control', icon: ShieldCheck },
  administrator: { title: 'Administrator', subtitle: 'Manage academic structure & users', icon: Settings },
  lecturer: { title: 'Lecturer', subtitle: 'Run attendance sessions', icon: BookOpen },
  student: { title: 'Student', subtitle: 'Mark attendance via QR', icon: Users },
};

export function DashboardPlaceholder({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white">
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{meta.title} Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-sm font-medium text-slate-600">Foundation Ready</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          The TSAMS architecture is initialized. Role-specific dashboards, the QR engine UI,
          analytics, and reports will be built in upcoming prompts.
        </p>
      </div>
    </motion.div>
  );
}
