import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  useStudents, useLecturers, useSubjects, useDepartments,
  useSemesters, useSections, usePrograms,
} from '@/features/administrator/hooks/useAdminQueries';

interface SearchResult {
  type: string;
  label: string;
  subtitle: string;
  link: string;
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);

  const students = useStudents();
  const lecturers = useLecturers();
  const subjects = useSubjects();
  const departments = useDepartments();
  const semesters = useSemesters();
  const sections = useSections();
  const programs = usePrograms();

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    students.data?.forEach((s) => {
      if (s.student_id.toLowerCase().includes(q) || s.user?.full_name?.toLowerCase().includes(q)) {
        results.push({ type: 'Student', label: s.user?.full_name ?? s.student_id, subtitle: `${s.student_id} · ${s.section?.name ?? ''}`, link: '/admin/students' });
      }
    });
    lecturers.data?.forEach((l) => {
      if (l.user?.full_name?.toLowerCase().includes(q)) {
        results.push({ type: 'Lecturer', label: l.user?.full_name ?? '', subtitle: l.department?.name ?? '', link: '/admin/lecturers' });
      }
    });
    subjects.data?.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) {
        results.push({ type: 'Subject', label: s.name, subtitle: s.code, link: '/admin/subjects' });
      }
    });
    departments.data?.forEach((d) => {
      if (d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) {
        results.push({ type: 'Department', label: d.name, subtitle: d.code, link: '/admin/departments' });
      }
    });
    semesters.data?.forEach((s) => {
      if (s.name.toLowerCase().includes(q)) {
        results.push({ type: 'Semester', label: s.name, subtitle: `Semester ${s.number}`, link: '/admin/semesters' });
      }
    });
    sections.data?.forEach((s) => {
      if (s.name.toLowerCase().includes(q)) {
        results.push({ type: 'Section', label: s.name, subtitle: '', link: '/admin/sections' });
      }
    });
    programs.data?.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
        results.push({ type: 'Program', label: p.name, subtitle: p.code, link: '/admin/programs' });
      }
    });
    return results;
  }, [query, students.data, lecturers.data, subjects.data, departments.data, semesters.data, sections.data, programs.data]);

  return (
    <div>
      <PageHeader title="Global Search" description="Search by student ID, student name, lecturer name, subject, section, semester, program, or department." />

      <div className="relative mb-6 max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, i) => (
            <Link key={i} to={r.link}>
              <Card className="transition hover:shadow-md hover:border-sky-300">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{r.label}</p>
                    {r.subtitle && <p className="text-sm text-slate-500">{r.subtitle}</p>}
                  </div>
                  <Badge variant="outline">{r.type}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : query.trim() ? (
        <EmptyState title="No results found" description={`No matches for "${query}"`} />
      ) : (
        <EmptyState title="Start typing to search" description="Results will appear as you type." />
      )}
    </div>
  );
}
