import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Search, PlayCircle, Layers, GraduationCap } from 'lucide-react';
import { useLecturerAssignments } from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function AssignedSubjectsPage() {
  const { data: assignments = [], isLoading } = useLecturerAssignments();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return assignments;
    const q = query.toLowerCase();
    return assignments.filter((a) =>
      a.subject?.name?.toLowerCase().includes(q) ||
      a.subject?.code?.toLowerCase().includes(q) ||
      a.semester?.name?.toLowerCase().includes(q) ||
      a.teaching_type?.name?.toLowerCase().includes(q) ||
      a.sections?.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [assignments, query]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assigned Subjects" description="Subjects and class sections assigned to you." />
        <Skeleton className="h-10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assigned Subjects" description="Subjects and class sections assigned to you." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by subject, code, semester, section…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No matching subjects found" : "No subjects assigned yet"}
          description={query ? "Try a different search term." : "Your assigned subjects will appear here once an administrator assigns them."}
          icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Card className="group h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/10 to-emerald-500/10 text-sky-600">
                      <BookOpen className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                      {a.subject?.code ?? '—'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">{a.subject?.name ?? 'Unknown Subject'}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{a.subject?.code}</p>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <span>Semester: <span className="font-medium text-slate-800">{a.semester?.name ?? '—'}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                      <span>Type: <span className="font-medium text-slate-800">{a.teaching_type?.name ?? '—'}</span></span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600">
                      <Layers className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                      <div className="flex flex-wrap gap-1">
                        {a.sections && a.sections.length > 0 ? (
                          a.sections.map((sec) => (
                            <Badge key={sec.id} variant="outline" className="text-xs">{sec.name}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No sections</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <Link to="/lecturer/start" className="block">
                      <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-sky-50 group-hover:text-sky-700">
                        <PlayCircle className="h-4 w-4" />
                        Start Attendance
                      </Button>
                    </Link>
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
