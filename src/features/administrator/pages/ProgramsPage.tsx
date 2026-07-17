import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Program, Department } from '@/types';
import {
  usePrograms,
  useDepartments,
  useCreateProgram,
  useUpdateProgram,
  useSoftDeleteProgram,
} from '@/features/administrator/hooks/useAdminQueries';

type ProgramRow = Program & { department: Department | null };

const config: SimpleResourceConfig<ProgramRow> = {
  title: 'Programs',
  description: 'Programs belong to departments. Create unlimited programs.',
  queryKey: ['admin', 'programs'],
  useList: usePrograms,
  useCreate: useCreateProgram,
  useUpdate: useUpdateProgram,
  useSoftDelete: useSoftDeleteProgram,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', header: 'Code', cell: (r) => <Badge variant="outline">{r.code}</Badge> },
    { key: 'department', header: 'Department', cell: (r) => <span className="text-slate-600">{r.department?.name ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', code: '', department_id: '', description: '', is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    if (!f.code) errs.code = 'Code is required';
    if (!f.department_id) errs.department_id = 'Department is required';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => (
    <ProgramForm form={form} set={set} />
  ),
};

function ProgramForm({ form, set }: { form: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const depts = useDepartments();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. BSc Computing" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" value={form.code as string} onChange={(e) => set('code', e.target.value)} placeholder="e.g. BSC" />
      </div>
      <div className="space-y-1.5">
        <Label>Department</Label>
        <Select value={(form.department_id as string) ?? ''} onValueChange={(v) => set('department_id', v)}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={(form.description as string) ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  );
}

export default function ProgramsPage() {
  return <SimpleResourceManager config={config} />;
}
