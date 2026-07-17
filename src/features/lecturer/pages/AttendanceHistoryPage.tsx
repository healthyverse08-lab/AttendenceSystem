import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  History, Search, Calendar, ArrowRight, Filter,
} from 'lucide-react';
import { useLecturerSessions } from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AttendanceSessionView, AttendanceSessionStatus } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AttendanceHistoryPage() {
  const { data: sessions = [], isLoading } = useLecturerSessions();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = sessions;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((s) =>
        s.subject?.name?.toLowerCase().includes(q) ||
        s.subject?.code?.toLowerCase().includes(q) ||
        s.teaching_type?.name?.toLowerCase().includes(q) ||
        s.sections?.some((sec) => sec.name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sessions, query, statusFilter]);

  const columns: Column<AttendanceSessionView>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      sortValue: (r) => r.subject?.name ?? '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.subject?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{r.subject?.code}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => <span className="text-sm text-slate-600">{r.teaching_type?.name ?? '—'}</span>,
    },
    {
      key: 'sections',
      header: 'Sections',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.sections?.length ? (
            r.sections.map((s) => <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>)
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortValue: (r) => r.start_time,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(r.start_time)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <Link to={`/lecturer/sessions/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline">
          View <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance History" description="All your past and upcoming attendance sessions." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by subject, code, section…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          title={query || statusFilter !== 'all' ? "No matching sessions" : "No attendance sessions yet"}
          description={query || statusFilter !== 'all' ? "Try adjusting your filters." : "Your session history will appear here once you start taking attendance."}
          icon={<History className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            pageSize={10}
            emptyTitle="No sessions found"
            emptyDescription="Try adjusting your search or filter."
          />
        </motion.div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceSessionStatus }) {
  const styles: Record<AttendanceSessionStatus, string> = {
    draft: 'bg-slate-100 text-slate-600',
    active: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-sky-100 text-sky-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  return <Badge className={styles[status]}><span className="capitalize">{status}</span></Badge>;
}
