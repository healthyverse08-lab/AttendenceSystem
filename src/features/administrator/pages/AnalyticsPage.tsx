import { useState } from 'react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import {
  useStudents, useLecturers, useSubjects, useDepartments,
  useSemesters, useSections, usePrograms,
} from '@/features/administrator/hooks/useAdminQueries';

export default function AnalyticsPage() {
  const students = useStudents();
  const lecturers = useLecturers();
  const subjects = useSubjects();
  const departments = useDepartments();
  const semesters = useSemesters();
  const sections = useSections();
  const programs = usePrograms();

  const [byStudent, setByStudent] = useState('');
  const [bySubject, setBySubject] = useState('');
  const [byLecturer, setByLecturer] = useState('');
  const [bySemester, setBySemester] = useState('');
  const [bySection, setBySection] = useState('');
  const [byDepartment, setByDepartment] = useState('');
  const [byProgram, setByProgram] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtersActive = [byStudent, bySubject, byLecturer, bySemester, bySection, byDepartment, byProgram, dateFrom, dateTo].some(Boolean);

  return (
    <div>
      <PageHeader title="Attendance Analytics" description="View attendance breakdowns by student, subject, lecturer, semester, section, department, and program." />

      <Card className="mb-6">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={byStudent || 'none'} onValueChange={(v) => setByStudent(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {students.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.user?.full_name ?? s.student_id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={bySubject || 'none'} onValueChange={(v) => setBySubject(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lecturer</Label>
              <Select value={byLecturer || 'none'} onValueChange={(v) => setByLecturer(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {lecturers.data?.map((l) => <SelectItem key={l.id} value={l.id}>{l.user?.full_name ?? '—'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={bySemester || 'none'} onValueChange={(v) => setBySemester(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={bySection || 'none'} onValueChange={(v) => setBySection(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {sections.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={byDepartment || 'none'} onValueChange={(v) => setByDepartment(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {departments.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={byProgram || 'none'} onValueChange={(v) => setByProgram(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {programs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date From</Label>
              <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date To</Label>
              <input type="date" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {filtersActive ? (
        <Card>
          <CardHeader><CardTitle>Filtered Results</CardTitle></CardHeader>
          <CardContent>
            <EmptyState title="Analytics will populate here" description="Attendance data will be computed from records once attendance sessions are running. The filter framework is ready." />
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="Select filters to view analytics" description="Choose a student, subject, lecturer, semester, section, department, program, or date range to see attendance breakdowns." />
      )}
    </div>
  );
}
