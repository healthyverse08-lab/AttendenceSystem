import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AcademicYear } from '@/types';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useSoftDeleteAcademicYear,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<AcademicYear> = {
  title: 'Academic Years',
  description: 'Create and manage academic years.',
  queryKey: ['admin', 'academic-years'],
  useList: useAcademicYears,
  useCreate: useCreateAcademicYear,
  useUpdate: useUpdateAcademicYear,
  useSoftDelete: useSoftDeleteAcademicYear,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'start_date', header: 'Start', cell: (r) => <span className="text-slate-600">{r.start_date}</span> },
    { key: 'end_date', header: 'End', cell: (r) => <span className="text-slate-600">{r.end_date}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', start_date: '', end_date: '', is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    if (!f.start_date) errs.start_date = 'Start date is required';
    if (!f.end_date) errs.end_date = 'End date is required';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 2025" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" value={form.start_date as string} onChange={(e) => set('start_date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" value={form.end_date as string} onChange={(e) => set('end_date', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  ),
};

export default function AcademicYearsPage() {
  return <SimpleResourceManager config={config} />;
}
