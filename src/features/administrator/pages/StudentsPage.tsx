import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, Upload, Pencil, Archive, MoreHorizontal,
  ArrowRightLeft, GraduationCap,
} from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { ConfirmDialog } from '@/features/administrator/components/ConfirmDialog';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudentView, StudentStatus } from '@/types';
import {
  useStudents, useDepartments, usePrograms, useSemesters, useSections,
  useIntakes, useAcademicYears, useCreateStudent, useUpdateStudent,
  useSoftDeleteStudent, useBulkUpdateStudents, useCreateUser, useLogAudit,
} from '@/features/administrator/hooks/useAdminQueries';

type ViewMode = 'active' | 'archived';

export default function StudentsPage() {
  const qc = useQueryClient();
  const list = useStudents();
  const createMut = useCreateStudent();
  const updateMut = useUpdateStudent();
  const deleteMut = useSoftDeleteStudent();
  const bulkMut = useBulkUpdateStudents();
  const createUserMut = useCreateUser();
  const logAudit = useLogAudit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentView | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [bulkOpen, setBulkOpen] = useState<null | 'promote' | 'reassign'>(null);
  const [bulkTarget, setBulkTarget] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const departments = useDepartments();
  const programs = usePrograms();
  const semesters = useSemesters();
  const sections = useSections();
  const intakes = useIntakes();
  const academicYears = useAcademicYears();

  const allStudents = list.data ?? [];
  const activeStudents = allStudents;
  const archivedStudents = allStudents.filter((s) => s.deleted_at !== null);
  const data = viewMode === 'active' ? activeStudents : archivedStudents;

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm({
      student_id: '', email: '', full_name: '', department_id: '', program_id: '',
      semester_id: '', section_id: '', intake_id: '', academic_year_id: '', status: 'active',
    });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: StudentView) {
    setForm({
      student_id: row.student_id,
      email: row.user?.email ?? '',
      full_name: row.user?.full_name ?? '',
      profile_picture_url: row.user?.profile_picture_url ?? '',
      department_id: row.department_id ?? '',
      program_id: row.program_id ?? '',
      semester_id: row.semester_id ?? '',
      section_id: row.section_id ?? '',
      intake_id: row.intake_id ?? '',
      academic_year_id: row.academic_year_id ?? '',
      status: row.status,
    });
    setEditing(row);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.email || !form.full_name) {
      toast.error('Student ID, email, and full name are required');
      return;
    }
    if (!form.email.toString().endsWith('@techspire.edu.np')) {
      toast.error('Email must end with @techspire.edu.np');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          department_id: (form.department_id as string) || null,
          program_id: (form.program_id as string) || null,
          semester_id: (form.semester_id as string) || null,
          section_id: (form.section_id as string) || null,
          intake_id: (form.intake_id as string) || null,
          academic_year_id: (form.academic_year_id as string) || null,
          status: form.status as StudentStatus,
        });
        toast.success('Student updated');
      } else {
        // Create user record first (admin creates the profile; the student
        // will sign in with Google later and be matched by email)
        const userId = crypto.randomUUID();
        await createUserMut.mutateAsync({
          id: userId,
          email: form.email as string,
          full_name: form.full_name as string,
          role: 'student',
          profile_picture_url: (form.profile_picture_url as string) || null,
        });
        await createMut.mutateAsync({
          student_id: form.student_id as string,
          user_id: userId,
          department_id: (form.department_id as string) || null,
          program_id: (form.program_id as string) || null,
          semester_id: (form.semester_id as string) || null,
          section_id: (form.section_id as string) || null,
          intake_id: (form.intake_id as string) || null,
          academic_year_id: (form.academic_year_id as string) || null,
        });
        await logAudit.mutateAsync({ action: 'student_created', entity_type: 'students', metadata: { email: form.email } });
        toast.success('Student created');
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      await logAudit.mutateAsync({ action: 'student_archived', entity_type: 'students', entity_id: deleteId });
      toast.success('Student archived');
      qc.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setDeleteId(null);
    }
  }

  async function handleBulkPromote() {
    if (!bulkTarget) {
      toast.error('Select a target semester');
      return;
    }
    const updates = Array.from(selected).map((id) => ({ id, semester_id: bulkTarget }));
    try {
      await bulkMut.mutateAsync(updates);
      await logAudit.mutateAsync({ action: 'bulk_semester_promotion', entity_type: 'students', metadata: { count: updates.length, semester_id: bulkTarget } });
      toast.success(`${updates.length} students promoted`);
      setSelected(new Set());
      setBulkOpen(null);
      setBulkTarget('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk promotion failed');
    }
  }

  async function handleBulkReassign() {
    if (!bulkTarget) {
      toast.error('Select a target section');
      return;
    }
    const updates = Array.from(selected).map((id) => ({ id, section_id: bulkTarget }));
    try {
      await bulkMut.mutateAsync(updates);
      await logAudit.mutateAsync({ action: 'bulk_section_reassignment', entity_type: 'students', metadata: { count: updates.length, section_id: bulkTarget } });
      toast.success(`${updates.length} students reassigned`);
      setSelected(new Set());
      setBulkOpen(null);
      setBulkTarget('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk reassignment failed');
    }
  }

  async function handleCsvImport() {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV needs a header row and at least one data row');
      return;
    }
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1);
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      const cells = row.split(',').map((c) => c.trim());
      const get = (key: string) => cells[headers.indexOf(key)] ?? '';
      const email = get('email');
      const fullName = get('full_name');
      const studentId = get('student_id');
      if (!email || !fullName || !studentId || !email.endsWith('@techspire.edu.np')) {
        failed++;
        continue;
      }
      try {
        const userId = crypto.randomUUID();
        await createUserMut.mutateAsync({ id: userId, email, full_name: fullName, role: 'student' });
        await createMut.mutateAsync({
          student_id: studentId,
          user_id: userId,
          department_id: get('department_id') || null,
          program_id: get('program_id') || null,
          semester_id: get('semester_id') || null,
          section_id: get('section_id') || null,
          intake_id: get('intake_id') || null,
          academic_year_id: get('academic_year_id') || null,
        });
        success++;
      } catch {
        failed++;
      }
    }
    toast.success(`${success} students imported${failed ? `, ${failed} failed` : ''}`);
    setCsvOpen(false);
    setCsvText('');
    qc.invalidateQueries({ queryKey: ['admin', 'students'] });
  }

  const columns: Column<StudentView>[] = [
    {
      key: 'student_id',
      header: 'Student ID',
      sortable: true,
      sortValue: (r) => r.student_id,
      cell: (r) => <span className="font-medium">{r.student_id}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (r) => r.user?.full_name ?? '',
      cell: (r) => (
        <div className="flex items-center gap-2">
          {r.user?.profile_picture_url ? (
            <img src={r.user.profile_picture_url} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
              {r.user?.full_name?.charAt(0) ?? '?'}
            </div>
          )}
          <span>{r.user?.full_name ?? '—'}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', cell: (r) => <span className="text-slate-500">{r.user?.email ?? '—'}</span> },
    { key: 'department', header: 'Department', cell: (r) => <span className="text-slate-600">{r.department?.name ?? '—'}</span> },
    { key: 'program', header: 'Program', cell: (r) => <span className="text-slate-600">{r.program?.name ?? '—'}</span> },
    { key: 'semester', header: 'Semester', cell: (r) => <span className="text-slate-600">{r.semester?.name ?? '—'}</span> },
    { key: 'section', header: 'Section', cell: (r) => <Badge variant="outline">{r.section?.name ?? '—'}</Badge> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(row.id)}>
                <Archive className="mr-2 h-4 w-4" />Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        description="Create, edit, archive, bulk promote, and bulk reassign students."
        actions={
          <>
            <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />CSV Import</Button>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Student</Button>
          </>
        }
      />

      {/* View toggle + bulk actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Button size="sm" variant={viewMode === 'active' ? 'default' : 'ghost'} onClick={() => setViewMode('active')}>Active</Button>
          <Button size="sm" variant={viewMode === 'archived' ? 'default' : 'ghost'} onClick={() => setViewMode('archived')}>Archived</Button>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen('promote')}>
              <GraduationCap className="mr-1.5 h-4 w-4" />Promote
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen('reassign')}>
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />Reassign
            </Button>
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          loading={list.isLoading}
          rowKey={(r) => r.id}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
      ) : !list.isLoading ? (
        <EmptyState
          title={viewMode === 'active' ? 'No active students' : 'No archived students'}
          description="Students will appear here once created or imported."
          action={viewMode === 'active' ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Student</Button> : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Student ID</Label>
              <Input value={(form.student_id as string) ?? ''} onChange={(e) => setField('student_id', e.target.value)} disabled={!!editing} placeholder="e.g. TS2024001" />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={(form.full_name as string) ?? ''} onChange={(e) => setField('full_name', e.target.value)} disabled={!!editing} placeholder="e.g. Ram Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>Techspire Email</Label>
              <Input value={(form.email as string) ?? ''} onChange={(e) => setField('email', e.target.value)} disabled={!!editing} placeholder="e.g. ram@techspire.edu.np" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={(form.department_id as string) || 'none'} onValueChange={(v) => setField('department_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={(form.program_id as string) || 'none'} onValueChange={(v) => setField('program_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {programs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={(form.semester_id as string) || 'none'} onValueChange={(v) => setField('semester_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={(form.section_id as string) || 'none'} onValueChange={(v) => setField('section_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {sections.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Intake</Label>
              <Select value={(form.intake_id as string) || 'none'} onValueChange={(v) => setField('intake_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {intakes.data?.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={(form.academic_year_id as string) || 'none'} onValueChange={(v) => setField('academic_year_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {academicYears.data?.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={(form.status as string) ?? 'active'} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk action dialog */}
      <Dialog open={bulkOpen !== null} onOpenChange={(o) => !o && setBulkOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{bulkOpen === 'promote' ? 'Bulk Semester Promotion' : 'Bulk Section Reassignment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{bulkOpen === 'promote' ? 'Target Semester' : 'Target Section'}</Label>
            <Select value={bulkTarget} onValueChange={setBulkTarget}>
              <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
              <SelectContent>
                {bulkOpen === 'promote'
                  ? semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                  : sections.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">{selected.size} students will be affected.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(null)}>Cancel</Button>
            <Button onClick={bulkOpen === 'promote' ? handleBulkPromote : handleBulkReassign}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk CSV Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              CSV header: <code className="rounded bg-slate-100 px-1 text-xs">student_id,full_name,email,department_id,program_id,semester_id,section_id,intake_id,academic_year_id</code>
            </p>
            <Textarea rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="student_id,full_name,email,..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancel</Button>
            <Button onClick={handleCsvImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Archive this student?"
        description="The student will be soft-deleted and hidden from active lists. Attendance history is preserved."
        actionLabel="Archive"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
