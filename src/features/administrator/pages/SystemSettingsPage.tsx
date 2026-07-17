import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Shield, Clock, Gauge } from 'lucide-react';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemSettings, useUpdateSetting, useLogAudit } from '@/features/administrator/hooks/useAdminQueries';

export default function SystemSettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const logAudit = useLogAudit();
  const qc = useQueryClient();

  const [collegeName, setCollegeName] = useState('');
  const [collegeLogo, setCollegeLogo] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('techspire.edu.np');
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [rateLimitAttendance, setRateLimitAttendance] = useState(30);
  const [rateLimitQrToken, setRateLimitQrToken] = useState(60);
  const [rateLimitLogin, setRateLimitLogin] = useState(10);

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value;
    setCollegeName(String(get('college_name') ?? '').replace(/^"|"$/g, ''));
    setCollegeLogo(String(get('college_logo_url') ?? '').replace(/^"|"$/g, ''));
    setAllowedDomain(String(get('allowed_email_domain') ?? 'techspire.edu.np').replace(/^"|"$/g, ''));
    setSessionTimeout(Number(get('session_timeout_minutes') ?? 60));
    setRateLimitAttendance(Number(get('rate_limit_attendance_submit') ?? 30));
    setRateLimitQrToken(Number(get('rate_limit_qr_token') ?? 60));
    setRateLimitLogin(Number(get('rate_limit_login') ?? 10));
  }, [settings]);

  async function handleSave() {
    try {
      await updateSetting.mutateAsync({ key: 'college_name', value: collegeName });
      await updateSetting.mutateAsync({ key: 'college_logo_url', value: collegeLogo || null });
      await updateSetting.mutateAsync({ key: 'allowed_email_domain', value: allowedDomain });
      await updateSetting.mutateAsync({ key: 'session_timeout_minutes', value: sessionTimeout });
      await updateSetting.mutateAsync({ key: 'rate_limit_attendance_submit', value: rateLimitAttendance });
      await updateSetting.mutateAsync({ key: 'rate_limit_qr_token', value: rateLimitQrToken });
      await updateSetting.mutateAsync({ key: 'rate_limit_login', value: rateLimitLogin });
      await logAudit.mutateAsync({ action: 'system_settings_updated', entity_type: 'system_settings', metadata: { college_name: collegeName, session_timeout: sessionTimeout } });
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (isLoading) return <div className="animate-pulse rounded-xl bg-slate-100 h-96" />;

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Configure college identity, email domain, and system-wide options."
        actions={<Button onClick={handleSave} disabled={updateSetting.isPending}><Save className="mr-2 h-4 w-4" />Save</Button>}
      />

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader><CardTitle>College Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>College Name</Label>
              <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="Techspire College" />
            </div>
            <div className="space-y-1.5">
              <Label>College Logo URL</Label>
              <Input value={collegeLogo} onChange={(e) => setCollegeLogo(e.target.value)} placeholder="https://..." />
              {collegeLogo && <img src={collegeLogo} alt="Logo preview" className="mt-2 h-12 rounded-lg" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Session Security</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" min={5} max={480} value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))} />
              <p className="text-xs text-slate-500">Users will be automatically signed out after this period of inactivity.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Rate Limiting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Attendance Submissions (per minute)</Label>
              <Input type="number" min={1} max={120} value={rateLimitAttendance} onChange={(e) => setRateLimitAttendance(parseInt(e.target.value, 10))} />
            </div>
            <div className="space-y-1.5">
              <Label>QR Token Requests (per minute)</Label>
              <Input type="number" min={1} max={200} value={rateLimitQrToken} onChange={(e) => setRateLimitQrToken(parseInt(e.target.value, 10))} />
            </div>
            <div className="space-y-1.5">
              <Label>Login Attempts (per minute)</Label>
              <Input type="number" min={1} max={30} value={rateLimitLogin} onChange={(e) => setRateLimitLogin(parseInt(e.target.value, 10))} />
            </div>
            <p className="text-xs text-slate-500">Limits protect against brute-force attacks on critical endpoints.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Authentication</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Allowed Email Domain</Label>
              <Input value={allowedDomain} onChange={(e) => setAllowedDomain(e.target.value)} placeholder="techspire.edu.np" />
              <p className="text-xs text-slate-500">Only emails from this domain may sign in.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
