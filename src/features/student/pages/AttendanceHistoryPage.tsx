import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, Search, Calendar, Filter } from 'lucide-react';
import { useStudentRecords } from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AttendanceRecordStatus, AttendanceRecordView, AttendanceSessionView } from '@/types';

type RecordRow = AttendanceRecordView & { attendance_session: AttendanceSessionView };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLES: Record<AttendanceRecordStatus, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-rose-100 text-rose-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-sky-100 text-sky-700',
};

export default function AttendanceHistoryPage() {
  const { data: records = [], isLoading } = useStudentRecords() as { data: RecordRow[] | undefined; isLoading: boolean };
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = records;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((r) =>
        r.attendance_session?.subject?.name?.toLowerCase().includes(q) ||
        r.attendance_session?.subject?.code?.toLowerCase().includes(q) ||
        r.attendance_session?.teaching_type?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, query, statusFilter]);

  const columns: Column<RecordRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      sortValue: (r) => r.attendance_session?.subject?.name ?? '',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.attendance_session?.subject?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{r.attendance_session?.subject?.code}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => <span className="text-sm text-slate-600">{r.attendance_session?.teaching_type?.name ?? '—'}</span>,
    },
    {
      key: 'lecturer',
      header: 'Lecturer',
      cell: (r) => <span className="text-sm text-slate-600">{r.attendance_session?.lecturer?.user?.full_name ?? '—'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortValue: (r) => r.submitted_at,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(r.submitted_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      cell: (r) => (
        <Badge className={STATUS_STYLES[r.status]}>
          <span className="capitalize">{r.status}</span>
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance History" description="All your attendance records across subjects and sessions." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by subject, code, or type…"
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
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          title={query || statusFilter !== 'all' ? 'No matching records' : 'No attendance records yet'}
          description={query || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Your attendance history will appear here once you start scanning QR codes.'}
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
            emptyTitle="No records found"
            emptyDescription="Try adjusting your search or filter."
          />
        </motion.div>
      )}
    </div>
  );
}
