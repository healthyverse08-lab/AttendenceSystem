import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mail, Building2, BookOpen, Save, Camera, GraduationCap, Layers,
} from 'lucide-react';
import {
  useCurrentLecturer, useLecturerAssignments, useUpdateUserProfile,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/authentication/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: lecturer, isLoading } = useCurrentLecturer();
  const { data: assignments = [] } = useLecturerAssignments();
  const updateProfile = useUpdateUserProfile();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [pictureUrl, setPictureUrl] = useState(user?.profile_picture_url ?? '');

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim() || undefined,
        profile_picture_url: pictureUrl.trim() || null,
      });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error('Failed to update profile', { description: (err as Error).message });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="View and update your lecturer profile." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const lec = lecturer as { lecturer_id: string | null; department: { name: string } | null; employment_status: string } | null;

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="View and update your lecturer profile." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="relative">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt={user.full_name}
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-3xl font-semibold text-white ring-4 ring-slate-100">
                    {user?.full_name?.charAt(0) ?? 'L'}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{user?.full_name}</h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700">Lecturer</Badge>
                {lec?.employment_status && (
                  <Badge variant="outline" className="capitalize">{lec.employment_status.replace('_', ' ')}</Badge>
                )}
              </div>

              <div className="mt-6 w-full space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Lecturer ID: <span className="font-medium text-slate-800">{lec?.lecturer_id ?? '—'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Department: <span className="font-medium text-slate-800">{lec?.department?.name ?? 'Not assigned'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Assigned Subjects: <span className="font-medium text-slate-800">{assignments.length}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Form + Assignments */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label>Profile Picture URL</Label>
                <Input
                  value={pictureUrl}
                  onChange={(e) => setPictureUrl(e.target.value)}
                  placeholder="https://…"
                />
                <p className="text-xs text-slate-500">Paste a URL to your profile photo.</p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">Email cannot be changed. Contact an administrator if needed.</p>
              </div>
              <Button className="gap-2" onClick={handleSave} disabled={updateProfile.isPending}>
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Assigned Subjects ({assignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No subjects assigned yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{a.subject?.name}</p>
                        <p className="text-xs text-slate-500">{a.subject?.code} · {a.teaching_type?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
