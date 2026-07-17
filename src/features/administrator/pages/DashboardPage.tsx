import {
  Users, GraduationCap, BookOpen, Building2, Layers,
  Activity, CalendarCheck, TrendingUp, CalendarX, Bell,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useDashboardStats } from '@/features/administrator/hooks/useAdminQueries';
import { StatCard } from '@/features/administrator/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PIE_COLORS = ['#0e7490', '#059669', '#eab308', '#dc2626'];

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const s = stats ?? {
    totalStudents: 0, totalLecturers: 0, totalSubjects: 0, totalDepartments: 0,
    totalPrograms: 0, totalSections: 0, activeAttendanceSessions: 0,
    todaysAttendanceRecords: 0, averageCollegeAttendance: 0,
    pendingLeaveRequests: 0, activeNotifications: 0,
  };

  // Placeholder trend data — will be replaced with real queries in future prompts
  const trendData = Array.from({ length: 7 }).map((_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    attendance: Math.round(70 + Math.random() * 25),
  }));

  const riskData = [
    { name: 'Excellent (80%+)', value: Math.round(s.totalStudents * 0.6) },
    { name: 'Good (70-79%)', value: Math.round(s.totalStudents * 0.2) },
    { name: 'Warning (50-69%)', value: Math.round(s.totalStudents * 0.12) },
    { name: 'Critical (<50%)', value: Math.round(s.totalStudents * 0.08) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of the Techspire Smart Attendance System.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={s.totalStudents} icon={Users} accent="sky" delay={0} />
        <StatCard label="Total Lecturers" value={s.totalLecturers} icon={GraduationCap} accent="emerald" delay={0.05} />
        <StatCard label="Total Subjects" value={s.totalSubjects} icon={BookOpen} accent="violet" delay={0.1} />
        <StatCard label="Departments" value={s.totalDepartments} icon={Building2} accent="amber" delay={0.15} />
        <StatCard label="Programs" value={s.totalPrograms} icon={Layers} accent="sky" delay={0.2} />
        <StatCard label="Sections" value={s.totalSections} icon={Layers} accent="emerald" delay={0.25} />
        <StatCard label="Active Sessions" value={s.activeAttendanceSessions} icon={Activity} accent="rose" delay={0.3} />
        <StatCard label="Today's Attendance" value={s.todaysAttendanceRecords} icon={CalendarCheck} accent="violet" delay={0.35} />
        <StatCard label="Avg. Attendance" value={`${s.averageCollegeAttendance}%`} icon={TrendingUp} accent="emerald" delay={0.4} />
        <StatCard label="Pending Leaves" value={s.pendingLeaveRequests} icon={CalendarX} accent="amber" delay={0.45} />
        <StatCard label="Notifications" value={s.activeNotifications} icon={Bell} accent="sky" delay={0.5} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Attendance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="attendance" stroke="#0ea5e9" strokeWidth={2} fill="url(#attGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Student Attendance Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {riskData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Subject Attendance Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Semester Attendance Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="attendance" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
