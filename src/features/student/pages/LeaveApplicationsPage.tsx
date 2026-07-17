import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, CalendarX, Check, X, Clock, Eye } from 'lucide-react';
import {
  useStudentLeaveApplications, useCreateLeaveApplication,
} from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { LeaveApplication } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LeaveApplicationsPage() {
  const { data: applications = [], isLoading } = useStudentLeaveApplications();
  const createMut = useCreateLeaveApplication();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [viewing, setViewing] = useState<LeaveApplication | null>(null);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be after start date');
      return;
    }
    try {
      await createMut.mutateAsync(form);
      toast.success('Leave application submitted');
      setModalOpen(false);
      setForm({ start_date: '', end_date: '', reason: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Leave Applications" description="Apply for leave and track your application status." />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Applications"
        description="Apply for leave and track your application status."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Apply for Leave
          </Button>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          title="No leave applications"
          description="Submit a leave application to get started."
          icon={<CalendarX className="h-6 w-6" strokeWidth={1.5} />}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Apply for Leave
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                      app.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {app.status === 'approved' ? <Check className="h-5 w-5" /> :
                       app.status === 'rejected' ? <X className="h-5 w-5" /> :
                       <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(app.start_date)} → {formatDate(app.end_date)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{app.reason}</p>
                      {app.reviewed_at && (
                        <p className="mt-1 text-xs text-slate-400">
                          Reviewed {formatDate(app.reviewed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize ${
                      app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      app.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(app)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={4}
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
                placeholder="Explain the reason for your leave…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Leave Application Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Dates:</span> {formatDate(viewing.start_date)} → {formatDate(viewing.end_date)}</div>
              <div><span className="font-medium">Status:</span> <Badge className="capitalize ml-1">{viewing.status}</Badge></div>
              <div><span className="font-medium">Reason:</span><p className="mt-1 text-slate-600">{viewing.reason}</p></div>
              {viewing.reviewed_at && (
                <div><span className="font-medium">Reviewed:</span> {formatDate(viewing.reviewed_at)}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
