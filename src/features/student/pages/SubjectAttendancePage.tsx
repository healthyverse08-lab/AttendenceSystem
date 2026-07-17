import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { useStudentRecords } from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Input } from '@/components/ui/input';

interface SubjectStat {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
}

function percentageColor(p: number): { text: string; ring: string; bg: string } {
  if (p >= 80) return { text: 'text-emerald-700', ring: 'stroke-emerald-600', bg: 'bg-emerald-700' };
  if (p >= 70) return { text: 'text-emerald-500', ring: 'stroke-emerald-400', bg: 'bg-emerald-400' };
  if (p >= 50) return { text: 'text-yellow-600', ring: 'stroke-yellow-500', bg: 'bg-yellow-400' };
  return { text: 'text-rose-600', ring: 'stroke-rose-500', bg: 'bg-rose-600' };
}

function CircularProgress({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const colors = percentageColor(percentage);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colors.ring}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colors.text}`}>{percentage}%</span>
      </div>
    </div>
  );
}

export default function SubjectAttendancePage() {
  const { data: records = [], isLoading: loadingRecords } = useStudentRecords() as { data: any[] | undefined; isLoading: boolean };
  const [query, setQuery] = useState('');

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
          total: 0, present: 0, absent: 0, late: 0, excused: 0, attended: 0, percentage: 0,
        });
      }
      const s = map.get(key)!;
      s.total++;
      if (r.status === 'present') s.present++;
      else if (r.status === 'absent') s.absent++;
      else if (r.status === 'late') { s.late++; s.attended++; continue; }
      else if (r.status === 'excused') s.excused++;
      if (r.status === 'present') s.attended++;
    }
    for (const s of map.values()) {
      s.percentage = s.total === 0 ? 0 : Math.round((s.attended / s.total) * 100);
    }
    return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
  }, [records]);

  const filtered = useMemo(() => {
    if (!query.trim()) return subjectStats;
    const q = query.toLowerCase();
    return subjectStats.filter((s) =>
      s.subjectName.toLowerCase().includes(q) || s.subjectCode.toLowerCase().includes(q)
    );
  }, [subjectStats, query]);

  const isLoading = loadingRecords;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Subjects" description="Subject-wise attendance breakdown with progress indicators." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Subjects" description="Subject-wise attendance breakdown with progress indicators." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search subjects…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No matching subjects' : 'No attendance records yet'}
          description={query ? 'Try a different search.' : 'Your subject-wise attendance will appear here once you have attendance records.'}
          icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.subjectId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col items-center p-5">
                  <div className="mb-3 flex w-full items-center justify-between">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{s.subjectCode}</Badge>
                    <span className="text-xs text-slate-500">{s.total} sessions</span>
                  </div>
                  <h3 className="mb-4 text-center text-sm font-semibold text-slate-900">{s.subjectName}</h3>
                  <CircularProgress percentage={s.percentage} />
                  <div className="mt-4 grid w-full grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{s.present}</p>
                      <p className="text-[10px] uppercase text-slate-400">Present</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{s.late}</p>
                      <p className="text-[10px] uppercase text-slate-400">Late</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-600">{s.absent}</p>
                      <p className="text-[10px] uppercase text-slate-400">Absent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-sky-600">{s.excused}</p>
                      <p className="text-[10px] uppercase text-slate-400">Excused</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
