import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X, Eye } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { DataTable, type Column } from '@/features/administrator/components/DataTable';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { LeaveApplication } from '@/types';
import { useLeaveApplications, useReviewLeave, useLogAudit } from '@/features/administrator/hooks/useAdminQueries';

export default function LeaveApplicationsPage() {
  const qc = useQueryClient();
  const list = useLeaveApplications();
  const reviewMut = useReviewLeave();
  const logAudit = useLogAudit();
  const [viewing, setViewing] = useState<LeaveApplication | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    try {
      await reviewMut.mutateAsync({ id, status });
      await logAudit.mutateAsync({ action: status === 'approved' ? 'leave_approved' : 'leave_rejected', entity_type: 'leave_applications', entity_id: id });
      toast.success(`Leave ${status}`);
      qc.invalidateQueries({ queryKey: ['admin', 'leave'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed');
    }
  }

  const all = list.data ?? [];
  const data = filter === 'all' ? all : all.filter((l) => l.status === filter);

  const columns: Column<LeaveApplication>[] = [
    { key: 'applicant_role', header: 'Role', cell: (r) => <Badge variant="outline">{r.applicant_role}</Badge> },
    { key: 'start_date', header: 'Start', cell: (r) => <span className="text-slate-600">{r.start_date}</span> },
    { key: 'end_date', header: 'End', cell: (r) => <span className="text-slate-600">{r.end_date}</span> },
    { key: 'reason', header: 'Reason', cell: (r) => <span className="text-slate-500 truncate max-w-xs">{r.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={r.status === 'pending' ? 'default' : r.status === 'approved' ? 'secondary' : 'destructive'}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(row)}><Eye className="h-4 w-4" /></Button>
          {row.status === 'pending' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleReview(row.id, 'approved')}><Check className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleReview(row.id, 'rejected')}><X className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Leave Applications" description="Review and manage student and lecturer leave requests." />

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'ghost'} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>

      {data.length > 0 ? (
        <DataTable columns={columns} data={data} loading={list.isLoading} rowKey={(r) => r.id} />
      ) : !list.isLoading ? (
        <EmptyState title="No leave applications" description="Leave requests will appear here." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />)}</div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Leave Application Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Role:</span> {viewing.applicant_role}</div>
              <div><span className="font-medium">Dates:</span> {viewing.start_date} → {viewing.end_date}</div>
              <div><span className="font-medium">Status:</span> {viewing.status}</div>
              <div><span className="font-medium">Reason:</span><p className="mt-1 text-slate-600">{viewing.reason}</p></div>
              {viewing.reviewed_at && <div><span className="font-medium">Reviewed:</span> {new Date(viewing.reviewed_at).toLocaleString()}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
