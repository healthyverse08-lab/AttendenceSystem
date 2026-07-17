import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Clock, BookOpen, Layers,
  FileSpreadsheet, User, MapPin,
} from 'lucide-react';
import {
  useLecturerSessions, useSessionRecords, useStudentsForSections,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { summarizeAttendance, ATTENDANCE_BAND_STYLES } from '@/utils/attendance';
import type { AttendanceRecordStatus } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return '0m';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function SessionDetailsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: loadingSession } = useLecturerSessions();
  const { data: records = [], isLoading: loadingRecords } = useSessionRecords(sessionId);

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId]
  );

  const sectionIds = session?.sections?.map((s) => s.id) ?? [];
  const { data: students = [] } = useStudentsForSections(sectionIds);
  const summary = summarizeAttendance(records);
  const bandStyle = ATTENDANCE_BAND_STYLES[summary.band];

  const recordMap = useMemo(() => {
    const m = new Map<string, AttendanceRecordStatus>();
    for (const r of records) m.set(r.student_id, r.status);
    return m;
  }, [records]);

  // Build full list: all enrolled students, with their record status (or 'absent' if missing)
  const fullList = useMemo(() => {
    return students.map((s) => ({
      student: s,
      status: recordMap.get(s.id) ?? 'absent' as AttendanceRecordStatus,
      submitted_at: records.find((r) => r.student_id === s.id)?.submitted_at ?? null,
    }));
  }, [students, records, recordMap]);

  function exportCSV() {
    if (!session) return;
    const headers = ['Student ID', 'Name', 'Section', 'Status', 'Submitted At'];
    const rows = fullList.map((r) => [
      r.student.student_id,
      r.student.user?.full_name ?? '',
      r.student.section?.name ?? '',
      r.status,
      r.submitted_at ? formatDate(r.submitted_at) : '—',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${session.subject?.code ?? 'session'}_${session.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully.');
  }

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Session not found"
          description="This session may not exist or you may not have access to it."
          icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />}
          action={<Button onClick={() => navigate('/lecturer/history')}>Back to History</Button>}
        />
      </div>
    );
  }

  const columns: Column<{ student: typeof students[number]; status: AttendanceRecordStatus; submitted_at: string | null }>[] = [
    {
      key: 'student_id',
      header: 'Student ID',
      sortable: true,
      sortValue: (r) => r.student.student_id,
      cell: (r) => <span className="font-mono text-xs text-slate-600">{r.student.student_id}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (r) => r.student.user?.full_name ?? '',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
            {r.student.user?.full_name?.charAt(0) ?? '?'}
          </div>
          <span className="font-medium text-slate-800">{r.student.user?.full_name ?? 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Section',
      cell: (r) => <Badge variant="outline" className="text-xs">{r.student.section?.name ?? '—'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      cell: (r) => <RecordStatusBadge status={r.status} />,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (r) => r.submitted_at ? (
        <span className="text-xs text-slate-500">{formatDate(r.submitted_at)}</span>
      ) : (
        <span className="text-xs text-slate-400">Not marked</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/lecturer/history" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </div>

      <PageHeader
        title={session.subject?.name ?? 'Session Details'}
        description={`${session.subject?.code} · ${session.teaching_type?.name}`}
        actions={
          <div className="flex items-center gap-2">
            {(session.status === 'ended' || session.status === 'draft') && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/lecturer/manual')}>
                Edit Manual
              </Button>
            )}
            <Button size="sm" className="gap-2" onClick={exportCSV} disabled={fullList.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Session Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Calendar} label="Date" value={formatDate(session.start_time)} />
        <InfoCard icon={Clock} label="Duration" value={formatDuration(session.start_time, session.end_time)} />
        <InfoCard icon={Layers} label="Sections" value={session.sections?.map((s) => s.name).join(', ') || '—'} />
        <InfoCard icon={MapPin} label="Room" value={session.room?.name ?? 'Not assigned'} />
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attendance Rate</p>
            <p className="mt-1.5 text-3xl font-bold text-slate-900">{summary.percentage}%</p>
            <Badge className={`mt-2 ${bandStyle.bg} ${bandStyle.text}`}>{bandStyle.label}</Badge>
          </CardContent>
        </Card>
        <SummaryBox label="Present" value={summary.present} accent="emerald" />
        <SummaryBox label="Absent" value={summary.absent} accent="rose" />
        <SummaryBox label="Late" value={summary.late} accent="amber" />
        <SummaryBox label="Excused" value={summary.excused} accent="sky" />
      </div>

      {/* Comments */}
      {session.comments && (
        <Card>
          <CardHeader><CardTitle>Session Comments</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{session.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Attendance List</span>
            <span className="text-xs font-normal text-slate-500">{fullList.length} students</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <Skeleton className="h-64" />
          ) : fullList.length === 0 ? (
            <EmptyState
              title="No students enrolled"
              description="No active students found in the sections for this session."
              icon={<User className="h-6 w-6" strokeWidth={1.5} />}
            />
          ) : (
            <DataTable
              columns={columns}
              data={fullList}
              rowKey={(r) => r.student.id}
              pageSize={15}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  const accents: Record<string, string> = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1.5 text-2xl font-bold ${accents[accent]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RecordStatusBadge({ status }: { status: AttendanceRecordStatus }) {
  const styles: Record<AttendanceRecordStatus, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-rose-100 text-rose-700',
    late: 'bg-amber-100 text-amber-700',
    excused: 'bg-sky-100 text-sky-700',
  };
  return <Badge className={styles[status]}><span className="capitalize">{status}</span></Badge>;
}
