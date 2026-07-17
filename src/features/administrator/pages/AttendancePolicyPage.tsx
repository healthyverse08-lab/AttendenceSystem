import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Shield, Globe } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemSettings, useUpdateSetting, useLogAudit } from '@/features/administrator/hooks/useAdminQueries';

export default function AttendancePolicyPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const logAudit = useLogAudit();
  const qc = useQueryClient();

  const [qrRotation, setQrRotation] = useState(10);
  const [gracePeriod, setGracePeriod] = useState(3);
  const [attendanceDuration, setAttendanceDuration] = useState(120);
  const [campusNetEnabled, setCampusNetEnabled] = useState(false);
  const [ipRanges, setIpRanges] = useState<{ cidr: string; label: string }[]>([]);
  const [newCidr, setNewCidr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [thresholds, setThresholds] = useState({ excellent: 80, good: 70, warning: 50, critical: 0 });

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value;
    setQrRotation(Number(get('qr_rotation_seconds') ?? 10));
    setGracePeriod(Number(get('qr_grace_period_seconds') ?? 3));
    setAttendanceDuration(Number(get('attendance_duration_seconds') ?? 120));
    setCampusNetEnabled(get('campus_network_enabled') === true);
    const ranges = get('approved_ip_ranges');
    if (Array.isArray(ranges)) {
      setIpRanges(ranges as { cidr: string; label: string }[]);
    }
    const t = get('attendance_warning_thresholds');
    if (t && typeof t === 'object') setThresholds(t as typeof thresholds);
  }, [settings]);

  async function handleSave() {
    try {
      await updateSetting.mutateAsync({ key: 'qr_rotation_seconds', value: qrRotation });
      await updateSetting.mutateAsync({ key: 'qr_grace_period_seconds', value: gracePeriod });
      await updateSetting.mutateAsync({ key: 'attendance_duration_seconds', value: attendanceDuration });
      await updateSetting.mutateAsync({ key: 'campus_network_enabled', value: campusNetEnabled });
      await updateSetting.mutateAsync({ key: 'approved_ip_ranges', value: ipRanges });
      await updateSetting.mutateAsync({ key: 'attendance_warning_thresholds', value: thresholds });
      await logAudit.mutateAsync({ action: 'attendance_policy_updated', entity_type: 'system_settings' });
      toast.success('Attendance policy saved');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (isLoading) return <div className="animate-pulse rounded-xl bg-slate-100 h-96" />;

  return (
    <div>
      <PageHeader
        title="Attendance Policy"
        description="Configure QR rotation, attendance duration, campus network, and warning colours."
        actions={<Button onClick={handleSave} disabled={updateSetting.isPending}><Save className="mr-2 h-4 w-4" />Save</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>QR & Duration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>QR Rotation Time (seconds)</Label>
              <Input type="number" min={5} max={60} value={qrRotation} onChange={(e) => setQrRotation(parseInt(e.target.value, 10))} />
              <p className="text-xs text-slate-500">Default: 10 seconds. Can be changed to 15, 20, etc.</p>
            </div>
            <div className="space-y-1.5">
              <Label>QR Grace Period (seconds)</Label>
              <Input type="number" min={0} max={10} value={gracePeriod} onChange={(e) => setGracePeriod(parseInt(e.target.value, 10))} />
              <p className="text-xs text-slate-500">Previous token stays valid for this many seconds after rotation to handle network latency. Default: 3 seconds.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Maximum Attendance Duration (seconds)</Label>
              <Input type="number" min={30} max={600} value={attendanceDuration} onChange={(e) => setAttendanceDuration(parseInt(e.target.value, 10))} />
              <p className="text-xs text-slate-500">Default: 120 seconds (2 minutes). Lecturer can end early.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Campus Network Restriction</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="net">Enable Campus Network Validation</Label>
              <Switch id="net" checked={campusNetEnabled} onCheckedChange={setCampusNetEnabled} />
            </div>
            <div className="space-y-2">
              <Label>Approved IP Ranges (CIDR notation)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 10.0.0.0/8"
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Label (optional)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const cidr = newCidr.trim();
                    if (!cidr) return;
                    if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(cidr)) {
                      toast.error('Invalid CIDR format. Use e.g. 10.0.0.0/8');
                      return;
                    }
                    if (ipRanges.some((r) => r.cidr === cidr)) {
                      toast.error('This IP range already exists.');
                      return;
                    }
                    setIpRanges([...ipRanges, { cidr, label: newLabel.trim() || cidr }]);
                    setNewCidr('');
                    setNewLabel('');
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {ipRanges.length === 0 ? (
                  <p className="text-xs text-slate-400">No IP ranges configured. Attendance from any IP will be accepted when enabled.</p>
                ) : (
                  ipRanges.map((range, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <span className="font-mono text-sm text-slate-800">{range.cidr}</span>
                        <span className="text-xs text-slate-500">— {range.label}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                        onClick={() => setIpRanges(ipRanges.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500">Attendance outside these ranges will be rejected when enabled. Uses server-side IP validation (not Wi-Fi SSID).</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Attendance Warning Colour Thresholds</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-700" />Excellent ≥</Label>
                <Input type="number" min={0} max={100} value={thresholds.excellent} onChange={(e) => setThresholds((t) => ({ ...t, excellent: parseInt(e.target.value, 10) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-400" />Good ≥</Label>
                <Input type="number" min={0} max={100} value={thresholds.good} onChange={(e) => setThresholds((t) => ({ ...t, good: parseInt(e.target.value, 10) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-yellow-400" />Warning ≥</Label>
                <Input type="number" min={0} max={100} value={thresholds.warning} onChange={(e) => setThresholds((t) => ({ ...t, warning: parseInt(e.target.value, 10) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-600" />Critical</Label>
                <Input type="number" min={0} max={100} value={thresholds.critical} disabled />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Dark Green (80-100%), Light Green (70-79%), Yellow (50-69%), Red (below 50%).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
