import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Department } from '@/types';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useSoftDeleteDepartment,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<Department> = {
  title: 'Departments',
  description: 'Manage academic departments. Everything is dynamic.',
  queryKey: ['admin', 'departments'],
  useList: useDepartments,
  useCreate: useCreateDepartment,
  useUpdate: useUpdateDepartment,
  useSoftDelete: useSoftDeleteDepartment,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', header: 'Code', sortable: true, sortValue: (r) => r.code, cell: (r) => <Badge variant="outline">{r.code}</Badge> },
    { key: 'description', header: 'Description', cell: (r) => <span className="text-slate-500">{r.description ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', code: '', description: '', is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    if (!f.code) errs.code = 'Code is required';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Computing" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" value={form.code as string} onChange={(e) => set('code', e.target.value)} placeholder="e.g. CMP" />
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
  ),
};

export default function DepartmentsPage() {
  return <SimpleResourceManager config={config} />;
}
