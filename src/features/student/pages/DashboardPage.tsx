import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, CalendarCheck, TrendingUp, Bell, QrCode, ArrowRight, Clock, CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';
import {
  useCurrentStudent, useStudentAssignments, useStudentRecords,
  useStudentUnreadNotifications, useStudentSessions,
} from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { StatCard } from '@/features/administrator/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { summarizeAttendance, ATTENDANCE_BAND_STYLES } from '@/utils/attendance';

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface SubjectStat {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  attended: number;
  percentage: number;
}

export default function DashboardPage() {
  const { data: student, isLoading: loadingProfile } = useCurrentStudent();
  const { data: assignments = [], isLoading: loadingAssignments } = useStudentAssignments();
  const { data: records = [], isLoading: loadingRecords } = useStudentRecords();
  const { data: sessions = [], isLoading: loadingSessions } = useStudentSessions();
  const { data: unread = [] } = useStudentUnreadNotifications();

  const isLoading = loadingProfile || loadingAssignments || loadingRecords || loadingSessions;

  const summary = useMemo(() => summarizeAttendance(records), [records]);

  const subjectStats = useMemo<SubjectStat[]>(() => {
    const map = new Map<string, SubjectStat>();
    for (const r of records) {
      const subj = r.attendance_session?.subject;
      if (!subj) continue;
      const key = subj.id;
      if (!map.has(key)) {
        map.set(key, {
          subjectId: subj.id,
          subjectName: subj.name,
          subjectCode: subj.code,
          total: 0,
          attended: 0,
          percentage: 0,
        });
      }
      const s = map.get(key)!;
      s.total++;
      if (r.status === 'present' || r.status === 'late') s.attended++;
    }
    for (const s of map.values()) {
      s.percentage = s.total === 0 ? 0 : Math.round((s.attended / s.total) * 100);
    }
    return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
  }, [records]);

  const todaysSessions = sessions.filter((s) => isToday(s.start_time));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your attendance overview at a glance." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const bandStyle = ATTENDANCE_BAND_STYLES[summary.band];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${student?.user?.full_name?.split(' ')[0] ?? 'Student'}`}
        description="Your attendance overview at a glance."
        actions={
          <Link to="/student/scan">
            <Button className="gap-2">
              <QrCode className="h-4 w-4" />
              Scan Attendance
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall Attendance" value={`${summary.percentage}%`} icon={TrendingUp} accent="emerald" delay={0} />
        <StatCard label="Enrolled Subjects" value={assignments.length} icon={BookOpen} accent="sky" delay={0.05} />
        <StatCard label="Today's Classes" value={todaysSessions.length} icon={CalendarCheck} accent="amber" delay={0.1} />
        <StatCard label="Unread Alerts" value={unread.length} icon={Bell} accent="rose" delay={0.15} />
      </div>

      {/* Attendance Rate Banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bandStyle.bg}`}>
                <TrendingUp className={`h-7 w-7 ${bandStyle.text}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Your overall attendance rate is {summary.percentage}%
                </p>
                <p className="text-xs text-slate-500">
                  {summary.attended} of {summary.total} sessions attended · {summary.present} present, {summary.late} late, {summary.absent} absent
                </p>
              </div>
            </div>
            <Badge className={`${bandStyle.bg} ${bandStyle.text}`}>{bandStyle.label}</Badge>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Link to="/student/history" className="text-xs font-medium text-sky-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {todaysSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
                <p className="text-sm text-slate-500">No classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{s.subject?.name ?? 'Session'}</p>
                        <p className="text-xs text-slate-500">
                          {s.teaching_type?.name} · {s.sections?.map((sec) => sec.name).join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {new Date(s.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subject Attendance</CardTitle>
            <Link to="/student/subjects" className="text-xs font-medium text-sky-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {subjectStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
                <p className="text-sm text-slate-500">No attendance records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectStats.slice(0, 5).map((s) => (
                  <div key={s.subjectId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{s.subjectName}</span>
                      <span className={`font-semibold ${percentageColor(s.percentage)}`}>{s.percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={percentageBar(s.percentage)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Attendance</CardTitle>
          <Link to="/student/history" className="text-xs font-medium text-sky-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm text-slate-500">No attendance records yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    {r.status === 'present' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {r.attendance_session?.subject?.name ?? 'Session'}
                      </p>
                      <p className="text-xs text-slate-500">{formatTime(r.submitted_at)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickAction to="/student/scan" icon={QrCode} label="Scan QR" />
        <QuickAction to="/student/history" icon={CalendarCheck} label="History" />
        <QuickAction to="/student/subjects" icon={BookOpen} label="Subjects" />
        <QuickAction to="/student/summary" icon={TrendingUp} label="Summary" />
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof QrCode; label: string }) {
  return (
    <Link to={to}>
      <Card className="group cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col items-center gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-200">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <ArrowRight className="h-3 w-3 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

function percentageColor(p: number): string {
  if (p >= 80) return 'text-emerald-700';
  if (p >= 70) return 'text-emerald-500';
  if (p >= 50) return 'text-yellow-600';
  return 'text-rose-600';
}

function percentageBar(p: number): string {
  if (p >= 80) return 'h-full bg-emerald-700';
  if (p >= 70) return 'h-full bg-emerald-400';
  if (p >= 50) return 'h-full bg-yellow-400';
  return 'h-full bg-rose-600';
}
