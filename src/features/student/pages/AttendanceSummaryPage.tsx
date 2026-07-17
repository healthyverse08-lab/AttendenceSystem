import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChartBar as BarChart3, Calendar } from 'lucide-react';
import { useStudentRecords } from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { summarizeAttendance, ATTENDANCE_BAND_STYLES } from '@/utils/attendance';
import type { AttendanceRecordStatus } from '@/types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#059669', '#dc2626', '#eab308', '#0ea5e9'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type RecordRow = { status: string; submitted_at: string; attendance_session?: { subject?: { name: string; code: string } } };

export default function AttendanceSummaryPage() {
  const { data: records = [], isLoading } = useStudentRecords() as { data: RecordRow[] | undefined; isLoading: boolean };

  const summary = useMemo(() => summarizeAttendance(records as { status: AttendanceRecordStatus }[]), [records]);

  const monthlyData = useMemo(() => {
    const map = new Map<number, { month: string; present: number; absent: number; late: number; total: number }>();
    for (const r of records) {
      const d = new Date(r.submitted_at);
      const m = d.getMonth();
      if (!map.has(m)) map.set(m, { month: MONTH_NAMES[m], present: 0, absent: 0, late: 0, total: 0 });
      const entry = map.get(m)!;
      entry.total++;
      if (r.status === 'present') entry.present++;
      else if (r.status === 'absent') entry.absent++;
      else if (r.status === 'late') entry.late++;
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, v]) => ({ ...v, monthIndex: m }));
  }, [records]);

  const distributionData = [
    { name: 'Present', value: summary.present },
    { name: 'Absent', value: summary.absent },
    { name: 'Late', value: summary.late },
    { name: 'Excused', value: summary.excused },
  ].filter((d) => d.value > 0);

  const timeline = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 20);
  }, [records]);

  const bandStyle = ATTENDANCE_BAND_STYLES[summary.band];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance Summary" description="Comprehensive overview of your attendance patterns." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance Summary" description="Comprehensive overview of your attendance patterns." />
        <EmptyState
          title="No attendance data yet"
          description="Your attendance summary will appear here once you have records."
          icon={<BarChart3 className="h-6 w-6" strokeWidth={1.5} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Summary" description="Comprehensive overview of your attendance patterns." />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Rate</p>
            <p className="mt-1.5 text-3xl font-bold text-slate-900">{summary.percentage}%</p>
            <Badge className={`mt-2 ${bandStyle.bg} ${bandStyle.text}`}>{bandStyle.label}</Badge>
          </CardContent>
        </Card>
        <SummaryBox label="Present" value={summary.present} color="text-emerald-600" />
        <SummaryBox label="Absent" value={summary.absent} color="text-rose-600" />
        <SummaryBox label="Late" value={summary.late} color="text-amber-600" />
        <SummaryBox label="Excused" value={summary.excused} color="text-sky-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly Chart */}
        <Card>
          <CardHeader><CardTitle>Monthly Attendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#059669" name="Present" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" stackId="a" fill="#eab308" name="Late" />
                <Bar dataKey="absent" stackId="a" fill="#dc2626" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {distributionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Attendance Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-4 pl-6">
            <div className="absolute left-2 top-0 h-full w-0.5 bg-slate-200" />
            {timeline.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="relative"
              >
                <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${
                  r.status === 'present' ? 'bg-emerald-500' :
                  r.status === 'absent' ? 'bg-rose-500' :
                  r.status === 'late' ? 'bg-amber-500' : 'bg-sky-500'
                }`} />
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {r.attendance_session?.subject?.name ?? 'Session'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(r.submitted_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge className={`capitalize ${
                    r.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                    r.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {r.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
