import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ClipboardCheck, Search, Check, X, Clock, Save, ArrowLeft,
} from 'lucide-react';
import {
  useLecturerSessions, useStudentsForSections, useSessionRecords, useUpsertManualRecord,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { cn } from '@/lib/utils';
import type { AttendanceRecordStatus } from '@/types';

const STATUSES: AttendanceRecordStatus[] = ['present', 'absent', 'late', 'excused'];

export default function ManualAttendancePage() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: loadingSessions } = useLecturerSessions();
  const [sessionId, setSessionId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Record<string, AttendanceRecordStatus>>({});

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId]
  );

  const sectionIds = selectedSession?.sections?.map((s) => s.id) ?? [];
  const { data: students = [], isLoading: loadingStudents } = useStudentsForSections(sectionIds);
  const { data: records = [] } = useSessionRecords(sessionId);
  const upsertRecord = useUpsertManualRecord();

  const recordMap = useMemo(() => {
    const m = new Map<string, AttendanceRecordStatus>();
    for (const r of records) m.set(r.student_id, r.status);
    return m;
  }, [records]);

  const filteredStudents = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter((s) =>
      s.user?.full_name?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q)
    );
  }, [students, query]);

  function getStatus(studentId: string): AttendanceRecordStatus {
    return pending[studentId] ?? recordMap.get(studentId) ?? 'absent';
  }

  async function handleSave(studentId: string) {
    const status = pending[studentId];
    if (!status || !sessionId) return;
    try {
      await upsertRecord.mutateAsync({
        attendance_session_id: sessionId,
        student_id: studentId,
        status,
      });
      setPending((p) => {
        const next = { ...p };
        delete next[studentId];
        return next;
      });
      toast.success('Attendance saved.');
    } catch (err) {
      toast.error('Failed to save', { description: (err as Error).message });
    }
  }

  async function handleSaveAll() {
    if (!sessionId || Object.keys(pending).length === 0) return;
    try {
      await Promise.all(
        Object.entries(pending).map(([studentId, status]) =>
          upsertRecord.mutateAsync({ attendance_session_id: sessionId, student_id: studentId, status })
        )
      );
      setPending({});
      toast.success(`Saved ${Object.keys(pending).length} attendance records.`);
    } catch (err) {
      toast.error('Some saves failed', { description: (err as Error).message });
    }
  }

  if (loadingSessions) {
    return (
      <div className="space-y-6">
        <PageHeader title="Manual Attendance" description="Mark attendance for students after a session." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const endedSessions = sessions.filter((s) => s.status === 'ended' || s.status === 'draft');

  return (
    <div className="space-y-6">
      <PageHeader title="Manual Attendance" description="Mark attendance for students after a session." />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Select a session…" /></SelectTrigger>
                <SelectContent>
                  {endedSessions.length === 0 ? (
                    <SelectItem value="_none" disabled>No sessions available</SelectItem>
                  ) : (
                    endedSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject?.name} — {new Date(s.start_time).toLocaleDateString()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {sessionId && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/lecturer/sessions/${sessionId}`)}>
                <ArrowLeft className="h-4 w-4" />
                Session Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!sessionId ? (
        <EmptyState
          title="Select a session"
          description="Choose a session above to mark manual attendance for its students."
          icon={<ClipboardCheck className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : loadingStudents ? (
        <Skeleton className="h-96" />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students in these sections"
          description="There are no active students enrolled in the sections for this session."
          icon={<Search className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or student ID…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {Object.keys(pending).length > 0 && (
              <Button className="gap-2" onClick={handleSaveAll} disabled={upsertRecord.isPending}>
                <Save className="h-4 w-4" />
                Save All ({Object.keys(pending).length})
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Students ({filteredStudents.length})</span>
                <span className="text-xs font-normal text-slate-500">
                  {records.length} already marked
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {filteredStudents.map((s) => {
                  const status = getStatus(s.id);
                  const isDirty = pending[s.id] !== undefined;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                        isDirty ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/40'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                          {s.user?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{s.user?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{s.student_id} · {s.section?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {STATUSES.map((st) => (
                            <button
                              key={st}
                              onClick={() => setPending((p) => ({ ...p, [s.id]: st }))}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                                status === st
                                  ? STATUS_STYLES[st].active
                                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                              )}
                              title={st}
                            >
                              {STATUS_ICONS[st]}
                            </button>
                          ))}
                        </div>
                        <Badge variant="outline" className={cn('capitalize text-xs', STATUS_STYLES[status].badge)}>
                          {status}
                        </Badge>
                        {isDirty && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1"
                            onClick={() => handleSave(s.id)}
                            disabled={upsertRecord.isPending}
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<AttendanceRecordStatus, { active: string; badge: string }> = {
  present: { active: 'border-emerald-500 bg-emerald-100 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700' },
  absent: { active: 'border-rose-500 bg-rose-100 text-rose-700', badge: 'bg-rose-50 text-rose-700' },
  late: { active: 'border-amber-500 bg-amber-100 text-amber-700', badge: 'bg-amber-50 text-amber-700' },
  excused: { active: 'border-sky-500 bg-sky-100 text-sky-700', badge: 'bg-sky-50 text-sky-700' },
};

const STATUS_ICONS: Record<AttendanceRecordStatus, React.ReactNode> = {
  present: <Check className="h-4 w-4" />,
  absent: <X className="h-4 w-4" />,
  late: <Clock className="h-4 w-4" />,
  excused: <ClipboardCheck className="h-4 w-4" />,
};
