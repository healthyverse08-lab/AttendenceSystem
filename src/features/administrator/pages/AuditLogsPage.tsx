import { useState, useMemo } from 'react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AuditLog } from '@/types';
import { useAuditLogs } from '@/features/administrator/hooks/useAdminQueries';

export default function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs(200);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const allLogs = useMemo(() => data ?? [], [data]);
  const actions = useMemo(() => Array.from(new Set(allLogs.map((l) => l.action))).sort(), [allLogs]);

  const filtered = allLogs.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (dateFilter && !l.created_at.startsWith(dateFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.action.toLowerCase().includes(q) || (l.entity_type ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', header: 'Timestamp', sortable: true, sortValue: (r) => r.created_at, cell: (r) => <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span> },
    { key: 'action', header: 'Action', sortable: true, sortValue: (r) => r.action, cell: (r) => <Badge variant="outline">{r.action}</Badge> },
    { key: 'entity_type', header: 'Entity', cell: (r) => <span className="text-slate-600">{r.entity_type ?? '—'}</span> },
    { key: 'actor_id', header: 'Actor', cell: (r) => <span className="text-slate-500 font-mono text-xs">{r.actor_id ? r.actor_id.slice(0, 8) + '…' : 'system'}</span> },
    { key: 'metadata', header: 'Metadata', cell: (r) => <span className="text-slate-400 text-xs">{r.metadata ? JSON.stringify(r.metadata).slice(0, 60) : '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Searchable log of all administrative actions: logins, attendance, settings, and user changes." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <Input placeholder="Search action or entity..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
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
          <Label className="text-xs">Date</Label>
          <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </div>

      {filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} pageSize={15} />
      ) : !isLoading ? (
        <EmptyState title="No audit logs found" description="Administrative actions will be logged here." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}</div>
      )}
    </div>
  );
}
