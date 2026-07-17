import { SimpleResourceManager, type SimpleResourceConfig } from '@/features/administrator/components/SimpleResourceManager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Intake, AcademicYear } from '@/types';
import {
  useIntakes,
  useAcademicYears,
  useCreateIntake,
  useUpdateIntake,
  useSoftDeleteIntake,
} from '@/features/administrator/hooks/useAdminQueries';

type IntakeRow = Intake & { academic_year: AcademicYear | null };

const config: SimpleResourceConfig<IntakeRow> = {
  title: 'Intakes',
  description: 'Create unlimited intakes. Students belong to an intake.',
  queryKey: ['admin', 'intakes'],
  useList: useIntakes,
  useCreate: useCreateIntake,
  useUpdate: useUpdateIntake,
  useSoftDelete: useSoftDeleteIntake,
  rowKey: (r) => r.id,
  columns: [
    { key: 'name', header: 'Name', sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'academic_year', header: 'Academic Year', cell: (r) => <span className="text-slate-600">{r.academic_year?.name ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ],
  initialValues: { name: '', academic_year_id: '', start_date: '', end_date: '', is_active: true },
  validate: (f) => {
    const errs: Record<string, string> = {};
    if (!f.name) errs.name = 'Name is required';
    if (!f.academic_year_id) errs.academic_year_id = 'Academic year is required';
    return Object.keys(errs).length ? errs : null;
  },
  formFields: (form, set) => <IntakeForm form={form} set={set} />,
};

function IntakeForm({ form, set }: { form: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const years = useAcademicYears();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. F251" />
      </div>
      <div className="space-y-1.5">
        <Label>Academic Year</Label>
        <Select value={(form.academic_year_id as string) ?? ''} onValueChange={(v) => set('academic_year_id', v)}>
          <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
          <SelectContent>
            {years.data?.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" value={(form.start_date as string) ?? ''} onChange={(e) => set('start_date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" value={(form.end_date as string) ?? ''} onChange={(e) => set('end_date', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active as boolean} onChange={(e) => set('is_active', e.target.checked)} />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  );
}

export default function IntakesPage() {
  return <SimpleResourceManager config={config} />;
}
