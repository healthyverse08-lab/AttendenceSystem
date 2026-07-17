import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, MoreHorizontal } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { DataTable, type Column } from './DataTable';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SimpleResourceConfig<T> {
  title: string;
  description: string;
  queryKey: readonly unknown[];
  useList: () => { data?: T[]; isLoading: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCreate: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useUpdate: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSoftDelete: () => any;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  formFields: (form: Record<string, unknown>, setForm: (k: string, v: unknown) => void) => ReactNode;
  initialValues: Record<string, unknown>;
  validate: (form: Record<string, unknown>) => Record<string, string> | null;
}

export function SimpleResourceManager<T>({ config }: { config: SimpleResourceConfig<T> }) {
  const { title, description, queryKey, useList, useCreate, useUpdate, useSoftDelete, columns, rowKey, formFields, initialValues, validate } = config;
  const qc = useQueryClient();
  const list = useList();
  const createMut = useCreate();
  const updateMut = useUpdate();
  const deleteMut = useSoftDelete();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setForm(initialValues);
    setEditingId(null);
    setErrors(null);
    setModalOpen(true);
  }

  function openEdit(row: T) {
    const r = row as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...initialValues };
    for (const key of Object.keys(initialValues)) {
      if (key in r) merged[key] = r[key];
    }
    setForm(merged);
    setEditingId(rowKey(row));
    setErrors(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    const v = validate(form);
    if (v) {
      setErrors(v);
      return;
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, ...form });
        toast.success(`${title} updated`);
      } else {
        await createMut.mutateAsync(form);
        toast.success(`${title} created`);
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast.success(`${title} archived`);
      qc.invalidateQueries({ queryKey: queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add {title.replace(/s$/, '')}
          </Button>
        }
      />

      {list.data && list.data.length > 0 ? (
        <DataTable
          columns={[
            ...columns,
            {
              key: 'actions',
              header: '',
              cell: (row) => (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(row)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-rose-600 focus:text-rose-700"
                        onClick={() => setDeleteId(rowKey(row))}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ]}
          data={list.data}
          loading={list.isLoading}
          rowKey={rowKey}
        />
      ) : (
        !list.isLoading && (
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            description={`Create your first ${title.toLowerCase().replace(/s$/, '')} to get started.`}
            action={
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add {title.replace(/s$/, '')}
              </Button>
            }
          />
        )
      )}

      {list.isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-2 h-10 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit ${title.replace(/s$/, '')}` : `Add ${title.replace(/s$/, '')}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formFields(form, setField)}
            {errors && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {Object.values(errors).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMut?.isPending || updateMut?.isPending}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={`Archive this ${title.replace(/s$/, '')}?`}
        description="The record will be soft-deleted and hidden from active lists. It can be restored later."
        actionLabel="Archive"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

// Re-export shared building blocks for resource configs
export { Input, Label, Textarea, Switch, Badge };
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
