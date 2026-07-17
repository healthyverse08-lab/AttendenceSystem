import type { AttendanceRecordStatus } from '@/types';

export type AttendanceBand = 'excellent' | 'good' | 'warning' | 'critical';

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
  band: AttendanceBand;
}

const COUNTED_STATUSES: AttendanceRecordStatus[] = ['present', 'late'];

export function summarizeAttendance(
  records: { status: AttendanceRecordStatus }[]
): AttendanceSummary {
  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const excused = records.filter((r) => r.status === 'excused').length;
  const attended = records.filter((r) => COUNTED_STATUSES.includes(r.status)).length;
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
  return { total, present, absent, late, excused, attended, percentage, band: bandFor(percentage) };
}

export function bandFor(percentage: number): AttendanceBand {
  if (percentage >= 80) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'warning';
  return 'critical';
}

export const ATTENDANCE_BAND_STYLES: Record<AttendanceBand, { bg: string; text: string; label: string }> = {
  excellent: { bg: 'bg-emerald-700', text: 'text-emerald-50', label: '80–100%' },
  good: { bg: 'bg-emerald-400', text: 'text-emerald-950', label: '70–79%' },
  warning: { bg: 'bg-yellow-400', text: 'text-yellow-950', label: '50–69%' },
  critical: { bg: 'bg-red-600', text: 'text-red-50', label: 'Below 50%' },
};
