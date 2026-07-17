import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SubjectView } from '@/types';
import {
  useSubjects,
  useDepartments,
  usePrograms,
  useSemesters,
  useCreateSubject,
  useUpdateSubject,
  useSoftDeleteSubject,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<SubjectView> = {
  title: 'Subjects',
  description: 'Manage subjects with code, credits, department, program, and semester.',
  queryKey: ['admin', 'subjects'],
  useList: useSubjects,
  useCreate: useCreateSubject,
  useUpdate: useUpdateSubject,
  useSoftDelete: useSoftDeleteSubject,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', header: 'Code', cell: (r) => <Badge variant="outline">{r.code}</Badge> },
    { key: 'credits', header: 'Credits', cell: (r) => <span className="text-slate-600">{r.credits ?? '—'}</span> },
    { key: 'department', header: 'Department', cell: (r) => <span className="text-slate-600">{r.department?.name ?? '—'}</span> },
    { key: 'program', header: 'Program', cell: (r) => <span className="text-slate-600">{r.program?.name ?? '—'}</span> },
    { key: 'semester', header: 'Semester', cell: (r) => <span className="text-slate-600">{r.semester?.name ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', code: '', credits: '', department_id: '', program_id: '', semester_id: '', is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    if (!f.code) errs.code = 'Code is required';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => <SubjectForm form={form} set={set} />,
};

function SubjectForm({ form, set }: { form: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const depts = useDepartments();
  const programs = usePrograms();
  const semesters = useSemesters();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Data Structures" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={form.code as string} onChange={(e) => set('code', e.target.value)} placeholder="e.g. CS201" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credits">Credit Hours</Label>
        <Input id="credits" type="number" min={0} value={(form.credits as string | number) ?? ''} onChange={(e) => set('credits', e.target.value ? parseInt(e.target.value, 10) : null)} />
      </div>
      <div className="space-y-1.5">
        <Label>Department</Label>
        <Select value={(form.department_id as string) || 'none'} onValueChange={(v) => set('department_id', v === 'none' ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Program</Label>
        <Select value={(form.program_id as string) || 'none'} onValueChange={(v) => set('program_id', v === 'none' ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {programs.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Semester</Label>
        <Select value={(form.semester_id as string) || 'none'} onValueChange={(v) => set('semester_id', v === 'none' ? null : v)}>
          <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  );
}

export default function SubjectsPage() {
  return <SimpleResourceManager config={config} />;
}
