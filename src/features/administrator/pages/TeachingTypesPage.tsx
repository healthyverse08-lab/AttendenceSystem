import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { TeachingType } from '@/types';
import {
  useTeachingTypes,
  useCreateTeachingType,
  useUpdateTeachingType,
  useSoftDeleteTeachingType,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<TeachingType> = {
  title: 'Teaching Types',
  description: 'Configure teaching types (Lecture, Tutorial, Practical, Workshop, Seminar, ...).',
  queryKey: ['admin', 'teaching-types'],
  useList: useTeachingTypes,
  useCreate: useCreateTeachingType,
  useUpdate: useUpdateTeachingType,
  useSoftDelete: useSoftDeleteTeachingType,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', is_active: true },
  validate: (f) => {
    if (!f.name) return { name: 'Name is required' };
    return null;
  },
  formFields: (form, set) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Workshop" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  ),
};

export default function TeachingTypesPage() {
  return <SimpleResourceManager config={config} />;
}
