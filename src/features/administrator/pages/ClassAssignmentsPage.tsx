import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { ConfirmDialog } from '@/features/administrator/components/ConfirmDialog';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClassAssignmentView } from '@/types';
import {
  useClassAssignments, useSubjects, useSemesters, useTeachingTypes,
  useLecturers, useSections, useAcademicYears,
  useCreateClassAssignment, useUpdateClassAssignment, useSoftDeleteClassAssignment,
  useLogAudit,
} from '@/features/administrator/hooks/useAdminQueries';

export default function ClassAssignmentsPage() {
  const qc = useQueryClient();
  const list = useClassAssignments();
  const subjects = useSubjects();
  const semesters = useSemesters();
  const teachingTypes = useTeachingTypes();
  const lecturers = useLecturers();
  const sections = useSections();
  const academicYears = useAcademicYears();
  const createMut = useCreateClassAssignment();
  const updateMut = useUpdateClassAssignment();
  const deleteMut = useSoftDeleteClassAssignment();
  const logAudit = useLogAudit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassAssignmentView | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm({ subject_id: '', semester_id: '', teaching_type_id: '', lecturer_id: '', academic_year_id: '', is_active: true });
    setSelectedSections(new Set());
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: ClassAssignmentView) {
    setForm({
      subject_id: row.subject_id,
      semester_id: row.semester_id,
      teaching_type_id: row.teaching_type_id,
      lecturer_id: row.lecturer_id,
      academic_year_id: row.academic_year_id ?? '',
      is_active: row.is_active,
    });
    setSelectedSections(new Set(row.sections?.map((s) => s.id) ?? []));
    setEditing(row);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.subject_id || !form.semester_id || !form.teaching_type_id || !form.lecturer_id) {
      toast.error('Subject, semester, teaching type, and lecturer are required');
      return;
    }
    if (selectedSections.size === 0) {
      toast.error('Select at least one section');
      return;
    }
    try {
      const sectionIds = Array.from(selectedSections);
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          subject_id: form.subject_id as string,
          semester_id: form.semester_id as string,
          teaching_type_id: form.teaching_type_id as string,
          lecturer_id: form.lecturer_id as string,
          academic_year_id: (form.academic_year_id as string) || null,
          is_active: form.is_active as boolean,
          section_ids: sectionIds,
        });
        toast.success('Class assignment updated');
      } else {
        await createMut.mutateAsync({
          subject_id: form.subject_id as string,
          semester_id: form.semester_id as string,
          teaching_type_id: form.teaching_type_id as string,
          lecturer_id: form.lecturer_id as string,
          academic_year_id: (form.academic_year_id as string) || null,
          section_ids: sectionIds,
        });
        await logAudit.mutateAsync({ action: 'class_assignment_created', entity_type: 'class_assignments' });
        toast.success('Class assignment created');
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'class-assignments'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast.success('Class assignment archived');
      qc.invalidateQueries({ queryKey: ['admin', 'class-assignments'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setDeleteId(null);
    }
  }

  const columns: Column<ClassAssignmentView>[] = [
    { key: 'subject', header: 'Subject', sortable: true, sortValue: (r) => r.subject?.name ?? '', cell: (r) => <span className="font-medium">{r.subject?.name ?? '—'}</span> },
    { key: 'lecturer', header: 'Lecturer', cell: (r) => <span className="text-slate-600">{r.lecturer?.user?.full_name ?? '—'}</span> },
    { key: 'semester', header: 'Semester', cell: (r) => <span className="text-slate-600">{r.semester?.name ?? '—'}</span> },
    { key: 'teaching_type', header: 'Type', cell: (r) => <Badge variant="outline">{r.teaching_type?.name ?? '—'}</Badge> },
    { key: 'sections', header: 'Sections', cell: (r) => <div className="flex flex-wrap gap-1">{r.sections?.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}</div> },
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

  const data = list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Class Assignments"
        description="Assign lecturers to subjects, semesters, teaching types, and sections. These determine what attendance sessions lecturers may create."
        actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Assignment</Button>}
      />

      {data.length > 0 ? (
        <DataTable columns={columns} data={data} loading={list.isLoading} rowKey={(r) => r.id} />
      ) : !list.isLoading ? (
        <EmptyState
          title="No class assignments yet"
          description="Create assignments to link lecturers, subjects, and sections."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Assignment</Button>}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Class Assignment' : 'Add Class Assignment'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={(form.subject_id as string) || ''} onValueChange={(v) => setField('subject_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lecturer</Label>
              <Select value={(form.lecturer_id as string) || ''} onValueChange={(v) => setField('lecturer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                <SelectContent>
                  {lecturers.data?.map((l) => <SelectItem key={l.id} value={l.id}>{l.user?.full_name ?? '—'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={(form.semester_id as string) || ''} onValueChange={(v) => setField('semester_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Teaching Type</Label>
              <Select value={(form.teaching_type_id as string) || ''} onValueChange={(v) => setField('teaching_type_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {teachingTypes.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={(form.academic_year_id as string) || 'none'} onValueChange={(v) => setField('academic_year_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {academicYears.data?.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sections</Label>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 p-3">
              {sections.data?.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedSections.has(s.id)}
                    onCheckedChange={() => {
                      const next = new Set(selectedSections);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      setSelectedSections(next);
                    }}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Archive this class assignment?"
        description="The assignment will be soft-deleted. Existing attendance records are preserved."
        actionLabel="Archive"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
