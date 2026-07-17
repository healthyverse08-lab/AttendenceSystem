import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Activity, Clock, Users, QrCode, StopCircle, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  useActiveLecturerSession, useSessionRecords, useEndAttendance,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { summarizeAttendance, ATTENDANCE_BAND_STYLES } from '@/utils/attendance';
import { EmptyState } from '@/features/administrator/components/EmptyState';

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveSessionPage() {
  const navigate = useNavigate();
  const { data: session, isLoading } = useActiveLecturerSession();
  const { data: records = [] } = useSessionRecords(session?.id);
  const endAttendance = useEndAttendance();
  const [endOpen, setEndOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (session?.attendance_ends_at) {
      const r = Math.max(0, Math.ceil((new Date(session.attendance_ends_at).getTime() - now) / 1000));
      setRemaining(r);
    }
  }, [session, now]);

  const summary = summarizeAttendance(records);
  const bandStyle = ATTENDANCE_BAND_STYLES[summary.band];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Active Session" description="Monitor live attendance in real time." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Active Session" description="Monitor live attendance in real time." />
        <EmptyState
          title="No active session"
          description="Start an attendance session to see the live QR code and real-time attendance here."
          icon={<Activity className="h-6 w-6" strokeWidth={1.5} />}
          action={
            <Link to="/lecturer/start">
              <Button className="gap-2">
                <QrCode className="h-4 w-4" />
                Start a Session
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  async function handleEnd() {
    try {
      await endAttendance.mutateAsync(session!.id);
      toast.success('Attendance session ended.');
      navigate(`/lecturer/sessions/${session!.id}`);
    } catch (err) {
      toast.error('Failed to end session', { description: (err as Error).message });
    }
  }

  const progress = session.attendance_ends_at
    ? Math.min(100, Math.max(0, 100 - (remaining / (session.attendance_duration_seconds || 1)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Session"
        description="Monitor live attendance in real time."
        actions={
          <Button variant="destructive" className="gap-2" onClick={() => setEndOpen(true)}>
            <StopCircle className="h-4 w-4" />
            End Session
          </Button>
        }
      />

      {/* Session info bar */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{session.subject?.name}</p>
              <p className="text-xs text-slate-500">
                {session.teaching_type?.name} · {session.sections?.map((s) => s.name).join(', ') || 'No sections'}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700">Live</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* QR + Timer */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR Code</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex h-56 w-56 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                <div className="text-center">
                  <QrCode className="mx-auto h-16 w-16 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-2 text-xs text-slate-400">QR rotation in Prompt 5</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Display this QR code for students to scan and mark attendance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time Remaining</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <p className={`text-4xl font-bold tabular-nums ${remaining < 60 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {fmtTime(remaining)}
                </p>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-slate-500">
                {remaining > 0 ? 'Attendance window open' : 'Window closed — end session to finalize'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Stats + Records */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatBox label="Present" value={summary.present} icon={CheckCircle2} accent="emerald" />
            <StatBox label="Absent" value={summary.absent} icon={XCircle} accent="rose" />
            <StatBox label="Late" value={summary.late} icon={Clock} accent="amber" />
            <StatBox label="Total" value={summary.total} icon={Users} accent="sky" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live Attendance</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={bandStyle.bg + ' ' + bandStyle.text}>
                  {summary.percentage}% · {bandStyle.label}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Auto-refresh
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="text-sm text-slate-500">Waiting for students to scan the QR code…</p>
                  <p className="mt-1 text-xs text-slate-400">Records will appear here in real time.</p>
                </div>
              ) : (
                <div className="max-h-80 space-y-1.5 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {records.map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                            {r.student?.user?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{r.student?.user?.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{r.student?.student_id}</p>
                          </div>
                        </div>
                        <RecordStatusBadge status={r.status} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={endOpen} onOpenChange={setEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End attendance session?</AlertDialogTitle>
            <AlertDialogDescription>
              The attendance window will close and the session will be finalized. You can still mark manual attendance afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnd}
              disabled={endAttendance.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {endAttendance.isPending ? 'Ending…' : 'End Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof Users; accent: string }) {
  const accents: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent]}`}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-rose-100 text-rose-700',
    late: 'bg-amber-100 text-amber-700',
    excused: 'bg-sky-100 text-sky-700',
  };
  return <Badge className={styles[status] ?? styles.absent}><span className="capitalize">{status}</span></Badge>;
}
