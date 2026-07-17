import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, CalendarCheck, Activity, Users, ClipboardList,
  Bell, PlayCircle, ArrowRight, Clock,
} from 'lucide-react';
import {
  useLecturerAssignments, useLecturerSessions, useActiveLecturerSession,
  useLecturerUnreadNotifications, useSessionRecords,
} from '../hooks/useLecturerQueries';
import { StatCard } from '@/features/administrator/components/StatCard';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { summarizeAttendance } from '@/utils/attendance';
import type { AttendanceSessionView } from '@/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function DashboardPage() {
  const { data: assignments = [], isLoading: loadingAssignments } = useLecturerAssignments();
  const { data: sessions = [], isLoading: loadingSessions } = useLecturerSessions();
  const { data: activeSession, isLoading: loadingActive } = useActiveLecturerSession();
  const { data: unread = [] } = useLecturerUnreadNotifications();
  const { data: activeRecords = [] } = useSessionRecords(activeSession?.id);

  const isLoading = loadingAssignments || loadingSessions || loadingActive;

  const todaysSessions = sessions.filter((s) => isToday(s.start_time));
  const totalStudents = new Set(
    assignments.flatMap((a) => a.sections?.map((sec) => sec.id) ?? [])
  ).size;
  const sessionsConducted = sessions.filter((s) => s.status === 'ended').length;
  const activeSummary = summarizeAttendance(activeRecords);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your teaching overview at a glance." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your teaching overview at a glance."
        actions={
          <Link to="/lecturer/start">
            <Button className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Start Attendance
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Assigned Subjects" value={assignments.length} icon={BookOpen} accent="sky" delay={0} />
        <StatCard label="Today's Classes" value={todaysSessions.length} icon={CalendarCheck} accent="emerald" delay={0.05} />
        <StatCard label="Active Session" value={activeSession ? 'Live' : 'None'} icon={Activity} accent={activeSession ? 'rose' : 'slate'} delay={0.1} />
        <StatCard label="Total Sections" value={totalStudents} icon={Users} accent="violet" delay={0.15} />
        <StatCard label="Sessions Conducted" value={sessionsConducted} icon={ClipboardList} accent="amber" delay={0.2} />
        <StatCard label="Unread Alerts" value={unread.length} icon={Bell} accent="sky" delay={0.25} />
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {activeSession.subject?.name ?? 'Active Session'} is live now
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeRecords.length} student{activeRecords.length !== 1 ? 's' : ''} marked ·{' '}
                    {activeSummary.percentage}% attendance
                  </p>
                </div>
              </div>
              <Link to="/lecturer/active">
                <Button variant="default" className="gap-2">
                  Monitor Session
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Link to="/lecturer/history" className="text-xs font-medium text-sky-600 hover:underline">
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
                {todaysSessions.slice(0, 5).map((s: AttendanceSessionView) => (
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
                          {s.teaching_type?.name} · {s.sections?.map((sec) => sec.name).join(', ') || 'No sections'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {new Date(s.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <SessionStatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Sessions</CardTitle>
            <Link to="/lecturer/history" className="text-xs font-medium text-sky-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
                <p className="text-sm text-slate-500">No sessions yet. Start your first attendance session.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <Link
                    key={s.id}
                    to={`/lecturer/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition-colors hover:bg-slate-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.subject?.name ?? 'Session'}</p>
                      <p className="text-xs text-slate-500">{formatTime(s.start_time)}</p>
                    </div>
                    <SessionStatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Notifications</CardTitle>
          <Link to="/lecturer/notifications" className="text-xs font-medium text-sky-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {unread.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm text-slate-500">You're all caught up.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unread.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <Bell className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                  </div>
                  <span className="text-xs text-slate-400">{formatTime(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    active: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-sky-100 text-sky-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  return (
    <Badge variant="secondary" className={styles[status] ?? styles.draft}>
      <span className="capitalize">{status}</span>
    </Badge>
  );
}
