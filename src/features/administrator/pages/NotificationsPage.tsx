import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Send } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Notification, NotificationType } from '@/types';
import {
  useNotifications, useBulkCreateNotifications, useStudents, useLecturers,
  useDepartments, useSemesters, useSections, useLogAudit,
} from '@/features/administrator/hooks/useAdminQueries';

const TYPE_COLORS: Record<NotificationType, string> = {
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  emergency: 'bg-rose-100 text-rose-700',
  error: 'bg-rose-100 text-rose-700',
  attendance: 'bg-violet-100 text-violet-700',
  leave: 'bg-amber-100 text-amber-700',
  system: 'bg-slate-100 text-slate-700',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const list = useNotifications();
  const students = useStudents();
  const lecturers = useLecturers();
  const departments = useDepartments();
  const semesters = useSemesters();
  const sections = useSections();
  const bulkCreate = useBulkCreateNotifications();
  const logAudit = useLogAudit();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', type: 'info' as NotificationType, audience: 'college' as string, targetId: '' });

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSend() {
    if (!form.title) {
      toast.error('Title is required');
      return;
    }
    try {
      let userIds: string[] = [];
      if (form.audience === 'college') {
        const all = [...(students.data ?? []), ...(lecturers.data ?? [])];
        userIds = all.map((r) => ('user_id' in r ? r.user_id : '')).filter(Boolean);
      } else if (form.audience === 'department' && form.targetId) {
        userIds = (students.data ?? []).filter((s) => s.department_id === form.targetId).map((s) => s.user_id);
      } else if (form.audience === 'semester' && form.targetId) {
        userIds = (students.data ?? []).filter((s) => s.semester_id === form.targetId).map((s) => s.user_id);
      } else if (form.audience === 'section' && form.targetId) {
        userIds = (students.data ?? []).filter((s) => s.section_id === form.targetId).map((s) => s.user_id);
      } else if (form.audience === 'student' && form.targetId) {
        userIds = [form.targetId];
      } else if (form.audience === 'lecturer' && form.targetId) {
        userIds = [form.targetId];
      }
      if (userIds.length === 0) {
        toast.error('No recipients found for the selected audience');
        return;
      }
      const rows = userIds.map((user_id) => ({ user_id, title: form.title, body: form.body || undefined, type: form.type }));
      await bulkCreate.mutateAsync(rows);
      await logAudit.mutateAsync({ action: 'notification_sent', entity_type: 'notifications', metadata: { audience: form.audience, count: rows.length } });
      toast.success(`Notification sent to ${rows.length} recipients`);
      setModalOpen(false);
      setForm({ title: '', body: '', type: 'info', audience: 'college', targetId: '' });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    }
  }

  const columns: Column<Notification>[] = [
    { key: 'title', header: 'Title', sortable: true, sortValue: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'type', header: 'Type', cell: (r) => <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[r.type]}`}>{r.type}</span> },
    { key: 'body', header: 'Body', cell: (r) => <span className="text-slate-500 truncate max-w-xs">{r.body ?? '—'}</span> },
    { key: 'is_read', header: 'Read', cell: (r) => <Badge variant={r.is_read ? 'secondary' : 'default'}>{r.is_read ? 'Read' : 'Unread'}</Badge> },
    { key: 'created_at', header: 'Sent', cell: (r) => <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span> },
  ];

  const data = list.data ?? [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Send announcements to the entire college, a department, semester, section, or individual."
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="mr-2 h-4 w-4" />New Notification</Button>}
      />

      {data.length > 0 ? (
        <DataTable columns={columns} data={data} loading={list.isLoading} rowKey={(r) => r.id} />
      ) : !list.isLoading ? (
        <EmptyState title="No notifications yet" description="Send your first announcement to get started." action={<Button onClick={() => setModalOpen(true)}><Plus className="mr-2 h-4 w-4" />New Notification</Button>} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}</div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Announcement title" />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setField('body', e.target.value)} placeholder="Announcement details..." />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => { setField('audience', v); setField('targetId', ''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="college">Entire College</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="student">Individual Student</SelectItem>
                  <SelectItem value="lecturer">Individual Lecturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.audience === 'department' && (
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.targetId} onValueChange={(v) => setField('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.audience === 'semester' && (
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <Select value={form.targetId} onValueChange={(v) => setField('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>{semesters.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.audience === 'section' && (
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={form.targetId} onValueChange={(v) => setField('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>{sections.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.audience === 'student' && (
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={form.targetId} onValueChange={(v) => setField('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.data?.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.user?.full_name ?? s.student_id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.audience === 'lecturer' && (
              <div className="space-y-1.5">
                <Label>Lecturer</Label>
                <Select value={form.targetId} onValueChange={(v) => setField('targetId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select lecturer" /></SelectTrigger>
                  <SelectContent>{lecturers.data?.map((l) => <SelectItem key={l.user_id} value={l.user_id}>{l.user?.full_name ?? '—'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={bulkCreate.isPending}><Send className="mr-2 h-4 w-4" />Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
