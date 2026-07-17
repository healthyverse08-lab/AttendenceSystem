import { useState } from 'react';
import { toast } from 'sonner';
import { FileDown, FileText } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useStudents, useLecturers, useSubjects, useLeaveApplications,
} from '@/features/administrator/hooks/useAdminQueries';

type ReportType = 'attendance' | 'students' | 'lecturers' | 'subjects' | 'leave';
type ExportFormat = 'csv' | 'excel';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('students');
  const [format, setFormat] = useState<ExportFormat>('csv');

  const students = useStudents();
  const lecturers = useLecturers();
  const subjects = useSubjects();
  const leave = useLeaveApplications();

  function getReportData(): Record<string, unknown>[] {
    switch (reportType) {
      case 'students':
        return (students.data ?? []).map((s) => ({
          student_id: s.student_id,
          full_name: s.user?.full_name ?? '',
          email: s.user?.email ?? '',
          department: s.department?.name ?? '',
          program: s.program?.name ?? '',
          semester: s.semester?.name ?? '',
          section: s.section?.name ?? '',
          status: s.status,
        }));
      case 'lecturers':
        return (lecturers.data ?? []).map((l) => ({
          lecturer_id: l.lecturer_id ?? '',
          full_name: l.user?.full_name ?? '',
          email: l.user?.email ?? '',
          department: l.department?.name ?? '',
          employment_status: l.employment_status,
        }));
      case 'subjects':
        return (subjects.data ?? []).map((s) => ({
          code: s.code,
          name: s.name,
          credits: s.credits ?? '',
          department: s.department?.name ?? '',
          program: s.program?.name ?? '',
          semester: s.semester?.name ?? '',
        }));
      case 'leave':
        return (leave.data ?? []).map((l) => ({
          applicant_role: l.applicant_role,
          start_date: l.start_date,
          end_date: l.end_date,
          reason: l.reason,
          status: l.status,
          reviewed_at: l.reviewed_at ?? '',
        }));
      case 'attendance':
        return [];
    }
  }

  function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
    }
    return lines.join('\n');
  }

  function toExcel(rows: Record<string, unknown>[]): string {
    // Simple Excel-compatible HTML table export
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const headerRow = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
    const dataRows = rows.map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<table border="1">${headerRow}${dataRows}</table>`;
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} exported`);
  }

  function handleExport() {
    const rows = getReportData();
    if (rows.length === 0) {
      toast.error('No data to export for this report');
      return;
    }
    const ext = format === 'csv' ? 'csv' : 'xls';
    const filename = `tsams_${reportType}_${new Date().toISOString().slice(0, 10)}.${ext}`;
    if (format === 'csv') {
      download(filename, toCsv(rows), 'text/csv');
    } else {
      download(filename, toExcel(rows), 'application/vnd.ms-excel');
    }
  }

  return (
    <div>
      <PageHeader title="Report Export" description="Export attendance, students, lecturers, subjects, and leave applications as CSV or Excel. PDF export is future-ready." />

      <Card className="max-w-lg">
        <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="lecturers">Lecturers</SelectItem>
                <SelectItem value="subjects">Subjects</SelectItem>
                <SelectItem value="leave">Leave Applications</SelectItem>
                <SelectItem value="attendance">Attendance (future-ready)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />Export</Button>
            <Button variant="outline" disabled><FileText className="mr-2 h-4 w-4" />PDF (future-ready)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
