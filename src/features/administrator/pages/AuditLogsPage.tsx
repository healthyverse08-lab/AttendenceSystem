import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Monitor, Globe, User } from 'lucide-react';
import type { AuditLog } from '@/types';
import { useAuditLogs } from '@/features/administrator/hooks/useAdminQueries';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  administrator: 'bg-sky-100 text-sky-700',
  lecturer: 'bg-emerald-100 text-emerald-700',
  student: 'bg-amber-100 text-amber-700',
};

const ACTION_CATEGORIES = {
  auth: ['user_login', 'user_logout', 'login_denied', 'bootstrap_super_admin_promoted'],
  attendance: ['attendance_started', 'attendance_closed', 'attendance_recorded', 'attendance_submitted', 'manual_attendance', 'duplicate_attendance_attempt'],
  qr: ['qr_generated', 'qr_rotated', 'invalid_token_attempt', 'unauthorized_qr_attempt'],
  users: ['student_created', 'student_updated', 'student_archived', 'lecturer_created', 'lecturer_updated', 'lecturer_archived'],
  academic: ['assignment_updated'],
  leave: ['leave_approved', 'leave_rejected'],
  notifications: ['notification_created'],
  settings: ['system_settings_updated'],
};

function getActionCategory(action: string): string {
  for (const [cat, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(action)) return cat;
  }
  return 'other';
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'Authentication',
  attendance: 'Attendance',
  qr: 'QR & Security',
  users: 'User Management',
  academic: 'Academic',
  leave: 'Leave',
  notifications: 'Notifications',
  settings: 'System Settings',
  other: 'Other',
};

export default function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs(200);
  const [actionFilter, setActionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const allLogs = useMemo(() => data ?? [], [data]);
  const actions = useMemo(() => Array.from(new Set(allLogs.map((l) => l.action))).sort(), [allLogs]);
  const roles = useMemo(() => Array.from(new Set(allLogs.map((l) => l.role).filter(Boolean) as string[])).sort(), [allLogs]);

  const filtered = allLogs.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (categoryFilter !== 'all' && getActionCategory(l.action) !== categoryFilter) return false;
    if (roleFilter !== 'all' && l.role !== roleFilter) return false;
    if (dateFilter && !l.created_at.startsWith(dateFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        (l.entity_type ?? '').toLowerCase().includes(q) ||
        (l.metadata ? JSON.stringify(l.metadata).toLowerCase().includes(q) : false)
      );
    }
    return true;
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      sortValue: (r) => r.created_at,
      cell: (r) => <span className="text-slate-500 tabular-nums text-xs">{new Date(r.created_at).toLocaleString()}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      sortValue: (r) => r.action,
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit text-xs">{r.action}</Badge>
          {r.description && <span className="text-xs text-slate-500">{r.description}</span>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (r) => r.role ? <Badge className={ROLE_COLORS[r.role] ?? 'bg-slate-100 text-slate-600'}><span className="capitalize">{r.role}</span></Badge> : <span className="text-slate-400 text-xs">system</span>,
    },
    {
      key: 'entity_type',
      header: 'Entity',
      cell: (r) => <span className="text-slate-600 text-xs">{r.entity_type ?? '—'}</span>,
    },
    {
      key: 'actor_id',
      header: 'Actor',
      cell: (r) => (
        <span className="text-slate-500 font-mono text-xs">
          {r.actor_id ? `${r.actor_id.slice(0, 8)}…` : 'system'}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      cell: (r) => r.ip_address ? <span className="text-slate-500 font-mono text-xs">{r.ip_address}</span> : <span className="text-slate-300">—</span>,
    },
    {
      key: 'device_info',
      header: 'Device',
      cell: (r) => {
        const ua = (r as AuditLog & { device_info?: { user_agent?: string } }).device_info?.user_agent;
        if (!ua || ua === 'unknown') return <span className="text-slate-300">—</span>;
        const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
        return <span className="text-slate-500 text-xs">{browser}</span>;
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Immutable record of all sensitive actions: logins, attendance, user changes, and system updates." />

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(ACTION_CATEGORIES).slice(0, 4).map(([cat]) => {
          const count = allLogs.filter((l) => getActionCategory(l.action) === cat).length;
          return (
            <Card key={cat}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold tabular-nums text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[cat]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <Input placeholder="Search action, description, metadata…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => <SelectItem key={r} value={r}><span className="capitalize">{r}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </div>

      {filtered.length > 0 ? (
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          rowKey={(r) => r.id}
          pageSize={15}
          onRowClick={(r) => setSelectedLog(r)}
        />
      ) : !isLoading ? (
        <EmptyState title="No audit logs found" description="Administrative actions will be logged here." icon={<Shield className="h-6 w-6" strokeWidth={1.5} />} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}</div>
      )}

      {/* Detail drawer */}
      {selectedLog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 sm:items-center sm:justify-center"
          onClick={() => setSelectedLog(null)}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">Audit Log Detail</h3>
            </div>
            <div className="space-y-3">
              <DetailRow icon={User} label="Actor" value={selectedLog.actor_id ?? 'system'} />
              <DetailRow icon={Shield} label="Role" value={selectedLog.role ?? '—'} />
              <DetailRow icon={Shield} label="Action" value={selectedLog.action} />
              {selectedLog.description && <DetailRow icon={Shield} label="Description" value={selectedLog.description} />}
              <DetailRow icon={Shield} label="Entity" value={`${selectedLog.entity_type ?? '—'} / ${selectedLog.entity_id ?? '—'}`} />
              <DetailRow icon={Globe} label="IP Address" value={selectedLog.ip_address ?? '—'} />
              <DetailRow icon={Monitor} label="Timestamp" value={new Date(selectedLog.created_at).toLocaleString()} />
              {selectedLog.metadata && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Metadata</p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="mt-6 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
    </div>
  );
}
