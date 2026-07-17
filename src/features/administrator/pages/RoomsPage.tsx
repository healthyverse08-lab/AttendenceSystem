import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Room } from '@/types';
import {
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useSoftDeleteRoom,
} from '@/features/administrator/hooks/useAdminQueries';

const config: SimpleResourceConfig<Room> = {
  title: 'Rooms',
  description: 'Manage rooms (Sagarmatha, Kanchanjunga, Everest Lab, ...).',
  queryKey: ['admin', 'rooms'],
  useList: useRooms,
  useCreate: useCreateRoom,
  useUpdate: useUpdateRoom,
  useSoftDelete: useSoftDeleteRoom,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'building', header: 'Building', cell: (r) => <span className="text-slate-600">{r.building ?? '—'}</span> },
    { key: 'capacity', header: 'Capacity', cell: (r) => <span className="text-slate-600">{r.capacity ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', building: '', capacity: '', is_active: true },
  validate: (f) => {
    if (!f.name) return { name: 'Name is required' };
    return null;
  },
  formFields: (form, set) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Annapurna Lab" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="building">Building</Label>
        <Input id="building" value={(form.building as string) ?? ''} onChange={(e) => set('building', e.target.value)} placeholder="e.g. Block A" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacity">Capacity</Label>
        <Input id="capacity" type="number" min={0} value={(form.capacity as string | number) ?? ''} onChange={(e) => set('capacity', e.target.value ? parseInt(e.target.value, 10) : null)} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  ),
};

export default function RoomsPage() {
  return <SimpleResourceManager config={config} />;
}
