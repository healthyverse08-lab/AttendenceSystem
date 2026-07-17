import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
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

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value;
    setCollegeName(String(get('college_name') ?? '').replace(/^"|"$/g, ''));
    setCollegeLogo(String(get('college_logo_url') ?? '').replace(/^"|"$/g, ''));
    setAllowedDomain(String(get('allowed_email_domain') ?? 'techspire.edu.np').replace(/^"|"$/g, ''));
  }, [settings]);

  async function handleSave() {
    try {
      await updateSetting.mutateAsync({ key: 'college_name', value: collegeName });
      await updateSetting.mutateAsync({ key: 'college_logo_url', value: collegeLogo || null });
      await updateSetting.mutateAsync({ key: 'allowed_email_domain', value: allowedDomain });
      await logAudit.mutateAsync({ action: 'system_settings_changed', entity_type: 'system_settings' });
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
          <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
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
