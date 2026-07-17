import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Semester } from '@/types';
import {
  useSemesters,
  useCreateSemester,
  useUpdateSemester,
  useSoftDeleteSemester,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<Semester> = {
  title: 'Semesters',
  description: 'Support unlimited semesters. Promotion is always controlled by administrator.',
  queryKey: ['admin', 'semesters'],
  useList: useSemesters,
  useCreate: useCreateSemester,
  useUpdate: useUpdateSemester,
  useSoftDelete: useSoftDeleteSemester,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'number', header: 'Number', sortable: true, sortValue: (r) => r.number, cell: (r) => <span className="text-slate-600">{r.number}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', number: 1, is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    const n = Number(f.number);
    if (!n || n < 1) errs.number = 'Number must be a positive integer';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Semester 1" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="number">Number</Label>
        <Input id="number" type="number" min={1} value={form.number as number} onChange={(e) => set('number', parseInt(e.target.value, 10))} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  ),
};

export default function SemestersPage() {
  return <SimpleResourceManager config={config} />;
}
