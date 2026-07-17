import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PlayCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import {
  useLecturerAssignments, useCurrentLecturer, useCreateAttendanceSession, useStartAttendance,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ClassAssignmentView } from '@/types';

function toLocalInput(date: Date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export default function StartAttendancePage() {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading: loadingAssignments } = useLecturerAssignments();
  const { data: lecturer } = useCurrentLecturer();
  const createSession = useCreateAttendanceSession();
  const startAttendance = useStartAttendance();

  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 90 * 60 * 1000);

  const [assignmentId, setAssignmentId] = useState<string>('');
  const [startTime, setStartTime] = useState(toLocalInput(now));
  const [endTime, setEndTime] = useState(toLocalInput(defaultEnd));
  const [comments, setComments] = useState('');
  const [duration, setDuration] = useState('15');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) as ClassAssignmentView | undefined,
    [assignments, assignmentId]
  );

  const valid = assignmentId && startTime && endTime && new Date(endTime) > new Date(startTime);

  async function handleConfirm() {
    if (!selectedAssignment || !lecturer) return;
    try {
      const session = await createSession.mutateAsync({
        class_assignment_id: selectedAssignment.id,
        lecturer_id: (lecturer as { id: string }).id,
        subject_id: selectedAssignment.subject_id,
        teaching_type_id: selectedAssignment.teaching_type_id,
        semester_id: selectedAssignment.semester_id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        comments: comments.trim() || null,
        section_ids: selectedAssignment.sections?.map((s) => s.id) ?? [],
        qr_rotation_seconds: 15,
        attendance_duration_seconds: parseInt(duration, 10) * 60,
      });
      await startAttendance.mutateAsync({
        sessionId: session.id,
        durationSeconds: parseInt(duration, 10) * 60,
      });
      toast.success('Attendance session started successfully.');
      navigate('/lecturer/active');
    } catch (err) {
      toast.error('Failed to start session', { description: (err as Error).message });
    }
  }

  if (loadingAssignments) {
    return (
      <div className="space-y-6">
        <PageHeader title="Start Attendance Session" description="Create and launch a new attendance session." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Start Attendance Session" description="Create and launch a new attendance session." />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-amber-400" strokeWidth={1.5} />
            <p className="text-sm font-medium text-slate-700">No assigned subjects</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              You need at least one class assignment before you can start an attendance session.
              Contact an administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Start Attendance Session" description="Create and launch a new attendance session." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Class Assignment <span className="text-rose-500">*</span></Label>
                <Select value={assignmentId} onValueChange={setAssignmentId}>
                  <SelectTrigger><SelectValue placeholder="Select a subject / class…" /></SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.subject?.name} ({a.subject?.code}) — {a.teaching_type?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time <span className="text-rose-500">*</span></Label>
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time <span className="text-rose-500">*</span></Label>
                  <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Attendance Window (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30, 45, 60, 90].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Students can submit attendance within this window after you start.</p>
              </div>

              <div className="space-y-2">
                <Label>Comments (optional)</Label>
                <Textarea
                  placeholder="Session notes, special instructions…"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {selectedAssignment ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subject</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{selectedAssignment.subject?.name}</p>
                    <p className="text-xs text-slate-500">{selectedAssignment.subject?.code}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Teaching Type</p>
                    <p className="mt-0.5 text-sm text-slate-700">{selectedAssignment.teaching_type?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Semester</p>
                    <p className="mt-0.5 text-sm text-slate-700">{selectedAssignment.semester?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sections</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedAssignment.sections?.length ? (
                        selectedAssignment.sections.map((s) => (
                          <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No sections</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{duration} min window</span>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="mb-2 h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="text-xs text-slate-500">Select a class assignment to see the summary.</p>
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!valid || createSession.isPending || startAttendance.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                <PlayCircle className="h-4 w-4" />
                Start Attendance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start attendance session?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAssignment && (
                <>
                  {selectedAssignment.subject?.name} — {selectedAssignment.teaching_type?.name}
                  <br />
                  The attendance window will be open for {duration} minutes. Students can scan the QR code to mark attendance.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={createSession.isPending || startAttendance.isPending}
            >
              {createSession.isPending || startAttendance.isPending ? 'Starting…' : 'Start Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
