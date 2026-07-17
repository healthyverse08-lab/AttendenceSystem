import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  rowKey,
  pageSize = 10,
  selectable,
  selectedIds,
  onSelectionChange,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'Records will appear here once created.',
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...data];
  if (sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      sorted.sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allOnPageSelected =
    selectable && paged.length > 0 && paged.every((r) => selectedIds?.has(rowKey(r)));
  const someOnPageSelected =
    selectable && paged.some((r) => selectedIds?.has(rowKey(r)));

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function togglePage() {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    paged.forEach((r) => {
      const id = rowKey(r);
      if (allOnPageSelected) next.delete(id);
      else next.add(id);
    });
    onSelectionChange(next);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                    onCheckedChange={togglePage}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500', col.className)}
                >
                  {col.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const id = rowKey(row);
              const selected = selectedIds?.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    'border-b border-slate-100 transition-colors',
                    selected ? 'bg-sky-50/60' : 'hover:bg-slate-50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected ?? false} onCheckedChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-3 py-2.5 align-middle text-slate-700', col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {safePage} of {totalPages} · {sorted.length} records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
