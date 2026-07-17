import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { ConfirmDialog } from '@/features/administrator/components/ConfirmDialog';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Lecturer, User, Department } from '@/types';
import {
  useLecturers, useDepartments, useCreateLecturer, useUpdateLecturer,
  useSoftDeleteLecturer, useCreateUser, useLogAudit,
} from '@/features/administrator/hooks/useAdminQueries';

type LecturerRow = Lecturer & { user: User | null; department: Department | null };

export default function LecturersPage() {
  const qc = useQueryClient();
  const list = useLecturers();
  const departments = useDepartments();
  const createMut = useCreateLecturer();
  const updateMut = useUpdateLecturer();
  const deleteMut = useSoftDeleteLecturer();
  const createUserMut = useCreateUser();
  const logAudit = useLogAudit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LecturerRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm({ lecturer_id: '', email: '', full_name: '', department_id: '', employment_status: 'active' });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: LecturerRow) {
    setForm({
      lecturer_id: row.lecturer_id ?? '',
      email: row.user?.email ?? '',
      full_name: row.user?.full_name ?? '',
      department_id: row.department_id ?? '',
      employment_status: row.employment_status,
    });
    setEditing(row);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.email || !form.full_name) {
      toast.error('Email and full name are required');
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
          lecturer_id: (form.lecturer_id as string) || null,
          department_id: (form.department_id as string) || null,
          employment_status: form.employment_status as Lecturer['employment_status'],
        });
        toast.success('Lecturer updated');
      } else {
        const userId = crypto.randomUUID();
        await createUserMut.mutateAsync({
          id: userId,
          email: form.email as string,
          full_name: form.full_name as string,
          role: 'lecturer',
        });
        await createMut.mutateAsync({
          user_id: userId,
          lecturer_id: (form.lecturer_id as string) || undefined,
          department_id: (form.department_id as string) || null,
        });
        await logAudit.mutateAsync({ action: 'lecturer_created', entity_type: 'lecturers', metadata: { email: form.email } });
        toast.success('Lecturer created');
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      await logAudit.mutateAsync({ action: 'lecturer_archived', entity_type: 'lecturers', entity_id: deleteId });
      toast.success('Lecturer archived');
      qc.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setDeleteId(null);
    }
  }

  const columns: Column<LecturerRow>[] = [
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
          <span className="font-medium">{r.user?.full_name ?? '—'}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', cell: (r) => <span className="text-slate-500">{r.user?.email ?? '—'}</span> },
    { key: 'lecturer_id', header: 'Lecturer ID', cell: (r) => <span className="text-slate-600">{r.lecturer_id ?? '—'}</span> },
    { key: 'department', header: 'Department', cell: (r) => <span className="text-slate-600">{r.department?.name ?? '—'}</span> },
    {
      key: 'employment_status',
      header: 'Employment',
      cell: (r) => <Badge variant={r.employment_status === 'active' ? 'default' : 'secondary'}>{r.employment_status}</Badge>,
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

  const data = list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Lecturers"
        description="Add, edit, and archive lecturers. Assign subjects, semesters, and sections via Class Assignments."
        actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Lecturer</Button>}
      />

      {data.length > 0 ? (
        <DataTable columns={columns} data={data} loading={list.isLoading} rowKey={(r) => r.id} />
      ) : !list.isLoading ? (
        <EmptyState
          title="No lecturers yet"
          description="Add your first lecturer to get started."
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Lecturer</Button>}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Lecturer' : 'Add Lecturer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={(form.full_name as string) ?? ''} onChange={(e) => setField('full_name', e.target.value)} disabled={!!editing} placeholder="e.g. Dr. Sita Koirala" />
            </div>
            <div className="space-y-1.5">
              <Label>College Email</Label>
              <Input value={(form.email as string) ?? ''} onChange={(e) => setField('email', e.target.value)} disabled={!!editing} placeholder="e.g. sita@techspire.edu.np" />
            </div>
            <div className="space-y-1.5">
              <Label>Lecturer ID</Label>
              <Input value={(form.lecturer_id as string) ?? ''} onChange={(e) => setField('lecturer_id', e.target.value)} placeholder="e.g. L001" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={(form.department_id as string) || 'none'} onValueChange={(v) => setField('department_id', v === 'none' ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment Status</Label>
              <Select value={(form.employment_status as string) ?? 'active'} onValueChange={(v) => setField('employment_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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
        title="Archive this lecturer?"
        description="The lecturer will be soft-deleted and hidden from active lists."
        actionLabel="Archive"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
